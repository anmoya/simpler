Status: ready-for-agent

# Guarantee the window closes even if app-closing logic fails

## Parent

.scratch/window-close-reliability/spec.md

## What to build

Right now, closing the window depends on a chain of JS running to completion: `getCurrentWindow().onCloseRequested(handler)` only calls `window.destroy()` internally if `handler` resolves without calling `event.preventDefault()`. If `requestCloseSync()` (which calls `schedulerRef.current?.appClosing()`) throws, rejects, or simply never settles, `destroy()` is never reached — the window and its process are stuck open with no fallback, and the user has no way to close the app short of finding and killing the process manually.

Add a fallback so a close request always results in the window actually closing within a bounded time, independent of whether the app-closing sync logic succeeds:

- Wrap the body of the `onCloseRequested` handler (and the `beforeunload` handler, and `closeWindow`) so any thrown/rejected error is caught and does not prevent the close from proceeding.
- Add an explicit bounded fallback (e.g. a short timeout) so that if the handler hasn't let the close proceed within a few seconds, the window is force-closed (`getCurrentWindow().destroy()` or equivalent) regardless of what the app-closing logic is doing.
- This must apply to every path that requests a close: the in-app close button (`closeWindow`), a window-manager-level close request (right-click close / close keybind — the same `WINDOW_CLOSE_REQUESTED` event both go through), and app quit shortcuts if any exist.

Do not change what `appClosing()`/the automatic sync scheduler does when a close is requested — only ensure its success or failure can never block the window from closing.

## Acceptance criteria

- [ ] Simulating a close request while the app-closing logic throws (e.g. by making `schedulerRef.current` behave unexpectedly, or via a unit test that stubs a throwing `requestSync`/scheduler callback) still results in the window's close proceeding (i.e. `destroy()`/equivalent is called) instead of hanging indefinitely.
- [ ] A close request that never resolves (simulate a Promise that never settles) still results in the window closing within the bounded fallback time.
- [ ] Existing Sync-on-close behavior (`appClosing()` triggering a pending Sync) is unaffected for the normal, non-throwing case — add/keep a test asserting this.
- [ ] Manually verified on a Linux desktop build: dispatching a window-manager-level close (e.g. `hyprctl dispatch closewindow <address>` on Hyprland, or the equivalent close action on whatever WM/DE is used to test) results in the process actually exiting, not just the window disappearing with the process still running.
- [ ] New unit tests (Vitest) cover the throwing and never-resolving cases at the seam that registers the close handler.

## Blocked by

None - can start immediately
