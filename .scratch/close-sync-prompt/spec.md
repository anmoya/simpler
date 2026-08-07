Status: ready-for-agent

# Close Sync Prompt

## Problem Statement

Closing the app via the in-app close button (`closeWindow` in `src/app/App.tsx`) never gives the user a chance to make sure their latest changes actually reach GitHub before the window disappears. Today, `appClosing()` fires a best-effort Sync in the background if there are pending Local Save changes, but the window closes (bounded by the reliability fallback added in `.scratch/window-close-reliability/`) regardless of whether that Sync ever finishes, fails, or hits a conflict. A user who closes right after a burst of edits has no visibility into whether their notes made it to the remote.

Note: a window-manager-initiated close (alt+F4, tiling WM close keybind, `hyprctl dispatch closewindow`) bypasses the app's JS entirely — see `docs/adr/0011-close-sync-prompt-in-app-only.md` for why this feature is scoped to the in-app close button only, and does not attempt to cover that path.

## Solution

A **Close Sync Prompt** (see `CONTEXT.md`): a blocking dialog shown from the in-app close button when there are changes pending Sync. It offers two choices — wait for the in-flight Sync to finish, or close without it — and always resolves to closing (there is no "cancel, don't close" option). While the prompt is open, it pauses the bounded close-fallback timers added by `.scratch/window-close-reliability/` so the window isn't force-closed out from under it; those resume the moment the user picks an option.

If Sync fails or hits a conflict while the user is waiting (or was already stuck in an unresolved conflict before the prompt even opened), the prompt switches to an error state with only the "close without sync" option — resolving a Git conflict is out of scope for the close flow.

"Wait for sync" has no timeout of its own: it's a visible, user-chosen wait (not the silent hang the reliability fallback was built to prevent), and the user can switch to "close without sync" at any time.

## User Stories

1. As a user closing the app with no pending changes, I want the window to close immediately with no prompt, so that the common case stays fast.
2. As a user closing the app with pending changes, I want to be asked whether to wait for Sync or close without it, so that I don't accidentally leave notes unsynced without knowing.
3. As a user who chooses to wait, I want the window to close automatically once Sync succeeds, so that I don't have to do anything else.
4. As a user who chooses to close without waiting, I want the window to close immediately, so that I'm never blocked against my will.
5. As a user waiting for Sync that then fails or conflicts, I want to see that clearly and be offered to close anyway, so that I'm not stuck waiting on something that will never finish.
6. As a user who opens the close prompt while a prior Sync conflict is already unresolved, I want to see that same error state immediately (no "wait" option offered), so that I'm not offered to wait on something that isn't running.

## Out of Scope

- Any prompt or behavior change for a window-manager-initiated close (see ADR 0011).
- Resolving Git conflicts from within the close flow — that stays in the existing conflict-resolution UI.
- Changing what `appClosing()`/the automatic sync scheduler does for the non-blocking, no-prompt case (no pending changes).
