Status: ready-for-agent

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
