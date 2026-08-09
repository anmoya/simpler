# Zoom / tamaño de letra

Status: ready-for-agent

## Source

Backlog item from `docs/backlog.md` ("Zoom / tamaño de letra", segunda ronda 2026-08-09). Produced via a `/grill-with-docs` session.

## What to build

Two independent, per-device controls (stored the same way `themeMode` already is — `localStorage`, not `.simpler/workspace.json`, since this is a device preference, not Workspace content):

- **UI zoom**: scales the whole app shell (sidebar, toolbar, etc.) via a root-level CSS scale/variable. Keyboard shortcuts Ctrl/Cmd+`+`/Ctrl/Cmd+`-`/Ctrl/Cmd+`0` (increase/decrease/reset), discrete steps (not continuous), plus entries in the Command Palette (`ShellCommand` pattern already used in `ClassicShell.tsx`).
- **Editor font size**: scales only the CodeMirror editor content in `MarkdownEditor.tsx`, independently of UI zoom, with its own discrete steps and its own shortcuts/Command Palette entries (needs a distinct modifier combo from UI zoom, e.g. add Shift, since both can't claim plain Ctrl+/Ctrl-).

Split into two vertical slices:

1. **UI zoom** — the app-shell-wide control.
2. **Editor font size** — same mechanism, applied to the editor only.

## Blocked by

- None — can start immediately.
