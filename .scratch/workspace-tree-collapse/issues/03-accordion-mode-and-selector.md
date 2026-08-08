Status: ready-for-agent

# Workspace Tree — Accordion Tree Mode + mode selector

## Parent

.scratch/workspace-tree-collapse/spec.md

## What to build

Add Accordion Tree Mode (see `CONTEXT.md`): opening a folder collapses its sibling folders at that same level (cascading their descendants closed), without touching unrelated branches elsewhere in the tree. Build this on top of the expand/collapse engine from issue 01 — when a folder is opened while Accordion Mode is active, close its sibling folders (and everything nested under them) in the same state update; Free Tree Mode keeps today's behavior (issue 01) unchanged.

Add a mode selector control in the Workspace Tree's sidebar header (Accordion / Free), defaulting to Free Tree Mode when no preference is recorded. Persist the chosen mode in `.simpler/local/state.json` next to the expand-state from issue 02.

## Acceptance criteria

- [ ] A control in the tree sidebar header switches between Accordion Tree Mode and Free Tree Mode.
- [ ] Default mode (no prior preference) is Free Tree Mode.
- [ ] In Accordion Tree Mode, opening a folder collapses its sibling folders at that level and all of their descendants; folders at other levels (ancestors, or unrelated branches) are untouched.
- [ ] In Free Tree Mode, behavior matches issue 01 exactly (opening a folder never affects any other folder).
- [ ] The chosen mode persists in `.simpler/local/state.json` and is restored on reopening the workspace.
- [ ] New Vitest coverage for the accordion-collapse pure logic (sibling collapse, cascade to descendants, ancestors/unrelated branches untouched).
- [ ] New Testing Library coverage for the mode selector switching behavior live in the rendered tree.

## Blocked by

- 01-basic-expand-collapse-free-mode.md
- 02-persist-expand-state.md
