Status: done

## What to build

Add a smooth transition animation when expanding or collapsing a folder in the
Workspace Tree, for both Accordion Tree Mode and Free Tree Mode (see
`CONTEXT.md` for the definitions of these two modes) and for the Focus Active
Note action.

This is a pure visual/CSS enhancement on top of the existing
`workspace-tree-collapse` behavior — no state-machine or data changes are
expected. Keep the transition short (roughly 150-200ms) and avoid layout jank on
deeply nested trees; prefer a CSS `max-height`/`grid-template-rows` or similar
GPU-friendly transition over JS-driven height measurement where possible.

## Acceptance criteria

- [ ] Expanding a folder animates its children in, instead of an instant
      show/hide
- [ ] Collapsing a folder animates its children out
- [ ] Cascading collapses in Accordion Tree Mode (sibling folders auto-closing)
      animate reasonably rather than jumping
- [ ] No visible jank/flicker on a tree with several nested levels expanded at
      once
- [ ] Respects `prefers-reduced-motion` (no animation, instant toggle, for users
      who have that OS setting on)

## Blocked by

None - can start immediately
