Status: ready-for-human

Note: `update` domain + `getInstallKind` implemented and unit-tested (pure fn against injected `EnvLookup` trait). `checkForUpdate`/`downloadAndInstallUpdate` and the `tauri-plugin-updater` dependency/config were NOT added — they need the real public key + Release endpoint from issue 02, and wiring them also requires deciding how to make the sync `native_command` dispatch handle the plugin's async check/download calls (today's `dispatch_native_command` is fully synchronous). Left for whoever picks up issue 02.

# Native update commands (checkForUpdate, downloadAndInstallUpdate, getInstallKind)

## Parent

.scratch/in-place-updates/spec.md

## What to build

Add the `tauri-plugin-updater` dependency (Rust crate + JS bindings) and configure it in `src-tauri/tauri.conf.json` with the public key produced in issue 02, pointing its endpoint at the GitHub Releases update manifest for this repo.

Add a new `update` domain to the existing `native_command` bus (`src/native/commands.ts` + `src-tauri/src/lib.rs`'s `dispatch_native_command`), following the payload-struct → handler-fn → dispatch-branch pattern already used for `workspace`/`filesystem`/`git`/`auth`:

- `checkForUpdate` — wraps the plugin's check, returns whether a newer version exists plus its version/notes.
- `downloadAndInstallUpdate` — wraps the plugin's download+install, expected to be called only when install kind is `appimage`.
- `getInstallKind` — a pure Rust function reporting `appimage` vs `packaged`, by checking for the `APPIMAGE` environment variable at runtime. Implement this behind a small trait (injected env lookup), following the existing `GitCommandRunner`-style seam used for `git`/keychain logic, so it's unit-testable without a real environment.

## Acceptance criteria

- [ ] `tauri-plugin-updater` added and configured with the real public key from issue 02, endpoint pointed at this repo's GitHub Releases manifest.
- [ ] `update` domain added to `native_command` with `checkForUpdate`, `downloadAndInstallUpdate`, `getInstallKind` actions, each with typed payload/response structs on the Rust side and typed wrapper functions in `src/native/commands.ts`.
- [ ] `getInstallKind` is implemented as a pure function against an injectable trait, with unit tests covering both `appimage` and `packaged` outcomes without touching the real process environment.
- [ ] `checkForUpdate`/`downloadAndInstallUpdate` are thin passthroughs to the plugin — no bespoke logic to unit test beyond compilation/wiring (per spec's testing guidance, the plugin's own behavior isn't retested here).

## Blocked by

- 02-repo-and-signing-key-setup.md
