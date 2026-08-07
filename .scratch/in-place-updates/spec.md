Status: ready-for-agent

# In-Place Updates via GitHub Releases

## Problem Statement

Simpler has no way to update itself. A user on v1.1 who wants v1.2 has to notice a new release exists, download it, and manually replace the old install — for `.deb`/`.rpm` installs that means re-running the system package manager, and there's currently no signal inside the app that a new version even exists. There's also no release pipeline at all yet: no git remote, no CI, no versioned build/publish process, and the two bundle formats Simpler builds today (`deb`, `rpm`) can't be replaced in-place by anything running as that package — only an AppImage can swap itself out while running.

## Solution

Stand up a release pipeline on a public GitHub repo: pushing a `vX.Y.Z` tag triggers GitHub Actions to build Linux bundles (`deb`, `rpm`, and a new `AppImage` target), sign the AppImage and its update manifest with an ed25519 keypair held as a GitHub Actions secret, and publish everything to a GitHub Release. The app embeds `tauri-plugin-updater`, checks that Release's manifest in the background shortly after opening (throttled so it doesn't check on every launch), and — when running as an AppImage — downloads a newer version automatically and shows a non-blocking "Update ready — restart to install" notice that the user dismisses on their own schedule. When running as a `.deb`/`.rpm` install (detected at runtime, since those can't self-replace), the same "update available" notice appears but links out to the GitHub Release page instead of offering one-click install. macOS is out of scope for this round — no Apple Developer account exists yet, so there is nothing to sign/notarize a macOS build with, but the update-manifest design doesn't preclude adding a signed macOS target later without reworking the Linux pipeline or the signing key.

## User Stories

1. As a user running the AppImage build, I want the app to check for a new version shortly after I open it, so that I find out about updates without having to go looking.
2. As a user running the AppImage build, I want update checks to be throttled, so that I'm not hitting GitHub's API on every single launch.
3. As a user on the latest version, I want the update check to be silent and produce no visible notice, so that the common case stays out of my way.
4. As a user running the AppImage build with a newer version available, I want the app to download it in the background without interrupting what I'm doing, so that I don't have to babysit a progress bar.
5. As a user whose update has finished downloading, I want a clear, non-blocking notice that a restart will install it, so that I can choose when to restart rather than being forced.
6. As a user who dismisses or ignores the "update ready" notice, I want the app to keep working normally and install the update whenever I do eventually restart, so that I'm never blocked against my will.
7. As a user running a `.deb`/`.rpm` install with a newer version available, I want to see the same kind of "update available" notice, so that I'm not silently left on an old version just because of how I installed the app.
8. As a user running a `.deb`/`.rpm` install, I want that notice to link to the GitHub Release instead of offering to install automatically, so that I'm not shown a button that can't actually work for my install type.
9. As a user, I want the update to be cryptographically verified before it's applied, so that a compromised or spoofed download can't silently replace my app.
10. As the maintainer, I want to trigger a release by pushing a version tag, so that publishing a new version doesn't require manual artifact building or uploading.
11. As the maintainer, I want a single command/script to bump the version everywhere it needs to change, so that `package.json` and `src-tauri/tauri.conf.json` can't drift out of sync with each other.
12. As the maintainer, I want the update-signing private key to live only in GitHub Actions secrets, so that it's never exposed on a local machine or committed to the repo.
13. As the maintainer, I want CI to build and sign all three Linux bundle formats (`deb`, `rpm`, `AppImage`) on every tagged release, so that all three install paths stay available from one pipeline.
14. As the maintainer, I want the design to leave room for a signed/notarized macOS target later, so that adding macOS doesn't require re-architecting the update mechanism.

## Implementation Decisions

- **Repo/hosting**: project moves to a public GitHub repo (no remote configured today); GitHub Releases is the update-manifest and artifact host, requiring no separate infrastructure.
- **Bundle targets**: add `appimage` to the existing `bundle.targets` (`deb`, `rpm`) in `src-tauri/tauri.conf.json`. `deb`/`rpm` remain manual-update only; only the AppImage build participates in self-update.
- **Update plugin**: adopt the official `tauri-plugin-updater` (Rust crate + JS bindings). Its endpoint/manifest points at the GitHub Release for the repo. Signature verification is mandatory and built into the plugin — configure the embedded public key in `tauri.conf.json`.
- **Signing key**: generate one ed25519 keypair via the Tauri CLI signer once; the private key is stored as a GitHub Actions secret and used only inside the release workflow; the public key is committed in `tauri.conf.json`.
- **CI/release workflow**: new GitHub Actions workflow triggered on push of tags matching `v*.*.*`. Builds all three Linux bundle targets, signs the AppImage + manifest with the stored key, and publishes a GitHub Release with all artifacts attached (this is the standard `tauri-action` release flow).
- **Version bump script**: a new script (e.g. `npm run release -- <version>`) updates the version field in both `package.json` and `src-tauri/tauri.conf.json` together, so they can't drift; running it is a precondition for cutting a release tag. Out of scope for this spec whether it also commits/tags automatically vs. leaving that to the maintainer.
- **`updateScheduler` (new frontend module, `src/app/updateScheduler.ts`)**: a pure state machine, structurally parallel to `automaticSyncScheduler.ts` — no React, no direct native calls, driven by explicit inputs and exposing callbacks the caller wires up. Responsibilities:
  - Decide when to fire an update check: shortly after `workspaceOpened`-equivalent (app start), throttled so repeat checks within a short window are skipped.
  - Track states: idle → checking → up-to-date | update-available → (AppImage only) downloading → update-ready.
  - Expose the current state and install-kind-aware guidance (whether one-click install is available) to the caller so `App.tsx`/`ClassicShell.tsx` can render the notice without embedding this logic in components.
  - `App.tsx` wires the scheduler's `requestCheck`/`requestDownload` callbacks to new native command wrappers, the same way it wires `automaticSyncScheduler` to `gitSync` today.
- **Native command additions (`src/native/commands.ts` + `src-tauri/src/lib.rs`)**: new domain (e.g. `update`) on the existing `native_command` bus, following the payload-struct → handler-fn → dispatch-branch pattern already used for `workspace`/`filesystem`/`git`/`auth`. Actions needed:
  - `checkForUpdate` — wraps `tauri-plugin-updater`'s check, returns whether a newer version exists and its version/notes.
  - `downloadAndInstallUpdate` — wraps the plugin's download+install, used only when install kind is AppImage.
  - `getInstallKind` — a pure Rust function (testable without a real filesystem/environment via a small trait or injected env lookup, following the existing `GitCommandRunner`-style seam) that reports `appimage` vs `packaged` by checking for the `APPIMAGE` environment variable at runtime. Frontend uses this to decide whether the update notice offers one-click install or a link to the GitHub Release.
- **Notice UI**: a small addition to the existing UI shell (exact placement — status area near sync status — left to the implementing agent) showing update state (`update-available` / `downloading` / `update-ready`) with either an "Install & Restart" action (AppImage) or a "View Release" link (deb/rpm).
- **macOS**: no bundle target, no signing, no CI job added in this round. The updater's manifest/config shape should not need restructuring to add a macOS target later — flagged as a note for whoever picks up macOS, not built now.

## Testing Decisions

- Tests should exercise `updateScheduler.ts` the same way `automaticSyncScheduler.test.ts` (if present) or similar scheduler tests exercise `automaticSyncScheduler.ts`: inject fake timers and fake callbacks, assert on call sequencing and state transitions, not on any real native/network behavior. This is the primary seam and should carry the bulk of the test coverage for this feature.
- `getInstallKind` (Rust) should be unit-tested as a pure function against injected/fake environment lookups, following the existing pattern of testing pure Git/keychain logic against fake trait implementations rather than shelling out or touching real env vars.
- The native command wrappers (`checkForUpdate`, `downloadAndInstallUpdate`) and the `native_command` dispatch branches are thin passthroughs to `tauri-plugin-updater` — do not attempt to unit test the plugin's own update/download/signature-verification behavior; that's Tauri's responsibility, not ours.
- The GitHub Actions release workflow and version-bump script are build tooling, not runtime logic — validate them by actually cutting a real tag/release during implementation rather than writing unit tests for the workflow YAML.

## Out of Scope

- macOS build, signing, notarization, or update support (deferred — no Apple Developer account).
- Windows support (not a target).
- Auto-update for `.deb`/`.rpm` installs (not possible without switching package format; those installs stay on manual/link-out updates).
- Automatic silent install without user confirmation (rejected in favor of "download automatically, install only on user-confirmed restart").
- Resolving what happens to in-flight unsaved edits during an update-triggered restart — assumed covered by existing Local Save behavior, not new logic for this feature.
- A pre-release/beta channel — only a single stable release channel is being built.

## Further Notes

- Related ADR: `docs/adr/0012-tauri-updater-with-appimage-for-linux.md` (to be written alongside implementation) should record why AppImage was added specifically for updater support while `deb`/`rpm` remain manual, and why macOS was deferred.
- Version fields exist today in two places (`package.json`, `src-tauri/tauri.conf.json`), both still at `0.1.0` — the version-bump script is a prerequisite for the first tagged release, not optional polish.
