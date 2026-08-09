# Manual sidebar collapse toggle + narrow-width overlap fix

Status: done

## Parent

`.scratch/collapsible-sidebar/spec.md`

## What to build

Add a manual collapse/expand toggle for `.sidebar` (`ClassicShell.tsx`/`styles.css`). Collapsed state hides the sidebar's normal content (workspace switcher, GitHub row, global search, `WorkspaceTree`, `.tree-actions`, sync panel) and renders a narrow icon rail instead, with icon buttons for: open Workspace, focus global search, trigger sync, and expand the sidebar back. Persist the collapsed/expanded state per device in `localStorage` (same pattern as `themeMode` in `App.tsx`), so it survives restarts.

As part of this same layout work, fix the existing bug where `.tree-actions` (the create-folder/create-note/rename/move/delete icon row, styled around line 437 in `styles.css`) visually overlaps the tree content at narrow widths (reproduced with a tiling window manager at roughly 450px width — see the reported screenshot). Investigate whether this is a missing `flex-wrap`/`min-width: 0` on an ancestor, or a stale absolute-positioning rule; fix at the root cause rather than just hiding the row at that width.

Add a `ShellCommand` entry (Command Palette/Command Help) and a keyboard shortcut for toggling the sidebar collapse state, following the existing `commands` array pattern in `ClassicShell.tsx`.

## Acceptance criteria

- [ ] Clicking the collapse toggle hides the sidebar's normal content and shows the icon rail instead
- [ ] Clicking expand (from the rail) restores the full sidebar
- [ ] Collapsed/expanded state persists across app restarts, per device
- [ ] The icon rail's "open Workspace" and "sync" icons trigger the same actions as their full-sidebar equivalents
- [ ] At a narrow window width (~450px), `.tree-actions` no longer overlaps the tree content, in both collapsed and expanded sidebar states
- [ ] The toggle has a Command Palette entry and keyboard shortcut, shown in Command Help
- [ ] A `ClassicShell` test toggles collapse/expand and asserts the rendered content switches accordingly
- [ ] `npm run test` passes

## Blocked by

- None — can start immediately.
