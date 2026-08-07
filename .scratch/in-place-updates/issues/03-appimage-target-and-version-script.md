Status: ready-for-human

Note: `bundle.targets` + icon config added, and version-bump script + tests done. Local AppImage packaging (`npm run tauri -- build --bundles appimage`) could not be verified end-to-end in this sandbox — linuxdeploy assembles the full AppDir successfully but the final squashfs packaging step needs FUSE (`/dev/fuse`), which isn't available here and requires root to enable. Needs a human (or CI, see issue 04) to confirm a runnable `.AppImage` is actually produced.

# AppImage bundle target + version-bump script

## Parent

.scratch/in-place-updates/spec.md

## What to build

Two independent, small additions that the release workflow will depend on:

1. Add `appimage` to `bundle.targets` in `src-tauri/tauri.conf.json` (currently `["deb", "rpm"]`), so `npm run tauri -- build` produces all three Linux artifacts.
2. Add a version-bump script (e.g. `npm run release -- <version>`) that updates the version field in both `package.json` and `src-tauri/tauri.conf.json` to the given value in one step, so the two can't drift out of sync (both are currently hardcoded to `"0.1.0"` independently). Fail loudly if the given version isn't a valid semver or isn't greater than the current one.

## Acceptance criteria

- [ ] `src-tauri/tauri.conf.json` `bundle.targets` includes `"appimage"` alongside `"deb"` and `"rpm"`.
- [ ] A local AppImage build succeeds (`npm run tauri -- build --bundles appimage` or equivalent) and produces a runnable `.AppImage` file.
- [ ] The version-bump script updates both `package.json`'s `version` and `tauri.conf.json`'s `version` fields together, from a single invocation.
- [ ] The script rejects an invalid or non-increasing version with a clear error instead of silently writing bad state.
- [ ] Test coverage for the version-bump script's parsing/validation logic (unit test, not a full build).

## Blocked by

None - can start immediately
