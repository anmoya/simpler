# Tauri updater with AppImage for Linux self-update

Simpler adds an `appimage` bundle target alongside the existing `deb`/`rpm` targets specifically to enable in-place self-update: an AppImage is a single executable that can replace itself on disk while running, whereas `deb`/`rpm` installs are managed by the system package manager and can't be swapped out from inside the running app. `deb`/`rpm` stay manual-update only — their "update available" notice links to the GitHub Release page instead of offering one-click install.

GitHub Releases hosts both the update manifest and the build artifacts. The project is moving to a public GitHub repo regardless (for CI), so this needs no separate infrastructure — `tauri-plugin-updater`'s endpoint just points at the repo's latest Release.

The ed25519 update-signing private key lives only as a GitHub Actions repository secret, used solely inside the release workflow to sign the AppImage and its update manifest. It's never generated or stored on a local machine or committed to the repo, so a compromised developer machine can't be used to publish a spoofed update; only the corresponding public key is committed, in `tauri.conf.json`, to verify signatures at install time.

macOS is deferred — there's no Apple Developer account to sign or notarize a macOS build with, so no target, CI job, or signing key is added for it in this round. The update-manifest and signing-key design don't assume Linux-only, so a signed macOS target can be added later without reworking this pipeline.

## Status

Accepted

## Follow-up: AppImage Wayland/EGL launch crash

The v0.1.2 release's AppImage was reachable and correctly signed (`latest.json` resolved fine) but failed to launch at all on a real Wayland desktop (Arch Linux/Hyprland), aborting with:

```
Could not create surfaceless EGL display: EGL_BAD_ALLOC. Aborting...
```

Diagnosis ruled out: GPU vendor/driver (AMD `amdgpu`, confirmed loaded), hardware vs. software rendering (`LIBGL_ALWAYS_SOFTWARE=1`/`llvmpipe` reproduced identically), `/dev/dri` permissions (device nodes already `0666`), EGL vendor ICD selection (forcing a Mesa-only ICD changed the error but not the outcome), and a bundled `libepoxy.so.0` version mismatch (removing it from the extracted AppImage didn't change the outcome). The same build launched fine via `npm run tauri:dev` (system WebKitGTK, no bundled libs) on the same machine, isolating the bug to the AppImage bundle itself: WebKitGTK built against the `ubuntu-22.04` CI runner fails to create its EGL display against a newer system Mesa unless the system's `libwayland-client.so` is preloaded.

**Fix**: `src-tauri/appimage-hooks/webkit-wayland-fix.sh`, sourced from `AppRun` alongside the existing `linuxdeploy-plugin-gtk.sh` hook, unconditionally exports `WEBKIT_DISABLE_COMPOSITING_MODE=1`, `WEBKIT_DISABLE_DMABUF_RENDERER=1`, and an `LD_PRELOAD` extended with the system's `libwayland-client.so.0`. Since linuxdeploy generates `AppRun`/`apprun-hooks/` at build time with no config knob to inject a custom hook, `scripts/patch-appimage-wayland-fix.sh` post-processes the built AppImage (extract, add hook, patch `AppRun`, repack) — and must run **before** signing, since repacking changes the file and invalidates any signature taken before the patch. `.github/workflows/release.yml` reflects this: build (unsigned) → patch AppImage → sign + write `latest.json` → publish, replacing the previous single `tauri-action` step that built, signed, and published all at once.
