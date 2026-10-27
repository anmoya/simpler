# 06 — Add caching/indexing to Global Search

**What to build:** Running a Global Search query reads from an in-memory index built from the Workspace Tree's note files, instead of re-walking the Workspace and re-reading every note's content from disk on every query. The index is built on Workspace open and kept correct as notes are saved, created, deleted, or moved, and as Sync/conflict resolution change the Workspace on disk.

**Blocked by:** 02 (index needs the Local Save flush signal), 03 (index needs the create/delete/move update signal)

**Status:** implemented

- [x] An in-memory search index (native side) is built from the Workspace's note files when a Workspace is opened.
- [x] The index is updated incrementally on: Local Save flush (ticket 02), single-file create/delete/move (ticket 03), and rebuilt on Sync/conflict resolution (which already do a full Workspace Tree rebuild).
- [x] `search_markdown_files` reads from the index instead of re-walking and re-reading every note file per query.
- [x] Rust unit tests against a tempdir fixture: index built on open returns correct results; index stays correct after a note is created/edited/deleted/moved, matching a from-scratch rebuild.
- [x] Existing Global Search tests continue to pass, updated only where they assert the old unindexed-scan implementation detail.
