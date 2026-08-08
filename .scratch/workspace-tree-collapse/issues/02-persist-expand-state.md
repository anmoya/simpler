Status: ready-for-agent

# Workspace Tree — persist expand/collapse state

## Parent

.scratch/workspace-tree-collapse/spec.md

## What to build

Persist the set of open folder paths (introduced in issue 01) to `.simpler/local/state.json`, alongside whatever other local-only state already lives there (e.g. last-opened note). Save on change (debounced or on each toggle, matching the existing pattern used for other local state writes), and restore it when the workspace is opened.

If a persisted folder path no longer exists in the current `workspaceTree` (renamed/deleted/moved externally), drop it silently rather than erroring.

## Acceptance criteria

- [ ] Expanding/collapsing a folder persists the updated open-folder set to `.simpler/local/state.json`.
- [ ] Reopening the same workspace restores the previously open folders exactly as left.
- [ ] A persisted folder path that no longer exists in the current tree is ignored without error.
- [ ] New tests (Rust or Vitest, matching wherever the existing local-state read/write logic lives) cover: round-trip persistence, and stale-path-ignored-on-restore.

## Blocked by

- 01-basic-expand-collapse-free-mode.md
