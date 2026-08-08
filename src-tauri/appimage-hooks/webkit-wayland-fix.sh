#! /usr/bin/env bash

# Bundled WebKitGTK (built against the ubuntu-22.04 CI runner) fails to
# create its EGL display on Wayland unless the *system* libwayland-client
# is preloaded, aborting immediately with:
#   Could not create surfaceless EGL display: EGL_BAD_ALLOC. Aborting...
# Ruled out during diagnosis: GPU vendor/driver, hw vs sw rendering, /dev/dri
# perms, EGL vendor ICD selection, bundled libepoxy version. See
# docs/adr/0012-tauri-updater-with-appimage-for-linux.md.
export WEBKIT_DISABLE_COMPOSITING_MODE=1
export WEBKIT_DISABLE_DMABUF_RENDERER=1
export LD_PRELOAD="/usr/lib/libwayland-client.so.0${LD_PRELOAD:+:$LD_PRELOAD}"
