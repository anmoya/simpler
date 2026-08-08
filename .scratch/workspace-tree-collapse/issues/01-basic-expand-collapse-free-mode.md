Status: ready-for-agent

# Workspace Tree — basic expand/collapse (Free Tree Mode)

## Parent

.scratch/workspace-tree-collapse/spec.md

## What to build

Add expand/collapse to the `WorkspaceTree` component (`src/components/ClassicShell.tsx`) and its underlying state. Each folder row gets a toggle (chevron) that expands/collapses its children; a collapsed folder renders its row but not its `children`. This is Free Tree Mode behavior only — opening one folder must never affect any other folder's expand state.

Track expand/collapse state as a set of open folder paths (folders not in the set render collapsed) in `AppState` (`src/app/appState.ts`), following the existing pattern of plain state + `setAppState` callbacks (no external state library, per `CLAUDE.md`). No persistence yet — state resets on reload; that's issue 02.

Extract the expand/collapse toggle logic into a small pure function/module (e.g. toggling a path in a set) that issue 03 (Accordion Mode) and issue 04 (Focus Active Note) can build on without duplicating tree-walking logic — follow this repo's pattern of pure, independently-testable logic (see `automaticSyncScheduler.ts`).

## Acceptance criteria

- [ ] Each folder row in the Workspace Tree has a clickable expand/collapse toggle.
- [ ] Collapsing a folder hides its children (files and subfolders) without removing the folder row itself.
- [ ] Opening or closing one folder does not change the expand state of any other folder.
- [ ] New Vitest coverage for the pure expand/collapse state logic (toggle open, toggle closed, independent of other paths).
- [ ] New Testing Library coverage confirming clicking a folder's toggle hides/shows its children in the rendered tree.

## Blocked by

None - can start immediately
