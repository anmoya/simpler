# List commit history for a note

Status: ready-for-agent

## Parent

`.scratch/note-history/spec.md`

## What to build

Add a new `Git` domain action (e.g. `note-history`) that, given a workspace path and a note's relative path, returns the list of commits that touched that file, most recent first: `{ commitId, date, summary }` per entry (summary from the commit message's first line — Sync's own commits already have a consistent message shape, reuse whatever it already writes).

Follow the existing pattern: a pure function taking `&impl GitCommandRunner` (like `read_git_workspace_status`/`sync_git_workspace`), backed by `git log --follow -- <path>` (or equivalent) run through `SystemGitCommandRunner`, unit-tested against a fake `GitCommandRunner` per the Rust testing convention already used in this file — no shelling out to real git in tests. Add the payload/response types, the handler, and the `dispatch_native_command` branch, plus a typed wrapper in `src/native/commands.ts`.

If the workspace is not a Git-backed Workspace, return an empty list (or an explicit "not tracked" result) rather than an error — this is a normal, expected case (ADR: only Git-backed Workspaces are Sync-eligible).

No UI in this slice.

## Acceptance criteria

- [ ] `note-history` returns commits touching the given note path, newest first, with id/date/summary
- [ ] A note with no history (never synced) returns an empty list, not an error
- [ ] A non-Git-backed workspace returns an empty list (or explicit not-tracked result), not an error
- [ ] Unit tests use a fake `GitCommandRunner` (no real git subprocess) covering: multiple commits, zero commits, non-Git workspace
- [ ] `npm run test:native` passes

## Blocked by

- None — can start immediately.
