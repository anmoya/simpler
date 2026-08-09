# Adjuntos e imágenes

Status: ready-for-agent

## Source

Backlog item from `docs/backlog.md` ("Adjuntos e imágenes"), "Edición y escritura" axis. Produced via a `/grill-with-docs` session on 2026-08-08.

## What to build

Pasting or dragging an image into a note saves it as a real file inside the Workspace and references it with Standard Markdown image syntax (`![](assets/2026-08-08-143022.png)`), rather than embedding it inline. This keeps the note file itself as plain, portable Markdown (`CONTEXT.md`: Raw Markdown, Standard Markdown).

Design decisions already settled:
- **Location**: a shared `assets/` subfolder per directory (all notes in the same folder share one `assets/`), not one folder per note.
- **Orphan cleanup**: out of scope for this feature — no automatic deletion when a note referencing an image is deleted.
- **Size**: no size limit or compression in this feature — rely on existing Sync error surfacing if Git/GitHub rejects a large file.
- **Naming**: `<timestamp>.<ext>` (e.g. `2026-08-08-143022.png`), no prompt.

Split into two vertical slices:

1. **Paste from clipboard** — the core end-to-end path.
2. **Drag-and-drop from the OS file explorer** — same save/insert logic, different trigger.

## Blocked by

- None — can start immediately.
