# Diff historical version against current note content

Status: done

## Parent

`.scratch/note-history-module/spec.md`

## What to build

In `NoteHistoryPanel.tsx` (issue 01), replace or augment the plain `<pre>{noteHistoryPreview}</pre>` rendering with a line-level diff between the selected historical version (`noteHistoryPreview`) and the note's current content (already available to `ClassicShell` as the live editor content — thread it through as a new prop, e.g. `currentContent`). This answers "what would I lose/gain by restoring this version," not a diff against the previous commit.

No new native command needed — this is a client-side text diff. No diff library is currently a dependency (checked `package.json`); either add a small, well-established one (e.g. `diff` from npm) or implement a minimal line-based diff — prefer the library unless it pulls in significant bundle weight, given the existing Vite bundle-size note in `docs/mvp-readiness.md`.

Render added/removed/unchanged lines distinguishably (e.g. `+`/`-` prefixes and background color using theme variables — reuse `--color-accent`/`--color-error`-family tokens rather than introducing new hardcoded colors, consistent with how diffs are usually colored: additions vs. removals).

## Acceptance criteria

- [ ] Selecting a historical entry shows a line-level diff against the current note content, not just the raw historical text
- [ ] Unchanged lines, added lines, and removed lines are visually distinguishable
- [ ] Colors used for the diff come from existing theme CSS variables (light/dark both look correct)
- [ ] Restoring still works exactly as before (issue 03 of `.scratch/note-history/` — this doesn't change restore behavior, only the preview)
- [ ] A `NoteHistoryPanel` test asserts the diff output for a known before/after pair (e.g. one line changed, one added, one removed)
- [ ] `npm run test` passes

## Blocked by

- `.scratch/note-history-module/issues/01-extract-note-history-panel-component.md`
