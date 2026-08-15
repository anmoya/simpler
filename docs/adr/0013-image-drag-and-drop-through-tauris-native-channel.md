# 0013 — Image drag-and-drop through Tauri's native channel

## Status

Accepted (2026-08-09)

## Context

Dragging an image from the file manager into a note did nothing: no file saved, no reference inserted, no error. The feature had been declared finished twice with the whole suite green, because the tests built a synthetic DOM `drop` event and asserted our own parsing against it — they passed with the feature completely inoperative.

A single instrumented drag settled it. Tauri's window-level channel fired with the absolute path and the pointer position; the DOM `drop` handler never ran at all. The misleading signal was `dragover`, which does fire in the DOM and made the DOM channel look alive.

`dragDropEnabled` is `true` — the `tauri-utils` 2 default (`#[serde(default = "default_true")] pub drag_drop_enabled: bool`), which `tauri.conf.json` was not overriding. That is why the window intercepts OS file drops before the webview sees them. It is now written explicitly in `tauri.conf.json` so the value is visible rather than inherited.

## Decision

Image drops are handled on Tauri's native drag-drop channel (`getCurrentWebview().onDragDropEvent`). The DOM `dragover`/`drop` attachment handlers are removed rather than kept as a fallback: they are unreachable on this platform, and dead code no one can exercise is what allowed two fixes to be wired to a channel that receives nothing.

Consequences worth stating plainly:

- **macOS and Windows are consciously left uncovered** for image drag-and-drop. Simpler is Linux-first. Should either platform be targeted, the DOM path has to be reconsidered — this is a recorded decision, not an oversight. (macOS is now targeted — see the amendment at the bottom of this file.)
- The drop position arrives in **physical window pixels** and is divided by the monitor scale factor. No title-bar offset is subtracted: the window runs with `decorations: false` and draws its own title bar *inside* the webview, so the window origin and the viewport origin coincide. Re-enabling system decorations would break that assumption.
- The channel is window-wide, so drops landing outside the editor's rect are ignored.

## Verification

**Drag-and-drop is verified manually, not by the test suite**, and no automated result should be read as evidence that it works. jsdom cannot produce the native channel's events; a synthetic stand-in only re-asserts our own logic, which is precisely the false confidence that closed this feature twice.

What *is* covered automatically is the logic that can fail on its own, isolated from the channel: path recognition (`src/attachments/droppedImagePath.test.ts`) and the coordinate translation (`src/attachments/nativeDropChannel.test.ts`).

One note the extension list depends on: `importableImageExtensions` in `droppedImagePath.ts` must stay in step with `IMPORTABLE_IMAGE_EXTENSIONS` in `src-tauri/src/lib.rs`. Recognising an extension the backend then rejects turns a drop that should be a silent no-op into a visible error.

## Amendment (2026-08-12): macOS

macOS is now a supported platform (ADR 0014), so "consciously left uncovered" no longer describes a settled position — it describes an untested one. Tauri's native drag-drop channel is cross-platform, so there is reason to expect `onDragDropEvent` fires on macOS with no code change at all; there is no evidence either way.

**Status: unverified.** This section is filled in with the result of dragging a real image from Finder into a note on a real Mac, and by nothing else. That is the whole point of this ADR: a passing suite is not evidence here, and a synthetic event only re-asserts our own logic.

The `titleBarStyle: "Overlay"` choice for macOS (ADR 0014) was made specifically to keep this file's coordinate assumption intact — the webview still spans the full window, so window origin and viewport origin still coincide and no title-bar offset is subtracted.

If the drop turns out not to fire on macOS, it becomes its own ticket rather than a rushed patch inside the platform-support round.
