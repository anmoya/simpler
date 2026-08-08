Status: ready-for-agent

# Workspace Tree — Focus Active Note action

## Parent

.scratch/workspace-tree-collapse/spec.md

## What to build

Add a "Focus Active Note" control (see `CONTEXT.md`) near the mode selector in the Workspace Tree's sidebar header. Clicking it collapses every folder except the full path from the root to the folder containing the currently active note (`activeNotePath` in `AppState`), expanding that entire path if any part of it is currently collapsed. Available and behaves identically regardless of the current Accordion/Free Tree Mode — it's a one-shot action, not a mode change.

If there is no active note, the control should be disabled (or a no-op) — there's no path to focus on.

## Acceptance criteria

- [ ] Clicking "Focus Active Note" collapses all folders except the full ancestor path of the active note.
- [ ] The full path to the active note ends up expanded, even if parts of it were previously collapsed.
- [ ] Behavior is identical in both Accordion Tree Mode and Free Tree Mode.
- [ ] With no active note, the control is disabled or a no-op (no crash, no unexpected collapse).
- [ ] New Vitest coverage for the pure path-computation/collapse-except-path logic.

## Blocked by

- 01-basic-expand-collapse-free-mode.md
- 03-accordion-mode-and-selector.md
