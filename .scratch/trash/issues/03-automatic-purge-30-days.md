# Automatic purge after 30 days

Status: done

## Parent

`.scratch/trash/spec.md`

## What to build

Silently purge trash entries older than 30 days. On workspace open (the same lifecycle point where other workspace-open bookkeeping already happens, e.g. `Workspace`/`open` handling in `src-tauri/src/lib.rs`), scan `.simpler/local/trash/index.json`, and for every entry whose `deletedAt` is more than 30 days in the past: permanently delete the item from `.simpler/local/trash/` and remove its entry from the index. This runs quietly — no confirmation prompt, no UI surfaced for this pass (per the backlog decision: silent automatic purge, not a manual "empty trash" action).

## Acceptance criteria

- [ ] Opening a workspace whose trash index contains an entry older than 30 days permanently removes that item's files and its index entry
- [ ] Entries younger than 30 days are left untouched by the same pass
- [ ] Purge runs without any user-facing prompt or error when there's nothing to purge
- [ ] Native unit tests cover: old entry gets purged, recent entry is kept, mixed old/recent list only purges the old ones
- [ ] `npm run test:native` passes

## Blocked by

- `.scratch/trash/issues/01-move-to-trash-on-delete.md`
