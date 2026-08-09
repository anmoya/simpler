# Restore a past version as a new local change

Status: done

## Parent

`.scratch/note-history/spec.md`

## What to build

Add a "Restore this version" action to the history panel (issue 02). Restoring copies the previewed version's content into the current note file as a normal Local Save — the same write path used when the user edits and saves a note today (`writeNote`/`Filesystem`/`write-note`) — then leaves it for normal Sync to pick up. This is explicitly **not** a Git checkout or history rewrite: it's a forward-only new edit, consistent with how Sync/conflict resolution already work in this codebase (ADR 0001).

After restoring, the editor should show the restored content immediately (as if the user had pasted it in and it was auto-saved), and the history panel should close or return to the live/current state.

## Acceptance criteria

- [ ] Clicking "Restore this version" on a previewed past version writes that content to the note file via the existing note-write path
- [ ] The open editor reflects the restored content immediately
- [ ] No Git command that rewrites history (`checkout`, `reset`, `revert`, etc.) is invoked — only a normal file write
- [ ] Restoring, then syncing, produces a new commit on top of history (verified via a native/App test using a local Git remote, matching the existing Sync test conventions)
- [ ] An App/component test exercises: open history, preview a version, restore, assert editor content and that a subsequent Sync commits it normally
- [ ] `npm run test` and `npm run test:native` pass

## Blocked by

- `.scratch/note-history/issues/02-history-panel-ui.md`
