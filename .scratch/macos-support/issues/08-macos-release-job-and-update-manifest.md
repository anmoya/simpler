# macOS release job and `darwin-aarch64` in the update manifest

Status: ready-for-agent

## Parent

`.scratch/macos-support/spec.md` — reasoning in ADR 0015.

## What to build

Add a `macos-latest` (Apple Silicon) job to `.github/workflows/release.yml`, building **`aarch64` only** — no universal binary.

Two artefacts with distinct jobs:

- **`.dmg`** — first install only. The updater never touches it.
- **`.app.tar.gz`** — every subsequent install, signed with the **existing minisign key** already held as `TAURI_SIGNING_PRIVATE_KEY`. This is not Apple code signing and does not replace it: minisign proves the update came from this pipeline, which is what `tauri-plugin-updater` verifies against the public key in `tauri.conf.json`. Apple signing is deliberately skipped (ADR 0015).

`latest.json` currently hardcodes a single `linux-x86_64` entry inside a `node -e` step. It needs a `darwin-aarch64` entry alongside it, which means the manifest can no longer be written by whichever job happens to run — the Linux and macOS jobs must both contribute before the release is published. Restructure so the manifest is assembled once from both jobs' outputs; don't let one job overwrite the other's entry, which would silently break updates for the platform that lost the race.

Bundle targets stay per platform: Linux keeps `deb, rpm, appimage`, macOS gets `dmg, app`. Use `tauri.macos.conf.json` (already added in issue 04) rather than adding macOS targets to the shared `bundle.targets`.

Also: `updateScheduler.ts` models `InstallKind` as `"appimage" | "packaged"`, where `"appimage"` means "can self-update" and `"packaged"` means "link out to the Release page". A macOS `.app` **can** self-update, so it must land on the self-updating branch. Decide deliberately whether that means widening the type or renaming the concept to describe the capability instead of the format — and if the type is widened, `get_install_kind` in `lib.rs` needs to report it, since today it only checks the `APPIMAGE` env var.

## Acceptance criteria

- [ ] Tagging a release produces a `.dmg` and a signed `.app.tar.gz` for `aarch64`, attached to the GitHub Release
- [ ] `latest.json` contains **both** `linux-x86_64` and `darwin-aarch64`, with correct signatures and URLs, on every release
- [ ] Neither platform's job can overwrite the other's manifest entry
- [ ] The Linux release path is unchanged: AppImage still gets the Wayland patch **before** signing (`scripts/patch-appimage-wayland-fix.sh`), deb/rpm still build
- [ ] A macOS install reports an install kind that routes it to the self-updating branch of `updateScheduler.ts`, not to "link out to the Release page"
- [ ] `npm run test` passes with the updated install-kind model

## Blocked by

- 04 (needs `tauri.macos.conf.json`)

## Comments

Restructured `release.yml` from one job into three: `build-linux` and `build-macos` (`macos-latest`, `aarch64-apple-darwin` target) each build and sign their own artifacts and upload them plus a small per-platform manifest *fragment* (`{"linux-x86_64": {...}}` / `{"darwin-aarch64": {...}}`) as build artifacts; a `publish` job (`needs: [build-linux, build-macos]`) downloads both, merges the two fragments' `platforms` objects into one `latest.json`, and is the only place that writes the real manifest or calls `gh release create`. That structurally rules out either job overwriting the other's entry — there's no shared file either job writes directly, and the merge only happens once, downstream of both. `tauri.macos.conf.json` gained a `bundle.targets: ["dmg", "app"]` override (JSON Merge Patch replaces the array, so this doesn't touch Linux's `deb,rpm,appimage` in the base config). The Linux job's steps (Wayland patch before signing, deb/rpm bundling) are otherwise untouched, just moved into their own job.

