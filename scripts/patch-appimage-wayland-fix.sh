#!/usr/bin/env bash
# Injects the Wayland/EGL launch-fix hook (src-tauri/appimage-hooks/webkit-wayland-fix.sh)
# into a built AppImage's AppRun, then repacks it. Must run BEFORE signing —
# repacking changes the file, which invalidates any prior signature.
set -euo pipefail

APPIMAGE_PATH="${1:?Usage: patch-appimage-wayland-fix.sh <path-to-appimage>}"
APPIMAGE_PATH="$(realpath "$APPIMAGE_PATH")"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOK_SRC="$ROOT_DIR/src-tauri/appimage-hooks/webkit-wayland-fix.sh"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

if ! command -v appimagetool >/dev/null 2>&1; then
  echo "appimagetool not found on PATH" >&2
  exit 1
fi

if [[ ! -f "$APPIMAGE_PATH" ]]; then
  echo "AppImage not found at: $APPIMAGE_PATH" >&2
  echo "Contents of $(dirname "$APPIMAGE_PATH"):" >&2
  ls -la "$(dirname "$APPIMAGE_PATH")" >&2 || true
  exit 1
fi

chmod +x "$APPIMAGE_PATH"

cd "$WORK_DIR"
"$APPIMAGE_PATH" --appimage-extract >/dev/null

cp "$HOOK_SRC" squashfs-root/apprun-hooks/webkit-wayland-fix.sh
chmod +x squashfs-root/apprun-hooks/webkit-wayland-fix.sh

sed -i \
  's#^source "$this_dir"/apprun-hooks/"linuxdeploy-plugin-gtk.sh"$#&\nsource "$this_dir"/apprun-hooks/"webkit-wayland-fix.sh"#' \
  squashfs-root/AppRun

grep -q webkit-wayland-fix.sh squashfs-root/AppRun

ARCH=x86_64 appimagetool squashfs-root "$APPIMAGE_PATH.patched"
mv "$APPIMAGE_PATH.patched" "$APPIMAGE_PATH"
