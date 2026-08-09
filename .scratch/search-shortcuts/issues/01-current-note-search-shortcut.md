# Current-note search: hide by default, Ctrl+F to open, Esc to close

Status: done

## Parent

`.scratch/search-shortcuts/spec.md`

## What to build

In `ClassicShell.tsx`, change `.file-search` (the "Current note search" input in `.editor-toolbar`, currently always rendered) to be hidden by default and shown only while active.

- Ctrl/Cmd+F: if a note is open, show the search input and focus it (select any existing text so typing replaces it, matching VSCode). Add to the existing `handleKeyDown` in `ClassicShell.tsx` alongside the other modifier-key branches; note that plain Ctrl+F should not fire when focus is inside an input/textarea/CodeMirror that might want native find behavior — confirm this doesn't conflict with the browser/webview's own find (it shouldn't in a Tauri webview without devtools find enabled, but verify).
- Esc while the search input (or its match-count/prev/next controls) has focus, or while it's open: hide it, clear focus back to the editor. Don't clear the query text itself when hiding — reopening with Ctrl+F should restore the last query and match state, matching typical editor find-bar behavior (only clear on explicit user action, if any is added later).
- Keep existing match navigation (`goToPreviousFileMatch`/`goToNextFileMatch`) and the search-jump behavior in `MarkdownEditor` unchanged — this only changes visibility/focus, not search logic.

## Acceptance criteria

- [ ] `.file-search` is not visible when a note is first opened
- [ ] Ctrl/Cmd+F with a note open shows and focuses the search input
- [ ] Esc while the search is open hides it and returns focus to the editor
- [ ] The match count and prev/next buttons still work identically to today while the search is open
- [ ] Hiding and reopening the search preserves the last query (not cleared on hide)
- [ ] Ctrl/Cmd+F with no note open does nothing (input stays disabled/hidden, matching today's `disabled={!activeNotePath}`)
- [ ] A `ClassicShell` test covers: shortcut opens and focuses, Esc closes and returns focus, query persists across hide/show
- [ ] `npm run test` passes

## Blocked by

- None — can start immediately.
