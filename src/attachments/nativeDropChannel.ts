// Tauri intercepts file drags at the window level, so the DOM `drop` event
// never fires for a drag from the file manager — confirmed by a real drag on
// WebKitGTK (ticket 03 of `.scratch/attachments-drag-drop-fix/`). This is the
// channel the drop actually arrives on. It stays a thin adapter: no parsing
// (that is `droppedImagePath.ts`) and no saving (that is the Rust handler).

export interface NativeImageDrop {
  /** Absolute filesystem paths, outside the Workspace by definition. */
  paths: string[];
  /** Pointer position in physical window coordinates. */
  position: { x: number; y: number };
}

/**
 * Translates the drop position from physical window pixels to the CSS client
 * pixels CodeMirror's `posAtCoords` expects.
 *
 * Two things make this a translation rather than a copy. The monitor's scale
 * factor: on HiDPI the physical pixels the channel reports are not CSS pixels,
 * and assuming 1 puts the insertion systematically off, differently per
 * monitor. And the window origin: because the window runs with
 * `decorations: false` and draws its own title bar *inside* the webview, that
 * bar is part of the page layout, so the window origin and the viewport origin
 * coincide and no vertical offset is subtracted. Were the system decorations
 * ever turned back on, that would stop being true.
 */
export function nativeDropClientPoint(
  position: { x: number; y: number },
  scaleFactor: number,
): { x: number; y: number } {
  const ratio = Number.isFinite(scaleFactor) && scaleFactor > 0 ? scaleFactor : 1;
  return { x: position.x / ratio, y: position.y / ratio };
}

export async function subscribeToNativeImageDrop(
  onDrop: (drop: NativeImageDrop) => void,
): Promise<(() => void) | undefined> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return undefined;
  }

  try {
    const { getCurrentWebview } = await import("@tauri-apps/api/webview");
    return await getCurrentWebview().onDragDropEvent((event) => {
      // The channel also emits "enter"/"over" (one per pointer move) and
      // "leave"; only the completed drop carries paths worth importing.
      if (event.payload.type !== "drop") {
        return;
      }

      onDrop({ paths: event.payload.paths, position: event.payload.position });
    });
  } catch (error) {
    console.error("failed to listen for native file drops", error);
    return undefined;
  }
}
