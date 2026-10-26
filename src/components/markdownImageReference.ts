import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";

export interface MarkdownImageReference {
  destination: string | null;
  from: number;
}

export function selectedImageReference(state: EditorState): MarkdownImageReference | null {
  let node = syntaxTree(state).resolveInner(state.selection.main.head, 1);
  while (node.name !== "Image" && node.parent) node = node.parent;
  if (node.name !== "Image") return null;
  const url = node.getChild("URL");
  if (url) return { destination: state.sliceDoc(url.from, url.to), from: node.from };
  const labelNode = node.getChild("LinkLabel");
  const explicitLabel = labelNode ? state.sliceDoc(labelNode.from + 1, labelNode.to - 1) : "";
  const label = normalizeLabel(explicitLabel || state.sliceDoc(node.from, node.to).match(/^!\[([\s\S]*?)\]/)?.[1] || "");
  let destination: string | null = null;
  syntaxTree(state).iterate({ enter(candidate) {
    if (destination !== null || candidate.name !== "LinkReference") return;
    const referenceLabel = candidate.node.getChild("LinkLabel");
    const referenceUrl = candidate.node.getChild("URL");
    if (referenceLabel && referenceUrl && normalizeLabel(state.sliceDoc(referenceLabel.from + 1, referenceLabel.to - 1)) === label) {
      destination = state.sliceDoc(referenceUrl.from, referenceUrl.to);
    }
  } });
  return { destination, from: node.from };
}

function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

export function resolveMarkdownImagePath(notePath: string, destination: string | null): string {
  if (!destination) throw new Error("Esta referencia no tiene una imagen local disponible.");
  let path = destination.startsWith("<") && destination.endsWith(">") ? destination.slice(1, -1) : destination;
  path = path.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~\\])/g, "$1");
  try { path = decodeURIComponent(path); } catch { throw new Error("La ruta de la imagen no es válida."); }
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith("/") || path.startsWith("\\") || path.includes("\0")) {
    throw new Error("Solo se previsualizan imágenes locales dentro del Workspace; no se descargan URLs remotas.");
  }
  const segments = notePath.split("/").slice(0, -1);
  for (const part of path.split("/")) {
    if (part === "..") {
      if (!segments.length) throw new Error("La imagen debe estar dentro del Workspace.");
      segments.pop();
    } else if (part !== "." && part !== "") segments.push(part);
  }
  if (!segments.length) throw new Error("La referencia no identifica una imagen.");
  return segments.join("/");
}
