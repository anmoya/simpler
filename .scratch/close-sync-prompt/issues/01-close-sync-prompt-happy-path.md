Status: ready-for-agent

# Close Sync Prompt — happy path (wait for sync / close without sync)

## Parent

.scratch/close-sync-prompt/spec.md

## What to build

Add the Close Sync Prompt (see `CONTEXT.md`): a blocking dialog shown from the in-app close button (`closeWindow` in `src/app/App.tsx`) when there are changes pending Sync (the same `hasPendingChanges` condition the automatic sync scheduler already tracks internally — expose whatever's needed to check it from `closeWindow`). If there are no pending changes, `closeWindow` behaves exactly as it does today: no prompt, closes immediately.

The prompt offers exactly two choices, no "cancel" option — it always ends in closing:
- **Wait for sync**: triggers the same Sync `appClosing()` would trigger, shows a waiting/in-progress state, and once Sync succeeds, closes the window automatically.
- **Close without sync**: closes the window immediately, leaving changes only in Local Save.

This needs its own `DialogRequest` kind (or equivalent) distinct from the existing generic `prompt`/`confirm` dialog in `appState.ts` — it has multiple named actions and an internal state transition (idle → waiting → closing), not a single resolve-once boolean.

While the prompt is open and the user hasn't chosen yet, it must pause the bounded close-fallback timers added in `.scratch/window-close-reliability/` (the JS `closeFallbackMs` race in `App.tsx` and, if reachable from JS, coordinate with the native GTK backstop) so the window isn't force-closed while the prompt is still waiting for input. Once the user picks an option (or Sync succeeds while waiting), let the normal close-then-destroy path proceed, with its fallback protection intact again.

Do not change what `appClosing()`/the automatic sync scheduler does for the no-pending-changes case, and do not touch the window-manager close path at all (see `docs/adr/0011-close-sync-prompt-in-app-only.md`) — this issue only touches the in-app `closeWindow` path.

## Acceptance criteria

- [ ] Closing via the in-app close button with no pending changes shows no prompt and closes immediately (regression check against current behavior).
- [ ] Closing via the in-app close button with pending changes shows the Close Sync Prompt with "wait for sync" and "close without sync" options, and no way to dismiss without choosing one of them.
- [ ] Choosing "wait for sync" triggers a Sync; on success the window closes automatically without further input.
- [ ] Choosing "close without sync" closes the window immediately.
- [ ] While the prompt is open and unresolved, the window is not force-closed by the existing bounded close-fallback timers; those resume normal behavior once the user picks an option.
- [ ] New unit tests (Vitest) cover: no-prompt-when-no-pending-changes, prompt-then-wait-then-success-closes, prompt-then-close-without-sync-closes-immediately, and that the fallback timers don't fire while the prompt is open and pending a decision.

## Blocked by

None - can start immediately
