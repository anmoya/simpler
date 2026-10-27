import { createElement, Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root, Content, ImageReference, LinkReference, Parent } from "mdast";
import { openWebUrl, previewImage } from "../native/commands";
import { resolveMarkdownImagePath } from "./markdownImageReference";

export type NoteViewMode = "raw" | "split" | "rendered";
export const noteViewModeStorageKey = "simpler.noteViewMode";
export function readNoteViewMode(): NoteViewMode {
  try { const value = localStorage.getItem(noteViewModeStorageKey); return value === "split" || value === "rendered" ? value : "raw"; } catch { return "raw"; }
}

// remark-parse implements CommonMark; remark-gfm adds tables, task lists,
// strikethrough, autolinks and the other agreed GitHub-flavored syntax.
const markdown = unified().use(remarkParse).use(remarkGfm);
type TreeNode = Content | Root;

export function RenderedNote({ content, notePath, workspacePath, onNavigate, onScroll, onAssetsSettled, className = "" }: {
  content: string; notePath: string; workspacePath: string | null; onNavigate: (path: string) => void;
  onScroll?: (element: HTMLElement) => void; onAssetsSettled?: (missingImages: string[]) => void; className?: string;
}) {
  const [images, setImages] = useState<Record<string, string | null>>({});
  const [failedExternal, setFailedExternal] = useState<string[]>([]);
  const articleRef = useRef<HTMLElement>(null);
  const tree = useMemo(() => markdown.parse(content) as Root, [content]);
  const definitions = useMemo(() => new Map(tree.children.filter((node): node is import("mdast").Definition => node.type === "definition").map(definition => [definition.identifier, definition])), [tree]);
  const refs = useMemo(() => collectImageRefs(tree, definitions), [definitions, tree]);
  useEffect(() => {
    let live = true;
    if (!workspacePath) return;
    for (const ref of refs) {
      if (isHttpUrl(ref)) continue;
      const key = imageCacheKey(workspacePath, notePath, ref);
      let path: string;
      try { path = resolveMarkdownImagePath(notePath, ref); } catch { continue; }
      if (images[key] !== undefined) continue;
      void previewImage(workspacePath, path).then(response => { if (live) setImages(old => ({ ...old, [key]: response.data?.dataUrl ?? null })); })
        .catch(() => { if (live) setImages(old => ({ ...old, [key]: null })); });
    }
    return () => { live = false; };
  }, [workspacePath, notePath, refs, images]);
  useEffect(() => {
    if (!onAssetsSettled) return;
    const localRefs = refs.filter(ref => !isHttpUrl(ref) && canResolveImage(notePath, ref));
    if (localRefs.some(ref => images[imageCacheKey(workspacePath, notePath, ref)] === undefined)) return;
    let live = true;
    let settled = false;
    const pending = [...(articleRef.current?.querySelectorAll<HTMLImageElement>("img") ?? [])].filter(image => !image.complete).map(image => new Promise<void>(resolve => {
      image.addEventListener("load", () => resolve(), { once: true }); image.addEventListener("error", () => resolve(), { once: true });
    }));
    const timer = window.setTimeout(() => finish(true), 5000);
    function finish(timedOut = false) {
      if (!live || settled) return;
      settled = true; window.clearTimeout(timer);
      const missing = refs.filter(ref => isHttpUrl(ref)
        ? failedExternal.includes(ref) || (timedOut && ![...(articleRef.current?.querySelectorAll<HTMLImageElement>("img") ?? [])].some(img => img.dataset.markdownImageRef === ref && img.complete))
        : !workspacePath || !canResolveImage(notePath, ref) || images[imageCacheKey(workspacePath, notePath, ref)] === null);
      onAssetsSettled?.(missing);
    }
    if (!pending.length) finish(); else void Promise.all(pending).then(() => finish());
    return () => { live = false; window.clearTimeout(timer); };
  }, [failedExternal, images, notePath, onAssetsSettled, refs, workspacePath]);

  const render = (node: TreeNode, key: string): ReactNode => renderNode(node, key, {
    images, workspacePath, notePath, failedExternal, definitions,
    onExternalImageFailure: ref => setFailedExternal(old => old.includes(ref) ? old : [...old, ref]),
    onNavigate,
  });
  return <article ref={articleRef} className={`rendered-note ${className}`} onScroll={e => onScroll?.(e.currentTarget)} aria-label="Rendered Note">
    {tree.children.map((node, index) => render(node, String(index)))}
  </article>;
}

