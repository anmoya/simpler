# Release checklist

1. Bump version: `npm run release -- <version>`, then update `src-tauri/Cargo.toml` and run `cargo check --manifest-path src-tauri/Cargo.toml` to sync `Cargo.lock`. Confirm all four (`package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`) match.
2. `npm run test` and `npm run test:native`.
3. Commit, push, tag `vX.Y.Z`, push the tag — triggers `.github/workflows/release.yml`.
4. Confirm the workflow run is green.
5. Confirm `https://github.com/<repo>/releases/latest/download/latest.json` returns 200 and reports the new version.
6. **Actually launch the built AppImage on a Linux/Wayland machine** — download it and run it, don't just check the update manifest. A signed, reachable artifact that doesn't start is not a working release (see `docs/adr/0012-tauri-updater-with-appimage-for-linux.md`'s follow-up note for the class of bug this step exists to catch).
7. If available, spot-check the AppImage also launches on an X11 desktop.
