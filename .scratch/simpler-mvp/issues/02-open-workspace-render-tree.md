# 02 — Open a Workspace and render the Workspace Tree

**What to build:** The user can choose a normal folder, open it as the active Workspace, and see real folders plus visible `.md` files while hidden/internal folders and non-note files stay out of the sidebar.

**Blocked by:** 01 — Scaffold the Tauri desktop app shell

**Status:** resolved

- [x] The user can open a normal filesystem folder as a Workspace.
- [x] The sidebar renders the real Workspace Tree from disk.
- [x] Markdown files are visible as notes.
- [x] Non-Markdown files are preserved but not shown as editable notes.
- [x] Hidden/internal folders such as `.git` and `.simpler` are excluded from the visible tree.
- [x] Tests cover Workspace Tree reading, filtering, and preservation of ignored files.

## Comments

- Implemented through the `workspace/open` native command, the Tauri dialog folder picker, recursive sidebar rendering, and focused native/UI tests.
