# 15 — Add the advanced Git view

**What to build:** Advanced users can inspect repo, branch, latest commit, pending changes, recent Sync events, auth state, and manual recovery actions without exposing Git as the primary UI.

**Blocked by:** 10 — Add manual Sync against a Git remote; 12 — Handle Sync conflicts safely; 14 — Connect and clone existing GitHub repositories

**Status:** ready-for-agent

- [ ] The main UI continues to present simple Sync statuses.
- [ ] An advanced view shows the connected repository and branch.
- [ ] The advanced view shows latest commit and pending changes.
- [ ] The advanced view shows recent Sync events and errors.
- [ ] The advanced view shows GitHub auth state.
- [ ] The advanced view exposes appropriate manual recovery actions without force push.
- [ ] Tests cover advanced view rendering from Git, Sync, and auth states.
