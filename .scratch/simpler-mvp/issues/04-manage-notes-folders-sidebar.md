# 04 — Manage notes and folders from the sidebar

**What to build:** The user can create folders, create `.md` notes, rename notes/folders, move notes between folders, avoid overwrites, and keep Note Identity tied to the real path.

**Blocked by:** 02 — Open a Workspace and render the Workspace Tree; 03 — Edit Raw Markdown with Local Save

**Status:** resolved

- [x] The user can create a folder inside the active Workspace.
- [x] The user can create a Markdown note in a selected folder.
- [x] New note names are normalized to `.md` when the extension is omitted.
- [x] Creating or renaming a note refuses to overwrite an existing file.
- [x] The user can rename notes and folders on disk from the sidebar.
- [x] The user can move notes between folders.
- [x] Editing the first Markdown heading does not automatically rename the file.
- [x] Tests cover create, rename, move, overwrite protection, and Note Identity behavior.

## Comments

- Implemented filesystem command-boundary operations for create folder, create note, rename item, and move note, returning refreshed Workspace Trees after disk changes.
- Added sidebar controls for folder selection, note/folder creation, selected item rename, and active-note move.
- Added native and UI tests for create, rename, move, overwrite protection, action availability, and Note Identity staying path-based when headings change.
- Verified `rtk npm run test`, `rtk npm run build`, and `rtk npm run test:native`.
