# Resaltar la ruta hacia la nota abierta

Status: ready-for-agent

## Source

Backlog item from `docs/backlog.md` ("Resaltar la ruta hacia la nota abierta en el árbol", segunda ronda 2026-08-09). Produced via a `/grill-with-docs` session.

## What to build

While a note is open, every folder on the path from the Workspace root to the folder containing the active note (`activeNotePath` in `ClassicShell.tsx`) gets visual emphasis using `--color-accent` (the theme's existing emphasis color, already used for active selection/`--color-accent-strong`/`--color-accent-ring`). This is always-on — independent of Accordion/Free Tree Mode and independent of whether Focus Active Note was triggered.

No folder is highlighted when no note is open.

Single vertical slice, no dependencies.

## Blocked by

- None — can start immediately.
