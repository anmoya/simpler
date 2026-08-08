Status: ready-for-agent

# Add Wayland/EGL launch-fix hook to the AppImage

## Parent

.scratch/appimage-wayland-launch-fix/spec.md

## What to build

The Simpler AppImage currently crashes on launch on at least one real Wayland desktop (Arch Linux/Hyprland, and the same class of crash reported upstream on other WebKitGTK-based Tauri apps on GNOME/Wayland) with `Could not create surfaceless EGL display: EGL_BAD_ALLOC. Aborting...` before any window appears. Diagnosis (see spec's Further Notes) ruled out GPU vendor, driver, hardware vs. software rendering, and device permissions — the bug is isolated to the AppImage bundle itself (the same build via `npm run tauri:dev`, using the system WebKitGTK, launches fine on the same machine).

A confirmed manual workaround exists: launching with `WEBKIT_DISABLE_COMPOSITING_MODE=1 WEBKIT_DISABLE_DMABUF_RENDERER=1 LD_PRELOAD=/usr/lib/libwayland-client.so.0` fixes it. Bake this into the AppImage's own launch sequence so it applies automatically, with no user action required — the same mechanism the AppImage already uses for its existing GTK/backend fix (`apprun-hooks/linuxdeploy-plugin-gtk.sh`, sourced from `AppRun` and exporting things like `GDK_BACKEND=x11` unconditionally).

Add a new hook script, sourced alongside the existing GTK hook in the same shell context, that unconditionally exports:
- `WEBKIT_DISABLE_COMPOSITING_MODE=1`
- `WEBKIT_DISABLE_DMABUF_RENDERER=1`
- `LD_PRELOAD` pointing at the system's `libwayland-client.so.0`, **appended** to any pre-existing `LD_PRELOAD` value rather than overwriting it (mirror how the existing hook falls back on already-set variables, e.g. `APPIMAGE_GTK_THEME`)

No runtime Wayland/X11 detection and no Rust/Tauri app code changes — this is entirely a packaging-time fix in the AppImage's hook chain. The overrides should be harmless on setups where the crash doesn't occur, so unconditional export is intentional (matches how `GDK_BACKEND=x11` is already exported unconditionally by the existing hook).

## Acceptance criteria

- [ ] A new AppRun hook script exports `WEBKIT_DISABLE_COMPOSITING_MODE=1`, `WEBKIT_DISABLE_DMABUF_RENDERER=1`, and an `LD_PRELOAD` that includes the system `libwayland-client.so.0`, appending to (not clobbering) any pre-existing `LD_PRELOAD`
- [ ] The hook is sourced from the same place/mechanism as the existing `linuxdeploy-plugin-gtk.sh` hook, so both apply on every AppImage launch
- [ ] A locally-built AppImage (`tauri build --bundles appimage` or equivalent) launches successfully — no `EGL_BAD_ALLOC` abort, main window renders — on a Wayland desktop previously confirmed to reproduce the crash (Arch/Hyprland)
- [ ] If an X11 desktop is available for testing, confirm the AppImage still launches correctly there too, to verify the unconditional overrides are inert (not a hard blocker if no X11 machine is available — note in the PR if skipped)
- [ ] No changes to `src-tauri/src/lib.rs`, `native_command`, or the frontend

## Blocked by

None - can start immediately
