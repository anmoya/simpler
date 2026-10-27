Status: implemented

# Performance: editor typing, Global Search, and Workspace Tree on large Workspaces

## Problem Statement

The app feels laggy in everyday use, in three related ways:

1. Typing in a note feels sluggish, especially in larger notes.
2. Global Search feels sluggish, especially in larger Workspaces.
3. Opening or navigating a large Workspace (many files/folders, or a Workspace containing large non-note directories such as `node_modules`) makes the Workspace Tree sidebar feel sluggish, both on initial open and afterward.

Investigation of the current code (Tauri 2 + React/TS) found this is caused by app-level inefficiencies, not an inherent limitation of Tauri or the webview:

- Every keystroke in the editor triggers a full native IPC round-trip and a synchronous `fs::write` of the whole note to disk (no debounce on Local Save).
- The top-level `AppState` object updates on every keystroke, and the main shell component (`ClassicShell.tsx`) has almost no memoization, so the entire sidebar/Workspace Tree/Command Palette re-renders on every keystroke even though only the editor's content changed.
- Global Search re-walks and re-reads the content of every note file in the Workspace on every query, with no cache or index.
- Building the Workspace Tree walks every directory under the Workspace root with no ignore-list beyond hidden/internal (`.`-prefixed) names, so non-note directories like `node_modules`, `target`, `dist`, or `vendor` are fully traversed even though none of their contents ever appear in the tree.
- The Workspace Tree is rebuilt from scratch and swapped in wholesale after every Sync, conflict resolution, and single-file filesystem operation (create/delete/move), even when only one file changed.
- Collapsed folders in the Workspace Tree remain fully mounted in the DOM (hidden via `inert`/`aria-hidden` for a CSS transition), so a large Workspace means thousands of DOM nodes regardless of collapse state, with no virtualization.

## Solution

Address each cause directly, at the seam closest to where it lives, without changing any user-visible behavior of Local Save, Global Search, or the Workspace Tree:

- Debounce Local Save so a note's content is written to disk after typing pauses, not on every keystroke, following the same "independent state machine, not driven by React state" pattern already used by `automaticSyncScheduler.ts`.
- Move the editor's live content out of the shared `AppState` so that typing no longer triggers a re-render of the sidebar, Workspace Tree, or Command Palette. The editor owns its own content and reports it upward only when a save is due.
- Extend the Workspace Tree's directory walk to skip common non-note directories, the same way it already skips hidden/internal names.
- Replace the "rebuild the whole tree and swap it in" pattern after single-file create/delete/move with an incremental update to just the affected node(s). Sync and conflict resolution, which can touch an arbitrary number of files, keep doing a full rebuild.
- Add caching/indexing to Global Search so a query does not require re-reading every note's content from disk every time.
- Stop fully mounting collapsed folders' subtrees in the Workspace Tree DOM; only mount what's actually expanded (or otherwise avoid rendering DOM nodes for collapsed content), while preserving the existing collapse/expand CSS transition and behavior from Workspace Tree collapsible folders (see `.scratch/workspace-tree-collapse/spec.md`).

None of this changes what the user sees happen when they type, search, or browse the Workspace Tree — it only changes how much work the app does to produce the same result.

## User Stories

