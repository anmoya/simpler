# Extract note history panel to its own component

Status: done

## Parent

`.scratch/note-history-module/spec.md`

## What to build

Extract the `.note-history` `<aside>` block (currently inline in `ClassicShellProps`/`ClassicShell` around lines 43–48 and 833–875 of `src/components/ClassicShell.tsx`) into a new `src/components/NoteHistoryPanel.tsx` component, following the file-per-component convention already used by `MarkdownEditor.tsx`.

Pure refactor — no behavior change. The component takes the same data `ClassicShell` currently threads through (`noteHistoryOpen`, `noteHistoryEntries`, `noteHistoryPreview`, `noteHistoryLoading`, `noteHistoryError`, `selectedNoteHistoryCommitId`, plus the `onSelectNoteHistoryEntry`/`onCloseNoteHistory`/`onRestoreNoteHistoryEntry` callbacks already in scope) as props, and `ClassicShell` renders `<NoteHistoryPanel ... />` in place of the inline block. Move (don't duplicate) any colocated test coverage for this block into a new `NoteHistoryPanel.test.tsx`, following the `MarkdownEditor.test.tsx` colocation convention.

## Acceptance criteria

- [ ] `NoteHistoryPanel.tsx` exists and renders identically to the current inline markup (same DOM structure/classes/ARIA attributes)
- [ ] `ClassicShell.tsx` no longer contains the note-history JSX inline, only the `<NoteHistoryPanel />` usage
- [ ] All existing note-history-related tests still pass, relocated to `NoteHistoryPanel.test.tsx` where they test the component directly
- [ ] No change in visual output or behavior (manual smoke check: open a note, open history, select an entry, restore — same as before)
- [ ] `npm run test` passes

## Blocked by

- None — can start immediately.
