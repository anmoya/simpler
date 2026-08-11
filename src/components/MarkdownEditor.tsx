import { useEffect, useRef, type CSSProperties } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import type { EditorFontSize, FileSearchJump } from "../app/appState";
import { defaultEditorFontSize } from "../app/appState";
import { markdownEditorTheme } from "./markdownEditorTheme";
import { listContinuationKeymap } from "./listContinuation";
import { findDroppedImagePath } from "../attachments/droppedImagePath";
import { nativeDropClientPoint, subscribeToNativeImageDrop } from "../attachments/nativeDropChannel";
import { importAttachment, readClipboardImage, readClipboardText, saveAttachment } from "../native/commands";
import type { FilesystemOperationResult, NativeCommandResponse } from "../native/commands";

export interface MarkdownEditorProps {
  notePath: string;
  workspacePath?: string | null;
  value: string;
  onChange: (content: string) => void;
  searchJump?: FileSearchJump | null;
  onAttachmentError?: (message: string | null) => void;
  // Editor-only font size, independent of the whole-app-shell UI zoom.
  // Applied as a CSS variable read by `markdownEditorTheme()`, never by
  // rebuilding the CodeMirror view or touching `basicSetup`.
  fontSize?: EditorFontSize;
}

// Attachment failures used to vanish into a discarded promise, which from the
// outside is indistinguishable from the app ignoring the gesture. Every
// attachment path now reports through this callback so the shell can show it.
// `null` clears a previously reported failure once an attachment succeeds.
export type AttachmentErrorReporter = (message: string | null) => void;

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

// The single place an attachment failure becomes visible. Native commands
// resolve with `ok: false` rather than throwing, so the inner steps turn that
// into a rejection and everything lands here.
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
  reportError: AttachmentErrorReporter,
) {
  if (!response.ok || !response.data) {
    throw new Error(response.error ?? "the native command reported no data");
  }

  reportError(null);

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
  reportError: AttachmentErrorReporter,
) {
  const fileName = attachmentFileName(mimeType);
  const response = await saveAttachment(
    workspacePath,
    parentFolderPath(notePath),
    fileName,
    contentBase64,
  );
  insertAttachmentReference(view, notePath, insertAt, response, reportError);
}

async function insertAttachment(
  view: EditorView,
  file: File,
  workspacePath: string,
  notePath: string,
  insertAt: { from: number; to: number },
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
    reportError,
  );
}

async function importAndInsertAttachment(
  view: EditorView,
  workspacePath: string,
  notePath: string,
  insertAt: { from: number; to: number },
  sourcePath: string,
  reportError: AttachmentErrorReporter,
) {
  const response = await importAttachment(workspacePath, parentFolderPath(notePath), sourcePath);
  insertAttachmentReference(view, notePath, insertAt, response, reportError);
}

// WebKitGTK's `paste` DOM event does not expose image bytes on Linux
// (`clipboardData` comes back empty even when the OS clipboard holds an
// image), so Ctrl+V reads the system clipboard through a native command
// instead of relying on the browser paste event for images. Plain text goes
// through a native command too: `navigator.clipboard.readText()` rejects
// with `NotAllowedError` under WebKitGTK's clipboard permission model even
// on this user-gesture-triggered paste, so text reads the same GTK
// clipboard directly rather than going through the browser API.
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
      reportError,
    );
    return;
  }

  const textResponse = await readClipboardText();
  if (textResponse.ok && textResponse.data?.text) {
    const text = textResponse.data.text;
    view.dispatch({
      changes: { from: insertAt.from, to: insertAt.to, insert: text },
      selection: { anchor: insertAt.from + text.length },
    });
  }
}

export function MarkdownEditor({
  notePath,
  workspacePath = null,
  value,
  onChange,
  searchJump = null,
  onAttachmentError,
  fontSize = defaultEditorFontSize,
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

  // Drags from the file manager arrive on Tauri's window-level channel, never
  // as a DOM `drop`, so the import is driven from here rather than from the
  // editor's own event handlers.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void subscribeToNativeImageDrop(({ paths, position }) => {
      const view = viewRef.current;
      const currentWorkspacePath = workspacePathRef.current;
      const sourcePath = findDroppedImagePath(paths);

      if (!view || !currentWorkspacePath || !sourcePath) {
        return;
      }

      // The channel is window-wide, so a drop anywhere in the app reaches here;
      // only drops landing on the editor should insert into the note.
      const point = nativeDropClientPoint(position, window.devicePixelRatio);
      const editorRect = view.dom.getBoundingClientRect();
      const droppedOnEditor =
        point.x >= editorRect.left &&
        point.x <= editorRect.right &&
        point.y >= editorRect.top &&
        point.y <= editorRect.bottom;

      if (!droppedOnEditor) {
        return;
      }

      // Falls back to the cursor when the point maps to no document position.
      const cursor = view.state.selection.main;
      const dropPosition = view.posAtCoords(point);
      const insertAt =
        dropPosition === null
          ? { from: cursor.from, to: cursor.to }
          : { from: dropPosition, to: dropPosition };

      const reportError = reportAttachmentErrorRef.current;
      runAttachmentTask(droppedImageFailureMessage, reportError, () =>
        importAndInsertAttachment(
          view,
          currentWorkspacePath,
          notePathRef.current,
          insertAt,
          sourcePath,
          reportError,
        ),
      );
    }).then((dispose) => {
      if (cancelled) {
        dispose?.();
        return;
      }
      unlisten = dispose;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

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
                  reportError,
                ),
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

  useEffect(() => {
    containerRef.current?.style.setProperty("--editor-font-size", `${fontSize}px`);
  }, [fontSize]);

  return (
    <div
      className="markdown-editor"
      data-testid="markdown-editor"
      ref={containerRef}
      style={{ "--editor-font-size": `${fontSize}px` } as CSSProperties}
    />
  );
}
