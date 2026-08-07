# 11 — Add automatic Sync scheduling

**What to build:** The app groups Local Save changes into automatic commits and syncs after inactivity/intervals plus open/close/manual triggers, while continuing to work offline.

**Blocked by:** 10 — Add manual Sync against a Git remote

**Status:** resolved

- [x] Local Save changes schedule Sync without pushing on every keystroke.
- [x] Sync can run after a short inactivity debounce.
- [x] Sync can run periodically during continued writing.
- [x] Sync can run on Workspace open when local changes are protected.
- [x] Sync can run on app close when possible.
- [x] Offline or remote failures preserve local writing and schedule retry.
- [x] The main UI communicates pending, syncing, synced, and error states.
- [x] Tests cover debounce behavior, periodic behavior, open/close triggers, offline failure, and retry state.

Implemented automatic Sync scheduling in the frontend:

- Added a scheduler module that groups Local Save changes behind a 45-second inactivity debounce, forces Sync during continued writing on a 5-minute interval, retries failed Sync after 60 seconds, and exposes open/close/manual triggers.
- Wired Local Save, filesystem changes, Workspace open, manual Sync, and app close/beforeunload through the scheduler while keeping Local Save independent from Git/network success.
- Preserved the existing main Sync status model for pending, syncing, synced, and error states.
- Added focused scheduler tests plus App integration coverage for open, close, automatic failure preservation, and manual behavior.
