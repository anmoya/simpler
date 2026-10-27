# 03 — Incremental Workspace Tree updates for single-file operations

**What to build:** Creating, deleting, or moving a single file updates the Workspace Tree sidebar by patching just the affected node(s), instead of rebuilding and swapping in the entire tree. Sync and conflict resolution are unchanged and continue to trigger a full rebuild, since they can touch an unbounded set of files.

**Blocked by:** None — can start immediately

**Status:** implemented

- [x] The native filesystem handlers behind single-file create/delete/move actions return enough information (affected path(s) and resulting node data) for the frontend to patch the existing in-memory Workspace Tree.
- [x] `App.tsx`'s `applyFilesystemOperation` path patches the existing tree instead of replacing it wholesale with a freshly rebuilt one.
- [x] Sync (`gitSync`) and conflict resolution (`resolveConflict`) continue to call a full `read_workspace_tree` rebuild, unchanged.
- [x] A test (Rust and/or Vitest, whichever side owns the patch logic) asserts that a single create/delete/move produces a tree equivalent to a full rebuild, without invoking a full rebuild.
- [x] Existing Workspace Tree and filesystem-operation tests continue to pass, updated only where they assert the old "full rebuild after every op" behavior.
