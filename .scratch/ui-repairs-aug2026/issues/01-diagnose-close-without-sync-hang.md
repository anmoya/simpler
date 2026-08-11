Status: done

## What to build

Diagnose why clicking "Cerrar sin sync" in the Close Sync Prompt does not close the
window on Ubuntu/Wayland (.deb build), even after the 3000ms fallback timer.

The custom titlebar close button (`ClassicShell.tsx`) correctly opens the Close
Sync Prompt, and choosing "Cerrar sin sync" calls `closeWithoutSync` →
`performClose()` (`App.tsx`), which calls `currentWindow.close()` wrapped in a
`waitOrTimeout` fallback (`closeFallbackMs = 3000`) that should force
`currentWindow.destroy()` regardless of whether `close()` resolves. In practice,
neither the direct close nor the 3s fallback closes the window — confirmed by
manual testing (user waited several seconds past the timeout with no effect).

This is not the same code path as the GTK `delete-event` handler in
`src-tauri/src/lib.rs` (that only covers window-manager-initiated closes like
Alt+F4, and is working as designed/documented).

Add temporary diagnostic logging (or reproduce via `npm run tauri:dev` with
DevTools open) around `performClose()` to determine:
- Does `currentWindow.close()` reject, hang indefinitely, or resolve without
  effect?
- Does `waitOrTimeout`'s timeout branch actually fire and call `destroy()`?
- Does `destroy()` itself throw or hang when called?

Produce a short written finding (in this ticket's `## Comments`, or a follow-up
comment) stating the confirmed root cause, before any fix ticket proceeds.

## Acceptance criteria

- [ ] Reproduced the hang locally with `npm run tauri:dev` + DevTools console
- [ ] Confirmed whether `close()`, the `waitOrTimeout` fallback, or `destroy()` is
      the point of failure (with console evidence, not speculation)
- [ ] Root cause documented in this ticket

## Blocked by

None - can start immediately

## Comments

Reproduced live via `npm run tauri:dev` with DevTools, with diagnostic logging
around `performClose()`, `onCloseRequested`, `waitOrTimeout`, and `destroy()`.

Root cause: `currentWindow.destroy()` was rejecting every time it was called
(both from `onCloseRequested`'s handler and from `performClose()`'s own
fallback) with `"window.destroy not allowed. Permissions associated with
this command: core:window:allow-destroy"`. `close()` itself resolved fine,
but `onCloseRequested`'s `preventDefault()` means the native close only
proceeds once `destroy()` succeeds — so the window never actually closed,
independent of the 3s fallback timer firing correctly. The capability was
simply missing from `src-tauri/capabilities/default.json`. Fixed in
[[02-fix-close-without-sync-hang]].
