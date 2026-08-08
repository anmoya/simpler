# List continuation on Enter

Status: ready-for-agent

## Source

Backlog item from `docs/backlog.md` ("Continuar listas/checklists al Enter"), under the "Edición y escritura" axis. Produced via a `/grill-with-docs` session on 2026-08-08.

## What to build

In `MarkdownEditor` (CodeMirror 6, `src/components/MarkdownEditor.tsx`), pressing Enter while the cursor is inside a list item continues the list on the next line instead of leaving the user to retype the marker by hand. This covers bullet lists (`- `, `* `, `+ `), ordered lists (`1. `, `2. `, …), and GitHub-style checklists (`- [ ] `, `- [x] `).

This is Raw Markdown assistance only — it types normal Markdown text into the document, no custom syntax, no app-specific note format (see `CONTEXT.md`: Standard Markdown, Raw Markdown).

Split into two vertical slices:

1. **Simple/ordered list continuation** — bullet and numbered markers.
2. **Checklist continuation + empty-item exit** — checkbox markers, plus the "Enter on an empty list item exits the list" behavior for all three marker types (bullet, ordered, checklist).

## Blocked by

- None — can start immediately.
