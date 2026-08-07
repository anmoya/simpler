# 07 — Add file search and Global Search

**What to build:** The user can search within the active note and search plain text across `.md` files in the active Workspace, with file/line results that jump to the match.

**Blocked by:** 03 — Edit Raw Markdown with Local Save; 05 — Polish the classic writing layout

**Status:** resolved

- [x] The user can search within the active note.
- [x] The user can jump between matches in the active note.
- [x] Global Search searches plain text across visible Markdown files in the active Workspace.
- [x] Global Search results show the matching file and line reference.
- [x] Selecting a Global Search result opens the note and jumps to the match.
- [x] Global Search does not index hidden/internal folders or non-Markdown files.
- [x] Tests cover file search, Global Search, line references, and result navigation.

## Comments

- Added current-note search controls to the classic editor toolbar with previous/next navigation and CodeMirror jump selection.
- Added `filesystem/global-search` native command for plain-text matches across visible Markdown files, excluding hidden/internal folders and non-Markdown files.
- Added Global Search UI in the sidebar with file and line references; selecting a result opens the note and jumps to the match.
- Verified `npm run test`, `npm run build`, `npm run test:native`, and `npm run tauri -- build --debug --no-bundle`.
