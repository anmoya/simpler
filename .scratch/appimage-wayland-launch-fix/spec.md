Status: ready-for-agent

# Fix AppImage launch crash on Wayland (EGL surfaceless display init)

## Problem Statement

The Simpler AppImage — the only bundle format that can self-update via `tauri-plugin-updater` (ADR 0012) — fails to launch at all on at least one real Wayland desktop (Arch Linux / Hyprland via Omarchy, GNOME/Wayland reported upstream against other WebKitGTK-based Tauri apps too). It aborts immediately with `Could not create surfaceless EGL display: EGL_BAD_ALLOC. Aborting...` before any window appears. This was discovered while manually verifying the v0.1.2 release end-to-end: `latest.json` was reachable and correctly signed, but the artifact it points to could not actually start on the machine used to test it.

The crash is unrelated to GPU driver, GPU vendor ICD, hardware vs. software rendering, or `/dev/dri` permissions — all of these were ruled out during diagnosis (identical failure under `LIBGL_ALWAYS_SOFTWARE=1`/`llvmpipe`, under a forced single-vendor EGL ICD, and with the user's session confirmed to already have `render`/`video` group access at `0666` device permissions). The same build, run instead via `npm run tauri:dev` (system WebKitGTK, no bundled libs), launches and renders normally on the same machine — isolating the bug to something specific to the AppImage bundle produced by `tauri-action`/linuxdeploy on the `ubuntu-22.04` CI runner (ADR 0012, `.github/workflows/release.yml`), not to the app's own code, the user's GPU, or their driver stack.

The concrete fix was found by hand: launching with `LD_PRELOAD=/usr/lib/libwayland-client.so.0` (the *system's* `libwayland-client`, not anything bundled) alongside `WEBKIT_DISABLE_COMPOSITING_MODE=1` and `WEBKIT_DISABLE_DMABUF_RENDERER=1` allows the bundled WebKitGTK to create its EGL display and the app starts normally. A comparable fix (`WEBKIT_DISABLE_DMABUF_RENDERER`/`WEBKIT_DISABLE_COMPOSITING_MODE` plus a `libwayland-client.so` preload) has been independently adopted by at least one other Tauri AppImage project for the same class of crash. Right now a user has to know and type all three environment variables by hand every time they launch the AppImage — that's not viable for an app whose entire self-update pitch is "download and it just works."

## Solution

Bake the working environment overrides into the AppImage's own launch sequence so they apply automatically, with no user action, exactly the same way the existing `linuxdeploy-plugin-gtk.sh` hook already exports `GDK_BACKEND=x11` and other GTK-specific environment fixes today. A new hook script sourced alongside it exports `WEBKIT_DISABLE_COMPOSITING_MODE=1`, `WEBKIT_DISABLE_DMABUF_RENDERER=1`, and `LD_PRELOAD` (extended, not overwritten, in case a user already has one set) pointing at the system's `libwayland-client.so.0` before the wrapped binary is exec'd. This requires no Rust/Tauri code changes — it's entirely a packaging-time fix living in the AppImage's `AppRun` hook chain, matching how the existing GTK theme/backend fix already works.

## User Stories

1. As a user on Arch Linux/Hyprland (or any similarly-affected Wayland desktop) downloading the Simpler AppImage for the first time, I want it to launch successfully out of the box, so that I don't have to diagnose an EGL crash before I can even try the app.
2. As a user receiving an in-place self-update via `tauri-plugin-updater`, I want the newly-downloaded AppImage to relaunch successfully, so that an update doesn't silently turn into "the app no longer opens."
3. As a user who already has their own `LD_PRELOAD` set for unrelated reasons, I want the fix to append to it rather than clobber it, so that the fix doesn't break some other tool I depend on.
4. As a user on a desktop/driver combination where this crash doesn't occur, I want the added environment overrides to be harmless, so that the fix doesn't regress a currently-working setup.
5. As the maintainer, I want the fix expressed as a packaging-time hook (not app code), so that it stays isolated to how the AppImage launches and doesn't add runtime complexity, conditionals, or platform-detection logic to the Tauri/Rust app itself.
6. As the maintainer, I want the fix to live next to the existing `linuxdeploy-plugin-gtk.sh` hook using the same sourcing mechanism, so that there's one obvious place future launch-environment fixes get added, not a second parallel mechanism.
7. As the maintainer, I want this diagnosed root cause and fix recorded in the project's architectural documentation, so that a future regression or a similar crash report doesn't require re-diagnosing from scratch.
8. As the maintainer, I want end-to-end verification of a release to include actually launching the built AppImage on a real Wayland desktop, not just checking that `latest.json` resolves and is signed, so that "the release pipeline works" and "the app opens" aren't silently conflated.

## Implementation Decisions

- **New AppRun hook**: add a new script under `src-tauri`'s AppImage packaging config (wherever `apprun-hooks/linuxdeploy-plugin-gtk.sh` is currently sourced from in the `AppRun` template used by `tauri-action`/linuxdeploy) that runs in the same shell context, after or alongside the existing GTK hook, and exports:
  - `WEBKIT_DISABLE_COMPOSITING_MODE=1`
  - `WEBKIT_DISABLE_DMABUF_RENDERER=1`
  - `LD_PRELOAD` set to the system's `libwayland-client.so.0`, appended to any pre-existing `LD_PRELOAD` value rather than overwriting it (mirror the existing hook's pattern of respecting/falling back on already-set variables, e.g. how it handles `APPIMAGE_GTK_THEME`).
- **No conditional/platform detection**: do not attempt to detect Wayland vs. X11 or gate the overrides at runtime — the fix is inert on setups where it isn't needed (per user story 4), so unconditional export is simpler and matches the existing hook's unconditional `GDK_BACKEND=x11` export.
- **No Rust/Tauri app code changes**: this is scoped entirely to `AppRun`/hook packaging; `src-tauri/src/lib.rs`, `native_command`, and the frontend are untouched by this spec.
- **Documentation**: extend ADR 0012 (or add a short follow-up note referencing it) recording the root cause (bundled `ubuntu-22.04`-era WebKitGTK failing `eglGetPlatformDisplay`/surfaceless EGL init against a newer system Mesa unless the system `libwayland-client` is preloaded) and the fix, so it isn't re-diagnosed from scratch on the next report.
- **Release verification step**: the maintainer's release checklist/runbook (wherever release steps are tracked — currently ad hoc) should be updated to include actually launching the built AppImage on a Linux/Wayland machine before considering a release verified, not just confirming `latest.json` resolves.

## Testing Decisions

- This is packaging configuration, not application logic — there is no unit-testable pure function here, matching how the existing GitHub Actions release workflow and version-bump script are validated by cutting a real tag/release rather than by unit test (see `.scratch/in-place-updates/spec.md`'s Testing Decisions for the established precedent on this repo).
- Validate by building a real AppImage (via the release workflow, or a local `tauri build --bundles appimage`) and actually launching it on a Wayland desktop known to previously reproduce the crash (Arch/Hyprland), confirming no `EGL_BAD_ALLOC` abort and that the main window renders.
- Also spot-check that the AppImage still launches correctly on an X11 desktop, if one is available, to confirm the unconditional overrides are inert there (user story 4) — not a hard requirement to block on if no X11 test machine is available, but worth a note in the PR/issue if skipped.

## Out of Scope

- Runtime Wayland/X11 detection or any Rust-side re-exec logic (explicitly rejected in favor of the packaging-hook seam — see Implementation Decisions).
- Investigating or fixing the same class of crash for `.deb`/`.rpm` installs — those use the system WebKitGTK directly (no bundled libs, no `AppRun`), and were not observed to exhibit this crash.
- macOS/Windows — out of scope per ADR 0012 and the parent in-place-updates spec; this AppImage-specific fix doesn't apply to those platforms regardless.
- Upstream-reporting this to WebKitGTK or linuxdeploy — may be worth doing separately, but isn't required for Simpler's own release to work and isn't tracked by this spec.

## Further Notes

- Full diagnostic trail (for whoever picks this up, to avoid re-deriving it): ruled out — `render`/`video` group membership (device nodes are already `0666`), GPU vendor (AMD Vega/Cezanne with in-tree `amdgpu`), hardware vs. software rendering (`LIBGL_ALWAYS_SOFTWARE=1`/`llvmpipe` reproduces identically), a stray Nvidia EGL vendor ICD json on the test machine (forcing Mesa-only ICD changes the error message but not the outcome), and a bundled `libepoxy.so.0` version mismatch (removing it from the extracted AppImage doesn't change the outcome). Confirmed via `npm run tauri:dev` (system WebKitGTK) launching cleanly on the same hardware that the AppImage fails on, isolating the bug to the bundle itself.
- Confirmed working manual workaround, for reference: `WEBKIT_DISABLE_COMPOSITING_MODE=1 WEBKIT_DISABLE_DMABUF_RENDERER=1 LD_PRELOAD=/usr/lib/libwayland-client.so.0 ./Simpler.AppImage`.
- v0.1.2 is the first release built with `createUpdaterArtifacts: true` (see prior session fixing `latest.json` not being generated) — this AppImage-launch bug was only caught because that fix was verified by trying to actually run the downloaded artifact, not just checking the update manifest. That verification habit is worth keeping for future releases (see user story 8).