`InstallKind` (`lib.rs` + `commands.ts`) gained a `MacosApp`/`"macos-app"` variant; `get_install_kind` now checks `cfg!(target_os = "macos")` before the `APPIMAGE` env var, since every macOS build is a `.app` regardless of how it arrived (fresh `.dmg` install or a prior self-update). Per the ticket's "decide deliberately" prompt: `updateScheduler.ts`'s option was renamed from `installKind: UpdateInstallKind` to `canSelfUpdate: boolean` rather than widened to a third string value — the scheduler only ever branched on "can this replace itself in place", never on the format, and macOS makes that distinction real (same capability, different format from AppImage). `App.tsx` now derives `canSelfUpdate` from the wire-format `InstallKind` (`"appimage" || "macos-app"`) before constructing the scheduler, so the format-vs-capability split lives at that one seam instead of leaking into the scheduler's own logic.

Verified live on this Mac (not through GitHub Actions, but through the same `tauri build` command the workflow runs): `npm run tauri build -- --bundles dmg,app` (without `--target`, so no per-triple output path) actually produced `Simpler.app`, `Simpler_0.1.6_aarch64.dmg`, and `Simpler.app.tar.gz` (Tauri's own bundler log labeled the last one `(updater)`), confirming `createUpdaterArtifacts: true` does generate the `.app.tar.gz` this whole plan depends on without any extra config. The build then failed at the auto-sign step with "A public key has been found, but no private key" — expected, since this Mac has no `TAURI_SIGNING_PRIVATE_KEY`, but it incidentally confirms Tauri's bundler *does* attempt to sign updater artifacts automatically when the config's public key is present, which is worth knowing even though the workflow still runs its own explicit `tauri signer sign` step afterward (matching the existing Linux job's belt-and-suspenders pattern rather than relying on that implicit behavior).

`npm run test`: 191/191 pass with the renamed `canSelfUpdate` model (`updateScheduler.test.ts` mechanically updated: `installKind: "appimage"` → `canSelfUpdate: true`, `installKind: "packaged"` → `canSelfUpdate: false`). `npm run test:native`: 70/70 (two Linux-only install-kind tests gated `#[cfg(not(target_os = "macos"))]`, one new macOS-only test added asserting `MacosApp` regardless of the `APPIMAGE` env var).

**Update — now verified for real.** With the user's go-ahead, cut and pushed `v0.1.7`. That run caught a real bug this same round introduced: `tauri::RunEvent::Reopen` (ticket 05) is `#[cfg(target_os = "macos")]`-gated *inside the `tauri` crate itself*, not just semantically macOS-only, so matching on it unconditionally in `App::run`'s callback broke the Linux build — exactly the class of bug ticket 07's CI exists to catch, and it caught it on the very first tagged push. Fixed by gating that whole closure to macOS (commit `7f4691a`), confirmed both platforms green on `main` via the Test workflow, then cut `v0.1.8` for real. `v0.1.7`'s tag and pushed commit are left in git history as-is (nothing was published under it — the Release workflow failed before the publish job ran, so there's no broken artifact anywhere for anyone to install) rather than force-moving the tag.

`v0.1.8`'s Release workflow went green end to end: `gh release view v0.1.8` shows all eight expected assets (`latest.json`, both Linux packages + AppImage + sig, both macOS `.dmg` and `.app.tar.gz` + sig). Fetched the published `latest.json` directly (`https://github.com/anmoya/simpler/releases/latest/download/latest.json`) and confirmed it contains both `linux-x86_64` and `darwin-aarch64` entries, each with a real minisign signature and a URL pointing at `v0.1.8`'s actual release assets — the exact acceptance criterion this ticket asks for, now backed by a real release rather than a local `tauri build` dry run.

Two more things fixed in the same pass, surfaced by the same CI run: `scripts/cut-release.sh` used a bare `sed -i "..."` for bumping `Cargo.toml`, which is GNU-only — BSD sed (macOS) requires an extension argument after `-i` and errors otherwise (fixed in commit `60ba8f4`, found while actually cutting the release from this Mac). And two `App.test.tsx` tests turned out to race CodeMirror's async mount under CI's scheduling (`querySelector` returning null before the contenteditable node existed), plus one of this round's own new macOS tests raced its `getPlatform()` effect against `onCloseRequested` registration — all three intermittent only under CI, not locally; fixed by polling instead of asserting immediately (commit `7f4691a`).
