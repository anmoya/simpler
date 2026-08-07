# 05 — Polish the classic writing layout

**What to build:** The MVP layout matches the agreed classic shape: sidebar, central editor, status area, active note context, light/dark theme, and functional empty/error states.

**Blocked by:** 03 — Edit Raw Markdown with Local Save; 04 — Manage notes and folders from the sidebar

**Status:** resolved

- [x] The app presents a classic layout with sidebar, central editor, and bottom/status area.
- [x] The active folder and note context are visible without treating the Note Title as identity.
- [x] Light and dark themes are available.
- [x] Empty Workspace, no selected note, missing file, and file error states are handled clearly.
- [x] The layout remains usable with nested folders and long note names.
- [x] UI tests or screenshots verify the main classic layout states.

## Comments

- Added a visible active context strip for Folder, Note Identity, and optional Note Title while preserving path/filename as identity.
- Added light/dark theme state and responsive shell styling for the sidebar, editor, status bar, CodeMirror surface, nested folders, and long note names.
- Added distinct empty Workspace, no selected note, missing note, and file error editor states; the native command boundary now reports deleted Markdown notes as `note file is missing`.
- Removed the inert Command Palette toolbar button during review because the real command launcher belongs to issue 06.
- Verified `rtk npm run test -- src/components/ClassicShell.test.tsx`, `rtk npm run test`, `rtk npm run build`, `rtk npm run test:native`, and `rtk npm run tauri -- build`.
