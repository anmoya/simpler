# Sidebar colapsable a rail de íconos

Status: ready-for-agent

## Source

Backlog item from `docs/backlog.md` ("Sidebar colapsable a rail de íconos", segunda ronda 2026-08-09). Produced via a `/grill-with-docs` session, prompted by a real tiling-window-manager screenshot showing the `tree-actions` row overlapping the tree at narrow widths.

## What to build

Add a collapsed state for the sidebar (`.sidebar` in `styles.css`, rendered in `ClassicShell.tsx`) that hides the whole panel (workspace switcher, GitHub row, global search, Workspace Tree, tree actions, sync status) and leaves a narrow icon rail instead (open Workspace, global search, sync, expand-sidebar-again). This is a "give the editor room" mode, not a compact navigation mode — the tree is not usable while collapsed.

Split into two vertical slices:

1. **Manual toggle** — a button/shortcut to collapse/expand, plus fixing the existing narrow-width overlap bug in `tree-actions` (visible in the 2026-08-09 screenshot) as part of the same layout work.
2. **Automatic collapse by window width** — same collapsed state, triggered by available width instead of (or in addition to) the manual toggle.

## Blocked by

- None — can start immediately.
