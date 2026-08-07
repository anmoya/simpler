# MVP readiness record

Date: 2026-08-05  
Scope: Linux-first Simpler MVP

## Verified in this checkout

| Workflow | Evidence |
| --- | --- |
| Open a local Workspace; create folders and Markdown notes; edit Raw Markdown; reopen the last note | Native Workspace/filesystem tests and App tests |
| Classic layout, Command Palette, Command Help, file search, and Global Search | 23 `ClassicShell` tests, 3 `MarkdownEditor` tests, and App search acceptance test |
| Workspace metadata and recent Workspaces | Native metadata/last-note tests and App recent-Workspace test |
| Git status, manual Sync, automatic Sync, and offline/error preservation | Native Git tests, 6 scheduler tests, and App Sync tests |
| Conflict detection plus local, remote, and manual resolution | Native tests use temporary Git repositories and a local bare remote; App test verifies the conflict controls |
| GitHub connect and clone command contracts | Native adapter tests and App acceptance tests validate URL handling, clone opening, connection success, and reported errors |
| Production frontend and Linux packages | `npm run build` completed; Tauri produced both `.deb` and `.rpm` bundles |

The complete automated suite passed during this readiness pass: 46 frontend tests and 37 native Rust tests.

## Remaining environment-dependent checks

- Live GitHub Device Flow is not run by automated tests. It needs a registered OAuth client ID supplied as `SIMPLER_GITHUB_CLIENT_ID`, network access, and an available `secret-tool` keychain.
- Live GitHub clone/connect needs a reachable repository and credentials appropriate for its URL (HTTPS or SSH). Core Sync and conflict behavior are nevertheless exercised against local Git remotes.
- This pass builds Linux `deb` and `rpm` bundles only, as configured for the Linux-first MVP. Installation and desktop smoke testing of those packages should be performed on the target distribution before release.
- Vite reports a production JavaScript chunk above 500 kB after minification. It does not block the MVP build, but code splitting is a post-MVP performance improvement worth tracking.

## Manual release smoke test

1. Follow the clean-checkout setup in the [README](../README.md), using `npm run tauri:dev` (desktop Tauri mode).
2. Open an empty folder as a Workspace, create a folder and a note, write Markdown, close, and reopen it.
3. Use `Ctrl/Cmd+K` for Command Palette, `Ctrl/Cmd+/` for Command Help, and test both current-file and Global Search.
4. With a disposable Git remote, use **Sync** after a local edit and confirm the status changes to **Sincronizado**. Make divergent commits in a second clone and confirm the conflict options preserve a deliberate local, remote, or manually edited choice.
5. With a configured OAuth client, complete Device Flow from Settings and exercise **Conectar remoto GitHub** and **Clonar desde GitHub** with a disposable repository.
