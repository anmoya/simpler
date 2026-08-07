# 10 — Add manual Sync against a Git remote

**What to build:** The user can manually sync a Git-backed Workspace through grouped commit, pull/rebase, and push behavior using local Git remotes in tests, without force push or discarding local changes.

**Blocked by:** 03 — Edit Raw Markdown with Local Save; 09 — Add Git status through the system Git service

**Status:** ready-for-agent

- [ ] The user can trigger manual Sync for a Git-backed Workspace with a remote.
- [ ] Local changes are committed as a grouped Sync checkpoint.
- [ ] Sync pulls remote changes before pushing local changes.
- [ ] Sync pushes local committed changes to the configured remote.
- [ ] Sync never force pushes.
- [ ] Sync never discards local changes automatically.
- [ ] Sync failure leaves Local Save content intact and reports an actionable status.
- [ ] Tests use local Git repositories/remotes and cover successful sync, no-op sync, pull-before-push, and failure handling.
