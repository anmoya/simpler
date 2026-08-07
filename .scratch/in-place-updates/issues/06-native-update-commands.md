Status: done

`tauri-plugin-updater` added (Cargo.toml + registered in `run()`), configured in `tauri.conf.json` with the real pubkey from issue 02 and endpoint `https://github.com/anmoya/simpler/releases/latest/download/latest.json` (the manifest path `tauri-action` publishes to on a GitHub Release). `updater:default` capability added.

Async/sync split: `checkForUpdate`/`downloadAndInstallUpdate` need an `AppHandle`, which `dispatch_native_command` doesn't have (it's a plain fn over `serde_json::Value`, used directly in Rust unit tests too). Rather than making the whole sync dispatcher async, `commands::native_command` became `async fn(app: AppHandle, request)` and intercepts these two `Update`-domain actions before calling into `dispatch_native_command`, routing them to a new `handle_update_command` that awaits the plugin. `getInstallKind` (pure, no AppHandle needed) stays on the sync path. `checkForUpdate`/`downloadAndInstallUpdate` are thin passthroughs per the spec's testing guidance — not unit tested, since that would mean testing the plugin's own behavior.

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
