# macOS ships unsigned, updated in place through the existing minisign pipeline

Simpler's macOS builds are not signed or notarised with an Apple identity. There is no Apple Developer Program membership, and buying one (~$99/year) would solve a distribution-to-strangers problem this project does not have: the audience is one developer with one Mac.

This supersedes the "macOS is deferred" paragraph of ADR 0012, whose reasoning was that no Apple signing identity existed. That fact hasn't changed — what changed is the conclusion drawn from it. Shipping unsigned turns out to cost one manual step, once per install, and ADR 0012 already noted the manifest and signing design don't assume Linux-only.

## What the release job produces

A `macos-latest` job (Apple Silicon) is added to `.github/workflows/release.yml`, building **`aarch64` only**. A universal binary was rejected: the only Mac in play is Apple Silicon, and adding the second target when an Intel Mac actually exists is a two-line change — the same reasoning that keeps the Linux release `x86_64`-only.

Two artefacts, with distinct jobs:

- **`.dmg`** — the first install. Never used by the updater.
- **`.app.tar.gz`** — every install after that. Signed with the project's existing **minisign** key (the Tauri updater key already held as a GitHub Actions secret), not with an Apple identity. These are unrelated mechanisms: minisign proves the update came from this pipeline, which is what `tauri-plugin-updater` verifies against the public key in `tauri.conf.json`. Apple code signing proves identity to Gatekeeper, and is what's being skipped.

`latest.json` gains a `darwin-aarch64` platform entry alongside `linux-x86_64`. The manifest is already written by a `node -e` step in the workflow; it grows a second entry rather than changing shape.

## Gatekeeper, once

The downloaded `.dmg` carries the quarantine attribute, and macOS refuses to open an unsigned quarantined app. **Control-click → Open no longer bypasses this**: Apple removed that path in macOS 15 Sequoia. The working routes are System Settings → Privacy & Security → "Open Anyway" after the first blocked attempt, or `xattr -dr com.apple.quarantine /Applications/Simpler.app`. The README documents both.

This friction is **once per fresh install, not once per version**. Quarantine is applied by LaunchServices to files downloaded by a browser; the `.app.tar.gz` that the updater fetches and unpacks itself never acquires the attribute, so in-place updates should open without any prompt.

That last sentence is a hypothesis, and is treated as one. Whether the updater can replace an unsigned `.app` on disk and have it still launch is verified live on a real Mac before macOS self-update is called working — no green test can establish it. If it fails, macOS falls back to manual `.dmg` installs and the self-update path becomes its own piece of work.

## Status

Accepted (2026-08-12)
