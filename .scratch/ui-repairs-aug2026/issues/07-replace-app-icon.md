Status: done

## What to build

Replace Simpler's app icon with the new source image, and regenerate every
bundled icon size/format from it.

The source image goes at `src-tauri/icons/icon.png` (recommended: 1024x1024 or
larger, PNG with a transparent background). Running `npx tauri icon
src-tauri/icons/icon.png` regenerates the sizes already referenced by
`tauri.conf.json`'s `bundle.icon` (`32x32.png`, `128x128.png`,
`128x128@2x.png`) plus platform-specific formats (`.ico`/`.icns`) automatically
— no manual resizing needed.

## Acceptance criteria

- [ ] `src-tauri/icons/icon.png` replaced with the new source image
- [ ] `npx tauri icon src-tauri/icons/icon.png` run successfully, regenerating
      all sizes under `src-tauri/icons/`
- [ ] `npm run tauri -- build --bundles deb,rpm` produces a bundle showing the
      new icon (spot-check visually, e.g. in a file manager or app launcher)

## Blocked by

None - can start immediately
