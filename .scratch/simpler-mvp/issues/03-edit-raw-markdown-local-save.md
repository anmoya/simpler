# 03 — Edit Raw Markdown with Local Save

**What to build:** The user can select a Markdown note, edit it in CodeMirror with syntax highlighting and line numbers, and have changes saved directly to disk without Git or network.

**Blocked by:** 02 — Open a Workspace and render the Workspace Tree

**Status:** resolved

- [x] Selecting a visible Markdown note opens its raw file content in the editor.
- [x] The editor uses CodeMirror 6 with Markdown syntax highlighting.
- [x] Line numbers are visible in the editor.
- [x] Edits are persisted to the note file through Local Save.
- [x] Local Save works without Git configuration or network access.
- [x] Tests verify that saved file content matches the Raw Markdown the user wrote.

## Comments

- Added `filesystem/read-note` and `filesystem/write-note` native commands with Rust tests covering read, write, and Markdown-only path validation.
- Added a `MarkdownEditor` component wrapping CodeMirror 6 (`basicSetup` + `@codemirror/lang-markdown`) with line numbers and syntax highlighting.
- Wired note selection in the sidebar to load content via `readNote`, and edits to save immediately via `writeNote` (Local Save, no Git/network involved).
- Verified `npx tsc --noEmit`, `npm run build`, `npx vitest run`, and `cargo test --manifest-path src-tauri/Cargo.toml`.
