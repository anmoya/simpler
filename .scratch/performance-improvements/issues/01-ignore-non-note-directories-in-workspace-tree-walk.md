# 01 — Ignore non-note directories in the Workspace Tree walk

**What to build:** Opening or refreshing a Workspace that contains large non-note directories (e.g. `node_modules`, `target`, `dist`, `build`, `vendor`) is fast, because the Workspace Tree walk skips descending into them entirely, instead of walking every file inside them just to discard the result. The Workspace Tree the user sees is unchanged — those directories never contributed visible entries before, and still don't.

**Blocked by:** None — can start immediately

**Status:** implemented

- [x] The Workspace Tree walk (`read_workspace_tree`) skips a fixed, code-level list of common non-note directory names (e.g. `node_modules`, `target`, `dist`, `build`, `vendor`) without descending into them, the same way it already skips hidden/internal (`.`-prefixed) names.
- [x] A Rust unit test builds a tempdir fixture with note files alongside an ignored directory containing a large/deep fake subtree, and asserts the resulting tree excludes the ignored directory's contents and that the walk doesn't pay the cost of descending into it.
- [x] The resulting Workspace Tree for a Workspace with no ignored directories is byte-for-byte identical to today's output (no regression for the common case).
- [x] Existing Workspace Tree tests continue to pass.
