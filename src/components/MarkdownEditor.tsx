import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import type { FileSearchJump } from "../app/appState";
import { markdownEditorTheme } from "./markdownEditorTheme";
import { listContinuationKeymap } from "./listContinuation";
import { findDroppedImagePath } from "../attachments/droppedImagePath";
import { logDomDropEvent } from "../attachments/dropChannelDiagnostics";
import { importAttachment, readClipboardImage, saveAttachment } from "../native/commands";
import type { FilesystemOperationResult, NativeCommandResponse } from "../native/commands";

export interface MarkdownEditorProps {
  notePath: string;
  workspacePath?: string | null;
  value: string;
  onChange: (content: string) => void;
  searchJump?: FileSearchJump | null;
  onAttachmentError?: (message: string) => void;
}

// Attachment failures used to vanish into a discarded promise, which from the
// outside is indistinguishable from the app ignoring the gesture. Every
// attachment path now reports through this callback so the shell can show it.
export type AttachmentErrorReporter = (message: string) => void;

const imageExtensionByMimeType: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
};

const pastedImageFailureMessage = "Could not save the pasted image into the Workspace.";
const droppedImageFailureMessage = "Could not import the dropped image into the Workspace.";

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

// Runs an attachment task, reporting both a rejected promise and an `ok: false`
// response through the same visible channel — the second is where failures
// actually surfaced before, since the native commands resolve rather than throw.
function runAttachmentTask(
  failureMessage: string,
  reportError: AttachmentErrorReporter,
  task: () => Promise<void>,
) {
  void task().catch((error) => {
    console.error(failureMessage, error);
    reportError(failureMessage);
  });
}

function insertAttachmentReference(
  view: EditorView,
  notePath: string,
  insertAt: { from: number; to: number },
  response: NativeCommandResponse<FilesystemOperationResult>,
  failureMessage: string,
  reportError: AttachmentErrorReporter,
) {
  if (!response.ok || !response.data) {
    console.error(failureMessage, response.error);
    reportError(failureMessage);
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
  failureMessage: string,
  reportError: AttachmentErrorReporter,
) {
  const fileName = attachmentFileName(mimeType);
  const response = await saveAttachment(
    workspacePath,
    parentFolderPath(notePath),
    fileName,
    contentBase64,
  );
  insertAttachmentReference(view, notePath, insertAt, response, failureMessage, reportError);
}

async function insertAttachment(
  view: EditorView,
  file: File,
  workspacePath: string,
  notePath: string,
  insertAt: { from: number; to: number },
  failureMessage: string,
  reportError: AttachmentErrorReporter,
) {
  const contentBase64 = await fileToBase64(file);
  await saveAndInsertAttachment(
    view,
    workspacePath,
    notePath,
    insertAt,
    contentBase64,
    file.type,
    failureMessage,
    reportError,
  );
}

// WebKitGTK's `drop` DOM event delivers files dragged from a file manager as
// a `text/uri-list` (a `file://` URI), not as a `File` object with readable
// bytes, so the local path is recognised and imported through a native command
// instead of reading bytes in the browser. All the parsing lives in the pure
// module; this only pulls the raw string off the event.
function droppedImagePathFrom(dataTransfer: DataTransfer | null | undefined) {
  return findDroppedImagePath(dataTransfer?.getData?.("text/uri-list"));
}

async function importAndInsertAttachment(
  view: EditorView,
  workspacePath: string,
  notePath: string,
  insertAt: { from: number; to: number },
  sourcePath: string,
  failureMessage: string,
  reportError: AttachmentErrorReporter,
) {
  const response = await importAttachment(workspacePath, parentFolderPath(notePath), sourcePath);
  insertAttachmentReference(view, notePath, insertAt, response, failureMessage, reportError);
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
  reportError: AttachmentErrorReporter,
) {
  // A failed `readClipboardImage` is the normal "the clipboard holds text, not
  // an image" fall-through, so it is deliberately not reported as an error.
  const imageResponse = await readClipboardImage();

  if (imageResponse.ok && imageResponse.data) {
    await saveAndInsertAttachment(
      view,
      workspacePath,
      notePath,
      insertAt,
      imageResponse.data.contentBase64,
      imageResponse.data.mimeType,
      pastedImageFailureMessage,
      reportError,
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
  onAttachmentError,
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
  // Read through a ref: the EditorView is built once per note, so a prop
  // captured in a handler closure would go stale.
  const onAttachmentErrorRef = useRef(onAttachmentError);
  onAttachmentErrorRef.current = onAttachmentError;
  const reportAttachmentErrorRef = useRef<AttachmentErrorReporter>((message) => {
    onAttachmentErrorRef.current?.(message);
  });

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
              const reportError = reportAttachmentErrorRef.current;
              runAttachmentTask(pastedImageFailureMessage, reportError, () =>
                pasteFromSystemClipboard(
                  view,
                  currentWorkspacePath,
                  notePathRef.current,
                  { from: selection.from, to: selection.to },
                  reportError,
                ),
              );
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
              const reportError = reportAttachmentErrorRef.current;
              runAttachmentTask(pastedImageFailureMessage, reportError, () =>
                insertAttachment(
                  view,
                  imageFile,
                  currentWorkspacePath,
                  notePathRef.current,
                  { from: selection.from, to: selection.to },
                  pastedImageFailureMessage,
                  reportError,
                ),
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
              // TEMPORARY DIAGNOSTIC (ticket 03) — must stay the first
              // statement, before any condition that could skip it.
              logDomDropEvent(event);

              const imageFile = findImageFile(event.dataTransfer?.files, event.dataTransfer?.items);
              const currentWorkspacePath = workspacePathRef.current;

              if (imageFile && currentWorkspacePath) {
                event.preventDefault();
                const dropPosition =
                  view.posAtCoords({ x: event.clientX, y: event.clientY }) ??
                  view.state.selection.main.from;
                const reportError = reportAttachmentErrorRef.current;
                runAttachmentTask(droppedImageFailureMessage, reportError, () =>
                  insertAttachment(
                    view,
                    imageFile,
                    currentWorkspacePath,
                    notePathRef.current,
                    { from: dropPosition, to: dropPosition },
                    droppedImageFailureMessage,
                    reportError,
                  ),
                );
                return true;
              }

              const droppedImagePath = droppedImagePathFrom(event.dataTransfer);
              if (droppedImagePath && currentWorkspacePath) {
                event.preventDefault();
                const dropPosition =
                  view.posAtCoords({ x: event.clientX, y: event.clientY }) ??
                  view.state.selection.main.from;
                const reportError = reportAttachmentErrorRef.current;
                runAttachmentTask(droppedImageFailureMessage, reportError, () =>
                  importAndInsertAttachment(
                    view,
                    currentWorkspacePath,
                    notePathRef.current,
                    { from: dropPosition, to: dropPosition },
                    droppedImagePath,
                    droppedImageFailureMessage,
                    reportError,
                  ),
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
