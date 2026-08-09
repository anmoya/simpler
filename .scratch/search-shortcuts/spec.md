# Atajos de búsqueda estilo VSCode

Status: ready-for-agent

## Source

Backlog item from `docs/backlog.md` ("Atajos de búsqueda estilo VSCode", segunda ronda 2026-08-09). Produced via a `/grill-with-docs` session.

## What to build

Today both search inputs — `.file-search` (current-note search, in `.editor-toolbar`) and `.global-search` (in the sidebar) — are always visible in `ClassicShell.tsx`. Change both to be hidden by default and shown/focused via keyboard shortcut, VSCode-style:

- Ctrl/Cmd+F opens/focuses the current-note search.
- Ctrl/Cmd+Shift+F opens/focuses the global search.
- Esc closes whichever search is open and returns focus to the editor.

Split into two vertical slices:

1. **Current-note search** — the more common case, touches `.file-search` and the editor toolbar.
2. **Global search** — same pattern applied to `.global-search` in the sidebar.

## Blocked by

- None — can start immediately.
