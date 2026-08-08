#!/usr/bin/env bash
# Cuts a release: bumps version everywhere, runs tests, commits, tags, and
# pushes — triggering .github/workflows/release.yml (build, patch AppImage
# for the Wayland/EGL fix, sign, publish). See docs/release-checklist.md.
set -euo pipefail

VERSION="${1:?Usage: cut-release.sh <version>  (e.g. 0.1.3)}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree not clean. Commit or stash first." >&2
  exit 1
fi

echo "==> Bumping package.json and src-tauri/tauri.conf.json"
npm run release -- "$VERSION"

echo "==> Bumping src-tauri/Cargo.toml"
sed -i "0,/^version = \".*\"$/s//version = \"$VERSION\"/" src-tauri/Cargo.toml

echo "==> Syncing src-tauri/Cargo.lock"
cargo check --manifest-path src-tauri/Cargo.toml >/dev/null

echo "==> Running tests"
npm run test
npm run test:native

echo "==> Committing"
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "Bump version to $VERSION"

echo "==> Tagging v$VERSION"
git tag "v$VERSION"

echo "==> Pushing commit and tag"
git push
git push origin "v$VERSION"

echo "==> Done. Watch the Release workflow: https://github.com/$(git remote get-url origin | sed -E 's#.*[:/]([^/]+/[^/.]+)(\.git)?$#\1#')/actions"
echo "==> Then follow docs/release-checklist.md steps 4-7 (verify latest.json, actually launch the AppImage)."
