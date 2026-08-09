# Move to trash instead of deleting

Status: ready-for-agent

## Parent

`.scratch/trash/spec.md`

## What to build

Change `delete_item_payload` (`src-tauri/src/lib.rs`) so that deleting a note or folder moves it into `.simpler/local/trash/` instead of removing it from disk. `.simpler/local/` is already excluded from Sync via `.simpler/.gitignore` (ADR 0005), so the trash never gets committed or synced.

Each trashed item needs enough metadata to restore it later and to purge it after 30 days (issue 03). Store this as a small JSON index at `.simpler/local/trash/index.json`, a list of entries: `{ id, originalRelativePath, trashedRelativePath, deletedAt (ISO 8601), isDirectory }`. The item itself moves into `.simpler/local/trash/<id>-<original-file-or-folder-name>` (use a generated id, e.g. a timestamp-based or UUID prefix, to avoid collisions when the same name is deleted more than once).

Reuse `resolve_workspace_path`/`sanitize_child_name` for path validation as elsewhere in this file. If `.simpler/local/trash/` doesn't exist yet, create it on first use.

This slice has no UI — it only changes what `delete-item` does on disk. The existing `delete-item` response contract (`workspace_operation_result`) stays the same from the caller's perspective.

## Acceptance criteria

- [ ] Deleting a note via `delete-item` moves the file into `.simpler/local/trash/` and appends an entry to `.simpler/local/trash/index.json`, instead of removing it
- [ ] Deleting a folder via `delete-item` moves the whole folder (with contents) into `.simpler/local/trash/` the same way
- [ ] Two deletes of items with the same original name both succeed and both remain recoverable (no collision/overwrite)
- [ ] `.simpler/local/trash/` is confirmed excluded from `git status` inside a Git-backed workspace (covered by existing `.simpler/.gitignore`)
- [ ] Rust unit tests cover: delete-a-file moves it and indexes it, delete-a-folder moves it and indexes it, no-collision-on-same-name
- [ ] `npm run test:native` passes

## Blocked by

- None — can start immediately.
