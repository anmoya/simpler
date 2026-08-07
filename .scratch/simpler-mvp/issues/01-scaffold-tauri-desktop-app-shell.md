# 01 — Scaffold the Tauri desktop app shell

**What to build:** A runnable Linux-first Tauri app using React, TypeScript, Vite, basic routing/state structure, and test harnesses for UI/native behavior.

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] The app can be installed and run locally as a Tauri desktop app on Linux.
- [x] The UI uses React, TypeScript, and Vite.
- [x] The app has a minimal classic shell with space for sidebar, editor, and status area.
- [x] The native side exposes a typed command boundary for future Workspace, filesystem, Git, and auth operations.
- [x] UI and native test harnesses are present and runnable.
- [x] The implementation respects the existing ADRs for Tauri, React/TypeScript/Vite, and Linux-first portability.

## Comments

- Implemented the initial Tauri 2 + React + TypeScript + Vite app shell.
- Added a typed native command boundary covering Workspace, filesystem, Git, and auth domains.
- Added UI and native test harnesses.
- Verified `npm run test:ui`, `npm run build`, `npm run test:native`, and `npm run tauri -- build`.
