import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import type { FileSearchJump } from "../app/appState";
import { markdownEditorTheme } from "./markdownEditorTheme";
import { listContinuationKeymap } from "./listContinuation";
import { importAttachment, readClipboardImage, saveAttachment } from "../native/commands";
import type { FilesystemOperationResult, NativeCommandResponse } from "../native/commands";

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

function findImageFile(files: FileList | null | undefined, items: DataTransferItemList | null | undefined) {
  const fileMatch = Array.from(files ?? []).find((file) => file.type.startsWith("image/"));
  if (fileMatch) {
    return fileMatch;
  }

  for (const item of Array.from(items ?? [])) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) {
        return file;
      }
    }
  }

  return undefined;
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

function insertAttachmentReference(
  view: EditorView,
  notePath: string,
  insertAt: { from: number; to: number },
  response: NativeCommandResponse<FilesystemOperationResult>,
) {
  if (!response.ok || !response.data) {
    console.error("failed to save attachment", response.error);
    return;
  }

  const relativePath = response.data.itemPath.slice(parentFolderPath(notePath).length);
  const assetPath = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;

  view.dispatch({
    changes: { from: insertAt.from, to: insertAt.to, insert: `![](${assetPath})` },
    selection: { anchor: insertAt.from + `![](${assetPath})`.length },
  });
}

async function saveAndInsertAttachment(
  view: EditorView,
  workspacePath: string,
  notePath: string,
  insertAt: { from: number; to: number },
  contentBase64: string,
  mimeType: string,
) {
  const fileName = attachmentFileName(mimeType);
  const response = await saveAttachment(
    workspacePath,
    parentFolderPath(notePath),
    fileName,
    contentBase64,
  );
  insertAttachmentReference(view, notePath, insertAt, response);
}

async function insertAttachment(
  view: EditorView,
  file: File,
  workspacePath: string,
  notePath: string,
  insertAt: { from: number; to: number },
) {
  const contentBase64 = await fileToBase64(file);
  await saveAndInsertAttachment(view, workspacePath, notePath, insertAt, contentBase64, file.type);
}

const importableImageExtensions = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp"]);

// WebKitGTK's `drop` DOM event delivers files dragged from a file manager as
// a `text/uri-list` (a `file://` URI), not as a `File` object with readable
// bytes, so this decodes the local path and imports it through a native
// command instead of reading bytes in the browser.
function findDroppedImagePath(dataTransfer: DataTransfer | null | undefined) {
  const uriList = dataTransfer?.getData?.("text/uri-list");
  if (!uriList) {
    return undefined;
  }

  const uri = uriList
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));

  if (!uri || !uri.startsWith("file://")) {
    return undefined;
  }

  const path = decodeURIComponent(uri.slice("file://".length));
  const extension = path.split(".").pop()?.toLowerCase();

  if (!extension || !importableImageExtensions.has(extension)) {
    return undefined;
  }

  return path;
}

async function importAndInsertAttachment(
  view: EditorView,
  workspacePath: string,
  notePath: string,
  insertAt: { from: number; to: number },
  sourcePath: string,
) {
  const response = await importAttachment(workspacePath, parentFolderPath(notePath), sourcePath);
  insertAttachmentReference(view, notePath, insertAt, response);
}

// WebKitGTK's `paste` DOM event does not expose image bytes on Linux
// (`clipboardData` comes back empty even when the OS clipboard holds an
// image), so Ctrl+V reads the system clipboard through a native command
// instead of relying on the browser paste event for images. Plain text
// still goes through the browser's normal clipboard read.
async function pasteFromSystemClipboard(
  view: EditorView,
  workspacePath: string,
  notePath: string,
  insertAt: { from: number; to: number },
) {
  const imageResponse = await readClipboardImage();

  if (imageResponse.ok && imageResponse.data) {
    await saveAndInsertAttachment(
      view,
      workspacePath,
      notePath,
      insertAt,
      imageResponse.data.contentBase64,
      imageResponse.data.mimeType,
    );
    return;
  }

  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      view.dispatch({
        changes: { from: insertAt.from, to: insertAt.to, insert: text },
        selection: { anchor: insertAt.from + text.length },
      });
    }
  } catch (error) {
    console.error("failed to read clipboard text", error);
  }
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
            keydown: (event, view) => {
              const isPasteShortcut =
                (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v";
              const currentWorkspacePath = workspacePathRef.current;

              if (!isPasteShortcut || !currentWorkspacePath) {
                return false;
              }

              event.preventDefault();
              const selection = view.state.selection.main;
              void pasteFromSystemClipboard(view, currentWorkspacePath, notePathRef.current, {
                from: selection.from,
                to: selection.to,
              });
              return true;
            },
            paste: (event, view) => {
              const imageFile = findImageFile(event.clipboardData?.files, event.clipboardData?.items);
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
            dragover: (event) => {
              const types = event.dataTransfer?.types ?? [];
              const hasDraggedFile =
                Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === "file") ||
                Array.from(types).includes("text/uri-list") ||
                Array.from(types).includes("Files");

              if (hasDraggedFile) {
                event.preventDefault();
              }
              return false;
            },
            drop: (event, view) => {
              const imageFile = findImageFile(event.dataTransfer?.files, event.dataTransfer?.items);
              const currentWorkspacePath = workspacePathRef.current;

              if (imageFile && currentWorkspacePath) {
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
              }

              const droppedImagePath = findDroppedImagePath(event.dataTransfer);
              if (droppedImagePath && currentWorkspacePath) {
                event.preventDefault();
                const dropPosition =
                  view.posAtCoords({ x: event.clientX, y: event.clientY }) ??
                  view.state.selection.main.from;
                void importAndInsertAttachment(
                  view,
                  currentWorkspacePath,
                  notePathRef.current,
                  { from: dropPosition, to: dropPosition },
                  droppedImagePath,
                );
                return true;
              }

              return false;
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
