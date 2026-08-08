Status: ready-for-agent

# Workspace Tree — auto-expand path on note navigation

## Parent

.scratch/workspace-tree-collapse/spec.md

## What to build

When the active note changes via a path that doesn't originate from the user directly clicking the note's own row in the tree — a Global Search result, a Command Palette jump, or restoring the last-opened note when the workspace is opened — expand the full path from the root to that note's folder, using the same collapse-except-path logic as Focus Active Note (issue 04) so behavior matches Accordion Tree Mode's cascade rules when active.

Clicking a note directly in the tree (it's already visible, by definition) should not trigger this — no reason to touch other folders' state in that case.

## Acceptance criteria

- [ ] Selecting a note from Global Search results expands the path to it in the tree.
- [ ] Jumping to a note via Command Palette expands the path to it in the tree.
- [ ] Restoring the last-opened note when a workspace is opened expands the path to it in the tree.
- [ ] In Accordion Tree Mode, this expansion collapses sibling branches per the normal accordion cascade rules; in Free Tree Mode it only expands, touching nothing else.
- [ ] Clicking a note directly in the already-rendered tree does not trigger any extra expand/collapse side effects.
- [ ] New tests (Vitest + Testing Library) cover each of the three navigation entry points expanding the correct path.

## Blocked by

- 01-basic-expand-collapse-free-mode.md
- 03-accordion-mode-and-selector.md
