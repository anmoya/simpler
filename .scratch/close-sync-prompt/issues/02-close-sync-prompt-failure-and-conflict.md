Status: ready-for-agent

# Close Sync Prompt — Sync failure or conflict while waiting

## Parent

.scratch/close-sync-prompt/spec.md

## What to build

Extend the Close Sync Prompt from issue 01 to handle the cases where the Sync it's waiting on doesn't succeed:

- If the user chose "wait for sync" and that Sync fails (network/auth error, same failure surfaced elsewhere in the app) or comes back as a conflict, the prompt switches to an error state showing what happened, with only a "close without sync" action available — resolving a Git conflict is out of scope for the close flow (that stays in the existing conflict-resolution UI, reached after reopening the workspace).
- If the user opens the Close Sync Prompt while the automatic sync scheduler is already paused for an unresolved conflict from before (i.e. there's nothing that a "wait for sync" click could even start), skip straight to that same error state — do not offer "wait for sync" at all in this case, since there's no in-flight Sync to wait on.

In both cases, the prompt should never leave the user with no way to close — "close without sync" must always be reachable.

## Acceptance criteria

- [ ] If Sync fails while the prompt is in the "waiting" state, the prompt shows the error and offers only "close without sync"; choosing it closes the window.
- [ ] If Sync comes back as a conflict while the prompt is in the "waiting" state, same as above.
- [ ] If the automatic sync scheduler is already paused for a conflict when the prompt opens, it shows the error state immediately, without ever showing a "wait for sync" option.
- [ ] New unit tests (Vitest) cover: sync-fails-while-waiting shows error and close-without-sync still closes; sync-conflicts-while-waiting behaves the same; opening the prompt with a pre-existing unresolved conflict skips straight to the error state with no wait option offered.

## Blocked by

- Close Sync Prompt — happy path (wait for sync / close without sync) (01)
