// TEMPORARY DIAGNOSTIC — remove when ticket 03 of
// `.scratch/attachments-drag-drop-fix/` is closed.
//
// A drop from the file manager can reach the app through two channels: the
// WebKitGTK DOM `drop` event, or Tauri's window-level native drag-drop event.
// Both are instrumented at once so a single real drag says which one fires.

const logPrefix = "[drop-diagnostics]";

export function logDomDropEvent(event: DragEvent) {
  const dataTransfer = event.dataTransfer;
  console.log(`${logPrefix} DOM drop fired`, {
    types: Array.from(dataTransfer?.types ?? []),
    uriListRaw: JSON.stringify(dataTransfer?.getData?.("text/uri-list") ?? null),
    textPlainRaw: JSON.stringify(dataTransfer?.getData?.("text/plain") ?? null),
    fileCount: dataTransfer?.files?.length ?? 0,
    clientX: event.clientX,
    clientY: event.clientY,
  });
}

export async function subscribeToNativeDropDiagnostics(): Promise<(() => void) | undefined> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return undefined;
  }

  try {
    const { getCurrentWebview } = await import("@tauri-apps/api/webview");
    const unlisten = await getCurrentWebview().onDragDropEvent((event) => {
      console.log(`${logPrefix} native drag-drop event`, JSON.stringify(event.payload));
    });
    console.log(`${logPrefix} native drag-drop listener attached`);
    return unlisten;
  } catch (error) {
    console.error(`${logPrefix} could not attach native drag-drop listener`, error);
    return undefined;
  }
}
