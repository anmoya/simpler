# 09 — Add Git status through the system Git service

**What to build:** The app detects whether the Workspace is Git-backed and shows simple Sync statuses while keeping technical Git details behind an internal service boundary.

**Blocked by:** 02 — Open a Workspace and render the Workspace Tree

**Status:** resolved

- [x] The app detects whether the active Workspace is a Git repository.
- [x] The app detects whether a Git-backed Workspace has a configured remote.
- [x] The app maps Git state to simple Sync statuses for the main UI.
- [x] The system `git` executable is invoked through an internal service boundary.
- [x] Missing or failing Git is reported without breaking Local Save.
- [x] Tests cover non-Git Workspace status, clean repo status, changed repo status, missing remote, and Git command failure.

## Comments

Implemented Git status detection behind the native `git/status` command:

- Added a Rust Git service boundary that invokes the system `git` executable and maps repository, remote, clean, changed, missing-remote, and non-Git states to product Sync statuses.
- Wired the React app to refresh Git status after opening a Workspace without making Workspace open or Local Save depend on Git.
- Added typed frontend command support for `git/status` and UI labels for `Sincronizado`, `Cambios locales`, `Sin Git`, `Sin remoto`, and `Error`.
- Added native tests for non-Git Workspace status, clean repo status, changed repo status, missing remote, and Git command failure.
- Added app tests for status rendering and Git failure while preserving the opened Workspace.

Verification:

- `rtk npm run test -- src/app/App.test.tsx`
- `rtk npx tsc --noEmit`
- `rtk npm run test`
- `rtk npm run test:native`
- `rtk npm run build`
- `rtk npm run tauri -- build --debug --no-bundle`
