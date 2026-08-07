Status: ready-for-human

`.github/workflows/release.yml` created: triggers on `v*.*.*` tags, installs Linux/Tauri build deps, and uses `tauri-apps/tauri-action@v0` to build all three configured bundle targets (deb/rpm/appimage from `tauri.conf.json`), sign the AppImage + updater manifest with the `TAURI_SIGNING_PRIVATE_KEY`/`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets from issue 02, and publish a GitHub Release with everything attached.

Not done: end-to-end verification by pushing a real tag — that's a maintainer action (pushes to the shared remote, triggers a real public Release) that needs your explicit go-ahead rather than being done autonomously. Push a `v0.1.0`-style tag (after bumping via `npm run release -- <version>`) whenever you're ready to test it; I can walk through the resulting Actions run with you if anything fails.

# GitHub Actions release workflow

## Parent

.scratch/in-place-updates/spec.md

## What to build

A new GitHub Actions workflow, triggered on push of tags matching `v*.*.*`, that:

- Builds all three Linux bundle targets (`deb`, `rpm`, `appimage`) — this is the standard `tauri-action` release flow, which can drive the whole build+sign+publish sequence.
- Signs the AppImage artifact and its update manifest using the ed25519 private key from the GitHub Actions secret provisioned in issue 02.
- Publishes a GitHub Release for the pushed tag with all three artifacts (plus the signature/manifest files the updater needs) attached.

## Acceptance criteria

- [ ] Workflow file exists (e.g. `.github/workflows/release.yml`), triggered only on `v*.*.*` tag pushes.
- [ ] Workflow builds `deb`, `rpm`, and `appimage` bundles.
- [ ] Workflow signs the AppImage/update manifest using the secret(s) from issue 02, without ever printing or persisting the private key in logs/artifacts.
- [ ] Workflow publishes a GitHub Release with all bundle artifacts and the signed update manifest attached.
- [ ] Verified end-to-end by actually pushing a real tag and confirming the Release is created correctly (per the spec's testing guidance — this is build tooling, validate by running it for real rather than unit testing the YAML).

## Blocked by

- 02-repo-and-signing-key-setup.md
- 03-appimage-target-and-version-script.md
