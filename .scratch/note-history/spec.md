# Historial de versiones por nota

Status: ready-for-agent

## Source

Backlog item from `docs/backlog.md` ("Historial de versiones por nota"), "Sync y multi-dispositivo" axis. Produced via a `/grill-with-docs` session on 2026-08-08.

## What to build

Let the user see previous versions of a note and restore one, without exposing raw Git commands (ADR 0001: Sync surfaces only product-level outcomes, not Git plumbing).

Design decisions already settled:
- **Granularity**: one history point per Sync commit that touched the note (reuses Git's existing log, not a parallel versioning system).
- **Restore**: copies the chosen version's content into the current file as a new local change (Local Save), ready for normal Sync. Never a hard checkout/rewrite — consistent with ADR 0001 ("Sync surfaces only `synced`/`conflict`... conflict resolution is mapped onto Git operations, never exposed raw").

Only applies to notes inside a Git-backed Workspace (ADR notion already in `CONTEXT.md`) — a plain (non-Git) Workspace has no history to show.

Split into three vertical slices:

1. **List commit history for a note** — native command only, no UI.
2. **History panel UI** — browse the list and preview a past version's content.
3. **Restore action** — apply a past version as a new local change.

## Blocked by

- None — can start immediately.
