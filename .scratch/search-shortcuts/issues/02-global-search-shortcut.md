# Global search: hide by default, Ctrl+Shift+F to open, Esc to close

Status: done

## Parent

`.scratch/search-shortcuts/spec.md`

## What to build

Apply the same pattern as issue 01 to `.global-search` (sidebar, `role="search"` block around line 643 in `ClassicShell.tsx`): hidden by default, shown and focused via Ctrl/Cmd+Shift+F, hidden again on Esc with focus returned to the editor (or, if no note is open, to wherever focus was before opening search).

If the sidebar is in its collapsed icon-rail state (from `.scratch/collapsible-sidebar/`), opening global search via this shortcut should expand the sidebar enough to show the search input — reuse the manual-expand path from that feature rather than inventing a second expansion mechanism.

Keep existing global search result list, navigation, and `onSelectGlobalSearchResult` behavior unchanged — this only changes visibility/focus.

## Acceptance criteria

- [ ] `.global-search` input is not visible by default
- [ ] Ctrl/Cmd+Shift+F shows and focuses the global search input
- [ ] Esc while global search is open hides it and restores focus appropriately
- [ ] Existing result list, click-to-navigate, and result rendering behavior is unchanged while search is open
- [ ] Hiding and reopening preserves the last query and results (not cleared on hide)
- [ ] If the sidebar is collapsed to the icon rail, triggering this shortcut expands it so the search is visible
- [ ] A `ClassicShell` test covers: shortcut opens and focuses, Esc closes, query persists across hide/show
- [ ] `npm run test` passes

## Blocked by

- `.scratch/search-shortcuts/issues/01-current-note-search-shortcut.md`