function imageCacheKey(workspacePath: string | null, notePath: string, ref: string) { return `${workspacePath ?? ""}\0${notePath}\0${ref}`; }
function isHttpUrl(value: string) { return /^https?:\/\//i.test(value); }
function canResolveImage(notePath: string, ref: string) { try { resolveMarkdownImagePath(notePath, ref); return true; } catch { return false; } }
function collectImageRefs(tree: Root, definitions: Map<string, import("mdast").Definition>): string[] {
  const refs = new Set<string>();
  type ImageVisitor = { type: string; url?: string; children?: ImageVisitor[] };
  const visit = (node: ImageVisitor) => {
    if (node.type === "image" && node.url) refs.add(node.url);
    if (node.type === "imageReference" && "identifier" in node) {
      const definition = definitions.get(String(node.identifier));
      if (definition) refs.add(definition.url);
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(tree);
  return [...refs];
}

type RenderContext = { images: Record<string, string | null>; workspacePath: string | null; notePath: string; failedExternal: string[]; definitions: Map<string, import("mdast").Definition>; onExternalImageFailure: (ref: string) => void; onNavigate: (path: string) => void };
function renderNode(node: TreeNode, key: string, context: RenderContext): ReactNode {
  const children = (value: Parent) => value.children.map((child, index) => renderNode(child, `${key}.${index}`, context));
  const line = node.position?.start.line;
  const attrs = line ? { "data-source-line": line } : {};
  switch (node.type) {
    case "text": return node.value;
    case "html": return node.value;
    case "image": return renderImage(node.url, node.alt, node.title, key, context);
    case "imageReference": {
      const definition = context.definitions.get(node.identifier);
      return definition ? renderImage(definition.url, node.alt, definition.title, key, context) : node.label;
    }
    case "link": return renderLink(node.url, node.title, key, context, children(node));
    case "linkReference": {
      const definition = context.definitions.get(node.identifier);
      return definition ? renderLink(definition.url, definition.title, key, context, children(node)) : children(node);
    }
    case "heading": return createBlock(`h${node.depth}`, node, attrs, children(node));
    case "paragraph": return createBlock("p", node, attrs, children(node));
    case "blockquote": return createBlock("blockquote", node, attrs, children(node));
    case "list": return createBlock(node.ordered ? "ol" : "ul", node, { ...attrs, ...(node.ordered && node.start !== null ? { start: node.start } : {}) }, children(node));
    case "listItem": return createBlock("li", node, attrs, <>{node.checked !== null && node.checked !== undefined ? <><input type="checkbox" checked={node.checked} readOnly tabIndex={-1} /> </> : null}{children(node)}</>);
    case "table": {
      const rows = node.children;
      const first = rows[0];
      const body = rows.slice(first ? 1 : 0);
      const rowCells = (row: typeof first, rowKey: string, heading: boolean) => row?.children.map((cell, cellIndex) => {
        const Tag = heading ? "th" : "td";
        return <Tag key={`${rowKey}.${cellIndex}`}>{cell.children.map((child, index) => renderNode(child, `${rowKey}.${cellIndex}.${index}`, context))}</Tag>;
      });
      return <table key={key} {...attrs}>{first ? <thead><tr>{rowCells(first, `${key}.head`, true)}</tr></thead> : null}{body.length ? <tbody>{body.map((row, index) => <tr key={`${key}.body${index}`}>{rowCells(row, `${key}.body${index}`, false)}</tr>)}</tbody> : null}</table>;
    }
    case "tableRow": return createBlock("tr", node, attrs, children(node));
    case "tableCell": return createBlock("td", node, attrs, children(node));
    case "strong": return <strong key={key}>{children(node)}</strong>;
    case "emphasis": return <em key={key}>{children(node)}</em>;
    case "delete": return <del key={key}>{children(node)}</del>;
    case "inlineCode": return <code key={key}>{node.value}</code>;
    case "code": return <pre key={key} {...attrs}><code>{node.value}</code></pre>;
    case "thematicBreak": return <hr key={key} {...attrs} />;
    case "break": return <br key={key} />;
    default: return "children" in node && Array.isArray(node.children) ? <Fragment key={key}>{children(node as Parent)}</Fragment> : null;
  }
}
function createBlock(tag: string, node: TreeNode, attrs: Record<string, unknown>, children: ReactNode) {
  return createElement(tag, { key: `${tag}-${node.position?.start.offset ?? 0}`, ...attrs }, children);
}
function renderImage(url: string, alt: string | null | undefined, title: string | null | undefined, key: string, context: RenderContext) {
  const localPath = isHttpUrl(url) ? null : (() => { try { return resolveMarkdownImagePath(context.notePath, url); } catch { return null; } })();
  const src = localPath && context.workspacePath ? context.images[imageCacheKey(context.workspacePath, context.notePath, url)] : null;
  if (src) return <img key={key} src={src} alt={alt ?? ""} title={title ?? undefined} />;
  if (isHttpUrl(url) && !context.failedExternal.includes(url)) return <img key={key} src={url} alt={alt ?? ""} title={title ?? undefined} data-markdown-image-ref={url} onError={() => context.onExternalImageFailure(url)} />;
  return <span key={key} className="rendered-note__missing-image">Imagen no disponible: {alt || url}</span>;
}
function renderLink(url: string, title: string | null | undefined, key: string, context: RenderContext, children: ReactNode) {
  if (isHttpUrl(url)) return <a key={key} href={url} title={title ?? undefined} onClick={event => { event.preventDefault(); void openWebUrl(url); }}>{children}</a>;
  const target = resolveRelativeNote(context.notePath, url);
  return <a key={key} href={target ? `#${encodeURI(target)}` : undefined} title={title ?? undefined} onClick={event => { event.preventDefault(); if (target) context.onNavigate(target); }}>{children}</a>;
}
export function resolveRelativeNote(notePath: string, href: string): string | null {
  const clean = href.split(/[?#]/, 1)[0];
  if (!/\.md$/i.test(clean) || clean.startsWith("/") || clean.startsWith("\\") || /^[a-z][a-z\d+.-]*:/i.test(clean)) return null;
  const parts = notePath.split("/").slice(0, -1);
  for (const raw of clean.split("/")) {
    let segment = raw;
    if (/%[\da-f]{2}/i.test(segment)) {
      try { segment = decodeURIComponent(segment); } catch { return null; }
    }
    if (segment === "..") { if (!parts.length) return null; parts.pop(); }
    else if (segment === "." || segment === "") continue;
    else if (segment.includes("/") || segment.includes("\\") || segment.includes("\0")) return null;
    else parts.push(segment);
  }
  return parts.length ? parts.join("/") : null;
}
