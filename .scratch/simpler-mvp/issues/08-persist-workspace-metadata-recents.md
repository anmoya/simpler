# 08 — Persist Workspace metadata and recent Workspaces

**What to build:** The app stores safe Workspace/app state in `.simpler/`, keeps local-only metadata separate, remembers recent Workspaces, and restores the last opened note where possible.

**Blocked by:** 02 — Open a Workspace and render the Workspace Tree; 05 — Polish the classic writing layout

**Status:** resolved

- [x] The app creates and uses `.simpler/` for app metadata.
- [x] Shared safe Workspace metadata is separated from local-only metadata.
- [x] Local-only metadata and cache state are suitable to ignore from Git.
- [x] The app remembers recent Workspaces.
- [x] The app restores the last opened note for a Workspace when possible.
- [x] Metadata storage does not add mandatory frontmatter or app-specific fields to Markdown notes.
- [x] Tests cover metadata creation, recent Workspace persistence, last-note restore, and note content preservation.

## Answer

Implemented workspace metadata persistence under `.simpler/`:

- `.simpler/workspace.json` stores shared safe workspace metadata.
- `.simpler/local/state.json` stores device-local state, including the last opened note.
- `.simpler/local/cache/` is created for local cache state.
- `.simpler/.gitignore` ignores `local/`.
- Recent Workspaces are remembered in app-local `localStorage`.
- Opening a Workspace restores the last existing Markdown note when possible.
- Notes are not modified by metadata creation or note restore.

Verification:

- `rtk npm run test -- src/app/App.test.tsx`
- `rtk npm run test:native -- --lib metadata`
- `rtk npm run test:native -- --lib last_existing`
- `rtk npm run build`
- `rtk npm run test`
- `rtk npm run test:native`
- `rtk npm run tauri -- build --debug --no-bundle`
