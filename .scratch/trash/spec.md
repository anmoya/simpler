# Papelera / deshacer borrado

Status: ready-for-agent

## Source

Backlog item from `docs/backlog.md` ("Papelera / deshacer borrado"), "Organización del Workspace Tree" axis. Produced via a `/grill-with-docs` session on 2026-08-08.

## What to build

Deleting a note or folder today (`Filesystem`/`delete-item` in `src-tauri/src/lib.rs`) removes it immediately with `fs::remove_file`/`fs::remove_dir_all`. Replace this with a recoverable trash: deleted items move to `.simpler/local/trash/`, local to the device and excluded from Sync (ADR 0005 — `.simpler/local/` is already gitignored via `.simpler/.gitignore`), since Git/Sync already provides long-term recovery once note history exists — this is only the immediate "oops" safety net.

Split into three vertical slices:

1. **Move-to-trash instead of delete** — native behavior change only, no UI yet.
2. **Trash UI** — view and restore trashed items to their original location.
3. **Automatic purge** — silently remove items older than 30 days.

## Blocked by

- None — can start immediately.
