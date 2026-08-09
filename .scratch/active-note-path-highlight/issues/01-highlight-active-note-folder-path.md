# Highlight the folder path to the active note

Status: done

## Parent

`.scratch/active-note-path-highlight/spec.md`

## What to build

In `WorkspaceTree` (`src/components/ClassicShell.tsx`), while a note is open (`activeNotePath` set), apply an emphasis style (using `--color-accent`) to every folder row on the path from the Workspace root down to the folder directly containing the active note — not just the immediate parent, the whole ancestor chain.

`WorkspaceTree` already receives `activeFolderPath`; derive the ancestor-folder-path set from `activeNotePath` (split on `/`, build the cumulative folder paths) and pass it down (or compute it where `WorkspaceTree` already has access to the full tree/active note), applying a new CSS class (e.g. `note-tree__folder--active-path`) to matching `.note-tree__folder-row` elements, styled with `--color-accent` in `styles.css`.

This is independent of Accordion/Free Tree Mode and of the Focus Active Note action — it's always on whenever a note is open, regardless of tree mode or whether folders happen to be collapsed (a collapsed ancestor folder still gets the highlight; it just isn't expanded).

## Acceptance criteria

- [ ] With a note open at e.g. `R/B/note.md`, folder `R` and folder `B` both show the accent-colored emphasis; sibling folders `A`, `C` do not
- [ ] With no note open, no folder shows the emphasis
- [ ] Switching the active note to a different folder updates the highlighted path immediately
- [ ] The highlight uses `--color-accent` (not a new hardcoded color) so it adapts across Theme/Appearance Mode
- [ ] Works the same regardless of Accordion vs Free Tree Mode, and regardless of collapsed/expanded state of ancestor folders
- [ ] A `ClassicShell`/`WorkspaceTree` test asserts the correct folders carry the highlight class for a nested active note
- [ ] `npm run test` passes

## Blocked by

- None — can start immediately.
