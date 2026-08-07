Status: done

# ADR: record update pipeline decisions

## Parent

.scratch/in-place-updates/spec.md

## What to build

Write `docs/adr/0012-tauri-updater-with-appimage-for-linux.md`, following the format used by the existing ADRs in `docs/adr/` (short title, 1-3 sentence context/decision/why paragraph, optional Consequences/Status sections — see `docs/adr/0011-close-sync-prompt-in-app-only.md` for a recent example of the house style).

Record:
- Why `AppImage` is added specifically to enable self-update, while the existing `deb`/`rpm` bundle targets stay manual-update only (they can't replace themselves while running as an installed system package).
- Why GitHub Releases is the update-manifest/artifact host (repo is public on GitHub, no separate infra needed).
- Why the ed25519 signing private key lives only in a GitHub Actions secret, never locally or in the repo.
- Why macOS is deferred (no Apple Developer account, so no signing/notarization possible yet), and that the update-manifest design is meant to leave room for adding a signed macOS target later without reworking the Linux pipeline.

## Acceptance criteria

- [ ] `docs/adr/0012-tauri-updater-with-appimage-for-linux.md` exists, numbered correctly (scan `docs/adr/` for the highest existing number first), and follows the existing ADR house style.
- [ ] The four decisions above are each captured with their reasoning, not just stated.

## Blocked by

None - can start immediately
