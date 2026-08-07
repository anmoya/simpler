# Tauri updater with AppImage for Linux self-update

Simpler adds an `appimage` bundle target alongside the existing `deb`/`rpm` targets specifically to enable in-place self-update: an AppImage is a single executable that can replace itself on disk while running, whereas `deb`/`rpm` installs are managed by the system package manager and can't be swapped out from inside the running app. `deb`/`rpm` stay manual-update only — their "update available" notice links to the GitHub Release page instead of offering one-click install.

GitHub Releases hosts both the update manifest and the build artifacts. The project is moving to a public GitHub repo regardless (for CI), so this needs no separate infrastructure — `tauri-plugin-updater`'s endpoint just points at the repo's latest Release.

The ed25519 update-signing private key lives only as a GitHub Actions repository secret, used solely inside the release workflow to sign the AppImage and its update manifest. It's never generated or stored on a local machine or committed to the repo, so a compromised developer machine can't be used to publish a spoofed update; only the corresponding public key is committed, in `tauri.conf.json`, to verify signatures at install time.

macOS is deferred — there's no Apple Developer account to sign or notarize a macOS build with, so no target, CI job, or signing key is added for it in this round. The update-manifest and signing-key design don't assume Linux-only, so a signed macOS target can be added later without reworking this pipeline.

## Status

Accepted
