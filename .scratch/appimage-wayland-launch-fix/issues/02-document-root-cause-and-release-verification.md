Status: ready-for-agent

# Document root cause and update release-verification habit

## Parent

.scratch/appimage-wayland-launch-fix/spec.md

## What to build

Record the diagnosed root cause and fix for the AppImage Wayland/EGL launch crash (issue 01) so it doesn't need to be re-derived from scratch if a similar report comes in later, and tighten the release process so this class of bug — an artifact that publishes fine but doesn't actually run — gets caught before being called "verified."

1. Extend ADR 0012 (`docs/adr/0012-tauri-updater-with-appimage-for-linux.md`) with a short note — or add a clearly-linked follow-up note referencing it — covering: the symptom (`Could not create surfaceless EGL display: EGL_BAD_ALLOC` on launch), what was ruled out during diagnosis (GPU vendor/driver, hardware vs. software rendering, device permissions, EGL vendor ICD selection, bundled `libepoxy` version), the actual root cause (the `ubuntu-22.04`-built WebKitGTK in the AppImage bundle failing EGL display initialization on the target system unless the system's `libwayland-client.so` is preloaded), and the fix (the hook added in issue 01).
2. Update wherever this project's release steps are tracked (currently ad hoc — establish or extend a release checklist/runbook if none exists) to include actually launching the built AppImage on a Linux/Wayland machine as a required verification step, not just confirming the update manifest (`latest.json`) resolves and is correctly signed. This was the actual gap that let a non-launching artifact through in the v0.1.2 release.

## Acceptance criteria

- [ ] ADR 0012 (or a clearly cross-referenced follow-up note) documents the EGL/Wayland launch crash's root cause and fix, written so a future maintainer hitting a similar crash report doesn't need to re-diagnose it
- [ ] A release verification step exists in writing (checklist, runbook, or equivalent) requiring an actual launch of the built AppImage on Linux/Wayland, not just an update-manifest check
- [ ] No app/runtime code changes — this issue is documentation and process only

## Blocked by

- 01-add-wayland-egl-launch-fix-hook.md (documents the confirmed, shipped fix rather than a hypothesis)
