# History panel UI

Status: done

## Parent

`.scratch/note-history/spec.md`

## What to build

A history panel reachable from the note editor (e.g. an action alongside existing note-level actions in `ClassicShell`) that lists the commits returned by `note-history` (issue 01) for the currently open note, and lets the user select an entry to preview its content at that point in time.

Add a second native `Git` action (e.g. `note-content-at-commit`) taking a workspace path, note relative path, and commit id, returning the file's content at that commit (`git show <commit>:<path>`), following the same pure-function/fake-runner testing pattern as issue 01.

The preview is read-only in this slice — no editing, no restore action yet (that's issue 03). Show it as read-only text, reusing the app's existing Markdown rendering if there's a convenient one, otherwise plain preformatted text is acceptable for this slice.

## Acceptance criteria

- [ ] Opening the history panel for a note lists its commit history (date + summary) using `note-history`
- [ ] Selecting an entry shows that version's content read-only, using `note-content-at-commit`
- [ ] A note with no history shows an empty/appropriate state, not an error
- [ ] Native unit test for `note-content-at-commit` against a fake `GitCommandRunner`
- [ ] An App/component test opens the history panel and asserts a past version's content renders on selection
- [ ] `npm run test` and `npm run test:native` pass

## Blocked by

- `.scratch/note-history/issues/01-list-note-commit-history.md`
