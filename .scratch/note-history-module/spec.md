# Historial de nota: extraer a módulo + diff

Status: ready-for-agent

## Source

Backlog item from `docs/backlog.md` ("Historial de nota: extraer a módulo + diff", segunda ronda 2026-08-09). Produced via a `/grill-with-docs` session.

## What to build

The note history feature (from `.scratch/note-history/`, already implemented) currently lives inline in `ClassicShell.tsx` as the `.note-history` `<aside>` block (around lines 833–875), with a plain-text `<pre>` preview and no diff.

Split into two vertical slices:

1. **Extract to its own component** — pure refactor, no behavior change, following the dedicated-component pattern already used by `MarkdownEditor.tsx`.
2. **Add diff view** — compare the selected historical version against the note's *current* content (not the previous commit), computed client-side.

## Blocked by

- None — can start immediately.
