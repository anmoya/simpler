import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import type { FileSearchJump } from "../app/appState";
import { markdownEditorTheme } from "./markdownEditorTheme";
import { listContinuationKeymap } from "./listContinuation";
import { saveAttachment } from "../native/commands";

export interface MarkdownEditorProps {
  notePath: string;
  workspacePath?: string | null;
  value: string;
  onChange: (content: string) => void;
  searchJump?: FileSearchJump | null;
}

const imageExtensionByMimeType: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
};

function parentFolderPath(notePath: string) {
  const lastSlash = notePath.lastIndexOf("/");
  return lastSlash === -1 ? "" : notePath.slice(0, lastSlash);
}

function attachmentFileName(mimeType: string) {
  const extension = imageExtensionByMimeType[mimeType] ?? "png";
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(
    now.getHours(),
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${timestamp}.${extension}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.slice(result.indexOf(",") + 1);
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function insertAttachment(
  view: EditorView,
  file: File,
  workspacePath: string,
  notePath: string,
  insertAt: { from: number; to: number },
) {
  const fileName = attachmentFileName(file.type);
  const contentBase64 = await fileToBase64(file);
  const response = await saveAttachment(
    workspacePath,
    parentFolderPath(notePath),
    fileName,
    contentBase64,
  );

  if (!response.ok || !response.data) {
    return;
  }

  const relativePath = response.data.itemPath.slice(parentFolderPath(notePath).length);
  const assetPath = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;

  view.dispatch({
    changes: { from: insertAt.from, to: insertAt.to, insert: `![](${assetPath})` },
    selection: { anchor: insertAt.from + `![](${assetPath})`.length },
  });
}

export function MarkdownEditor({
  notePath,
  workspacePath = null,
  value,
  onChange,
  searchJump = null,
}: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const applyingExternalValueRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const notePathRef = useRef(notePath);
  notePathRef.current = notePath;
  const workspacePathRef = useRef(workspacePath);
  workspacePathRef.current = workspacePath;

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          listContinuationKeymap(),
          markdown(),
          EditorView.lineWrapping,
          markdownEditorTheme(),
          EditorView.domEventHandlers({
            paste: (event, view) => {
              const files = Array.from(event.clipboardData?.files ?? []);
              const imageFile = files.find((file) => file.type.startsWith("image/"));
              const currentWorkspacePath = workspacePathRef.current;

              if (!imageFile || !currentWorkspacePath) {
                return false;
              }

              event.preventDefault();
              const selection = view.state.selection.main;
              void insertAttachment(
                view,
                imageFile,
                currentWorkspacePath,
                notePathRef.current,
                { from: selection.from, to: selection.to },
              );
              return true;
            },
            drop: (event, view) => {
              const files = Array.from(event.dataTransfer?.files ?? []);
              const imageFile = files.find((file) => file.type.startsWith("image/"));
              const currentWorkspacePath = workspacePathRef.current;

              if (!imageFile || !currentWorkspacePath) {
                return false;
              }

              event.preventDefault();
              const dropPosition =
                view.posAtCoords({ x: event.clientX, y: event.clientY }) ??
                view.state.selection.main.from;
              void insertAttachment(
                view,
                imageFile,
                currentWorkspacePath,
                notePathRef.current,
                { from: dropPosition, to: dropPosition },
              );
              return true;
            },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !applyingExternalValueRef.current) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
        ],
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notePath]);

  useEffect(() => {
    const view = viewRef.current;

    if (!view) {
      return;
    }

    const currentContent = view.state.doc.toString();

    if (currentContent !== value) {
      applyingExternalValueRef.current = true;
      view.dispatch({
        changes: { from: 0, to: currentContent.length, insert: value },
      });
      applyingExternalValueRef.current = false;
    }
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;

    if (!view || !searchJump || searchJump.notePath !== notePath) {
      return;
    }

    const line = view.state.doc.line(Math.min(searchJump.lineNumber, view.state.doc.lines));
    const from = Math.min(line.from + searchJump.matchStart, line.to);
    const to = Math.min(line.from + searchJump.matchEnd, line.to);

    view.dispatch({
      selection: { anchor: from, head: to },
      scrollIntoView: true,
    });
  }, [notePath, searchJump]);

  return <div className="markdown-editor" data-testid="markdown-editor" ref={containerRef} />;
}