1. As a user, when I type in a note, the app responds instantly, with no perceptible input lag, regardless of note size.
2. As a user, my edits are still saved to disk automatically after I stop typing, within the same practical time window as today (i.e. Local Save still feels "automatic," just not on every keystroke).
3. As a user, if the app is closed or crashes shortly after I stop typing, at most a small, bounded amount of recent typing is at risk of not being saved (same trade-off any debounced-save app makes).
4. As a user, browsing or interacting with the sidebar (expanding/collapsing folders, clicking a note) stays responsive while I'm actively typing in the editor.
5. As a user, running a Global Search query returns results quickly, even in a Workspace with many notes.
6. As a user, running repeated or refined Global Search queries (e.g. typing more characters) doesn't get slower as the Workspace grows.
7. As a user, opening a large Workspace — including one with large non-note directories like `node_modules` — loads quickly and doesn't pause the UI.
8. As a user, the Workspace Tree never shows files or folders from ignored non-note directories (this is existing, unchanged behavior — the ignored directories never contributed visible tree entries; they're just walked more cheaply now).
9. As a user, creating, deleting, or moving a single file updates the Workspace Tree sidebar quickly, without a visible full-tree refresh/flicker.
10. As a user, after a Sync or conflict resolution, the Workspace Tree still fully reflects the resulting state of the Workspace on disk (no regression in correctness for the cases that legitimately need a full rebuild).
11. As a user with a Workspace containing thousands of files, scrolling and expanding/collapsing the Workspace Tree stays smooth, instead of degrading as the Workspace grows.
12. As a user, collapsing a folder with many descendants immediately reduces the sidebar's rendering cost, not just its visible height.
13. As a developer, I can still test Local Save's debounce/timing behavior without spinning up React or a real filesystem, the same way `automaticSyncScheduler.ts` is tested today.
14. As a developer, I can still test the Workspace Tree's ignore-list and incremental-update logic without a real Tauri runtime, the same way other native logic in this repo is tested against fakes/tempdirs.

## Implementation Decisions

- **Local Save debounce**: extract the write-to-disk step currently inline in `changeNoteContent` (`App.tsx`) into a small, independently-testable debounce/state-machine module, parallel in spirit to `automaticSyncScheduler.ts` (not merged into it — Local Save and Sync scheduling are different concerns already modeled separately per `CONTEXT.md`). The editor keeps updating its own live buffer on every keystroke (so typing itself is instant); the module decides when that buffer actually gets flushed to `writeNote`. Existing debounce/timing conventions from `automaticSyncScheduler.ts` (e.g. its use of a scheduler abstraction rather than raw `setTimeout` sprinkled in components) should be followed for consistency.
- **Editor content out of `AppState`**: `MarkdownEditor.tsx` (or a thin wrapper around it) becomes the owner of the actively-edited note's live content, rather than that content living in the shared `AppState` object that `ClassicShell.tsx` and its descendants read from. `App.tsx`/`ClassicShell.tsx` are notified of content changes only when a save is flushed (via the debounce module above), not on every keystroke. Switching the active note still goes through the existing `AppState`-driven flow.
- **Workspace Tree ignore-list**: extend `is_hidden_or_internal` (or add a sibling check alongside it) in the workspace tree walk (`read_workspace_tree`) with a fixed list of common non-note directory names to skip entirely (not descend into), e.g. `node_modules`, `target`, `dist`, `build`, `vendor`, `.git`-adjacent tool directories not already covered by the hidden-name check. This list is a code-level constant, not user-configurable, for this spec.
- **Incremental Workspace Tree updates**: the native filesystem handlers behind single-file create/delete/move actions return enough information (the affected path(s) and resulting node data) for the frontend to patch the existing in-memory tree rather than receiving and swapping in a full rebuilt tree. Sync and conflict resolution are explicitly out of scope for this optimization and continue to trigger a full `read_workspace_tree` rebuild, since they can touch an unbounded set of files.
- **Global Search caching/indexing**: add an in-memory cache/index (built from the Workspace Tree's note files) on the native side, populated on Workspace open and kept in sync with the same create/delete/move/save events that already update the Workspace Tree, so a search query reads from the index rather than re-walking and re-reading every note file from disk. Exact index shape (e.g. filename + content keyed by path) is left to the implementing agent, but it must stay correct after every operation that changes note content or the tree (Local Save flush, create/delete/move, Sync, conflict resolution).
- **Workspace Tree DOM/virtualization**: collapsed folders' descendant DOM nodes are not mounted (or are otherwise excluded from layout/paint cost), rather than the current approach of mounting everything and hiding collapsed subtrees via `inert`/`aria-hidden`. The existing expand/collapse CSS transition and behavior defined in Workspace Tree collapsible folders (`.scratch/workspace-tree-collapse/spec.md`) must be preserved — this is a rendering-strategy change, not a UX change. The implementing agent chooses between lazy-mounting subtrees on expand vs. introducing a virtualization library; either is acceptable as long as collapsed content isn't in the DOM and the transition still works.
- No changes to `.simpler/workspace.json` or `.simpler/local/state.json` schemas.
- No changes to the Sync flow, conflict resolution flow, or `automaticSyncScheduler.ts`'s own scheduling logic.

## Testing Decisions

- Good tests here assert observable behavior (what gets written to disk and when, what the resulting tree/search-index state is, what's in the rendered DOM) rather than internal implementation details (e.g. don't assert a specific debounce timer implementation, just that a flush happens after the debounce window and not before).
- **Local Save debounce module**: Vitest unit tests against a fake clock/fake write function, following `automaticSyncScheduler.ts`'s existing test pattern (state machine tested independent of React) — cover rapid-keystroke coalescing, flush-after-pause, and flush-on-note-switch/close.
- **Editor content isolation**: Vitest + Testing Library test asserting that typing in the editor does not cause sidebar/Workspace Tree subtree components to re-render (e.g. via a render-count spy), plus existing/expected coverage that content still reaches `AppState`/disk after a flush.
- **Workspace Tree ignore-list**: Rust unit test building a tempdir fixture containing both note files and an ignored directory (e.g. a fake `node_modules`), asserting the resulting tree excludes the ignored directory's contents and that the walk doesn't descend into it (e.g. by asserting on call count or by including a very deep/large ignored subtree and checking it doesn't affect output) — following this repo's existing pattern of Rust tests exercising pure functions.
- **Incremental Workspace Tree updates**: Rust and/or Vitest tests (whichever side owns the patch logic) asserting that a single create/delete/move produces a tree equivalent to a full rebuild, without invoking a full rebuild.
- **Global Search index**: Rust unit tests against a tempdir fixture — index built on open returns correct results; index stays correct after a note is created/edited/deleted/moved, matching a from-scratch rebuild.
- **Workspace Tree DOM/virtualization**: Testing Library test asserting collapsed folders' descendant note/folder elements are absent from the DOM (not just visually hidden), and that expanding a folder mounts them.
- Existing tests for Local Save, Global Search, Workspace Tree building/rendering, and Workspace Tree collapse/expand must continue to pass, updated only where they assert the old "every keystroke saves"/"full rebuild always"/"everything always mounted" behavior that this spec intentionally changes.

## Out of Scope

- Migrating off Tauri or reworking the native command bus architecture — this spec confirmed the lag is fixable at the app-code level, not a Tauri/webview limitation.
- Making the Workspace Tree's ignored-directories list user-configurable.
- Any change to Sync, conflict resolution, or GitHub auth flows.
- Any change to the Command Palette's own performance (only its incidental re-rendering due to editor keystrokes, addressed via the `AppState` change, is in scope).
- Any change to `.simpler/workspace.json` or `.simpler/local/state.json` schema/contents.
- Offline/full-text search improvements beyond making existing Global Search behavior fast (e.g. fuzzy ranking, search operators) — out of scope; this is a performance fix, not a search-feature change.

## Further Notes

Full investigation (with file:line references) was done in two passes against the current codebase:

1. Editor/save/search pass found: no debounce on Local Save (`MarkdownEditor.tsx` onChange → `App.tsx` `changeNoteContent` → `write_note_payload` in `lib.rs`), near-zero memoization in `ClassicShell.tsx`, and Global Search's unindexed full-workspace scan per query (`search_markdown_files` in `lib.rs`).
2. Sidebar/large-Workspace pass found: `read_workspace_tree`'s unbounded walk with no non-note-directory ignore-list, full-tree rebuild-and-swap after every Sync/conflict-resolution/single-file op, and `WorkspaceTree`'s always-mounted collapsed subtrees with no virtualization (`ClassicShell.tsx`).

Both passes concluded these are fixable app-level issues, not an inherent Tauri/webview limitation — no evidence of IPC-serialization or webview-rendering bottlenecks was found beyond what's described above. This conclusion informed a broader question the user raised (whether to move off Tauri to per-platform native apps for Linux/macOS/Windows); that question is intentionally not part of this spec and should be revisited separately once these fixes land, since it may no longer be motivated by the lag once this spec is implemented.
