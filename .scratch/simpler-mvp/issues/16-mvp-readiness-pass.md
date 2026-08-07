# 16 — Run MVP readiness pass

**What to build:** A final end-to-end pass verifies the Linux MVP workflows: open/create Workspace, write notes, search, command help, metadata, Git status, manual/auto Sync, conflict handling, and GitHub connect/clone.

**Blocked by:** 06 — Add Command Palette and Command Help; 07 — Add file search and Global Search; 08 — Persist Workspace metadata and recent Workspaces; 11 — Add automatic Sync scheduling; 12 — Handle Sync conflicts safely; 14 — Connect and clone existing GitHub repositories; 15 — Add the advanced Git view

**Status:** complete

- [x] The Linux MVP can be run from a clean checkout with documented setup.
- [x] A user can open a local Workspace, create notes/folders, edit Markdown, and restart without losing state.
- [x] A user can use Command Palette, Command Help, file search, and Global Search in the classic layout.
- [x] A user can manually sync and observe automatic Sync behavior against a test Git remote.
- [x] Conflict handling is verified end to end.
- [x] GitHub connect/clone flows are verified as far as practical in the local environment.
- [x] The final test suite passes.
- [x] Any remaining MVP gaps are documented clearly before implementation is considered complete.

## Completion notes

- Clean-checkout setup and desktop/browser startup modes: `README.md`.
- Verified workflows, exact test outcomes, package output, and live-environment limitations: `docs/mvp-readiness.md`.
