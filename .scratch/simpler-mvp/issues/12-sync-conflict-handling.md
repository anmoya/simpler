# 12 — Handle Sync conflicts safely

**What to build:** Conflicts pause Sync, show conflicted files, and let the user choose local, remote, or manual conflict-marker resolution before Sync resumes.

**Blocked by:** 10 — Add manual Sync against a Git remote

**Status:** ready-for-agent

- [x] Sync detects Git conflicts and moves into a conflict status.
- [x] Auto Sync pauses while conflicts exist.
- [x] The UI lists conflicted Markdown files.
- [x] The user can choose the local version for a conflicted file.
- [x] The user can choose the remote version for a conflicted file.
- [x] The user can open and manually edit conflict markers.
- [x] After all conflicts are resolved, Sync can commit the resolution and continue.
- [x] Tests cover conflict detection, pause behavior, local resolution, remote resolution, manual resolution, and Sync resume.

## Comments

Implemented conflict-aware Git Sync using the existing system Git adapter. Sync now returns conflicted Markdown paths, pauses automatic and manual scheduling, and resumes the rebase and push after a local, remote, or manually edited resolution. Verified with `rtk npm run test`, `rtk npm run build`, and `rtk npm run test:native`.
