# Simpler

Simpler is a Linux-first, local-first Markdown notes application, with macOS also supported for daily use (see `docs/adr/0014-macos-supported-linux-reference-platform.md`: Linux settles ties, macOS gets whatever divergence keeps it feeling native). It opens a normal folder as a **Workspace**, edits Raw Markdown in place, and can synchronize a Git-backed Workspace through a Git remote.

## Run from a clean checkout

Prerequisites:

- Node.js 22 and npm
- Rust stable and Cargo (install via [rustup](https://rustup.rs), same on both platforms)
- **Linux**: Tauri/WebKit build prerequisites for your distribution; `secret-tool` (`libsecret`) for GitHub Device Flow and credential storage
- **macOS**: Xcode Command Line Tools (`xcode-select --install`); no extra keychain package needed — credential storage goes through the built-in `security` CLI
- `git` for Workspace status, Sync, and cloning
- `curl` for GitHub Device Flow

Install the JavaScript dependencies and start the desktop application:

```bash
npm ci
npm run tauri:dev
```

`npm run tauri:dev` launches the **desktop Tauri application**. It is the supported development command because it exposes the native filesystem, Git, dialog, and keychain boundaries.

For browser-only UI work, run:

```bash
npm run dev
```

This serves the Vite UI at `http://localhost:1427`; native Workspace, Git, and authentication actions are unavailable outside Tauri.

## GitHub setup

The primary GitHub path uses Device Flow. Register a GitHub OAuth application, then launch the desktop app with its client ID:

```bash
SIMPLER_GITHUB_CLIENT_ID=your-client-id npm run tauri:dev
```

The application stores the resulting credential through `secret-tool` on Linux and the `security` CLI (system keychain) on macOS; either way it does not write the token to the Workspace. A Personal Access Token remains an advanced fallback in Settings. The app accepts GitHub repository URLs for connect and clone; its clone destination's parent folder must already exist. `SIMPLER_GITHUB_CLIENT_ID` works identically on both platforms.

## Install on macOS

Download the latest `.dmg` from [GitHub Releases](https://github.com/anmoya/simpler/releases), open it, and drag Simpler into Applications.

**Simpler is unsigned** — there's no Apple Developer Program membership behind it (see `docs/adr/0015-unsigned-macos-distribution.md`), so the first launch triggers Gatekeeper. This is expected, not a sign that anything went wrong. **Control-click → Open does not work as a bypass** — Apple removed that path in macOS 15 Sequoia. Use one of these instead:

1. Try to open Simpler, let Gatekeeper refuse it, then go to **System Settings → Privacy & Security** and click **"Open Anyway"** next to the Simpler entry.
2. Or clear the quarantine attribute yourself: `xattr -dr com.apple.quarantine /Applications/Simpler.app`.

Either one is needed **once per fresh install, not once per version** — quarantine is applied by macOS to files a browser downloaded, and in-place updates (fetched and unpacked by Simpler's own updater, not a browser) never acquire it. You should not see this prompt again until the next time you install from a fresh `.dmg`.

## Verify and package

```bash
npm run test
npm run test:native
npm run build
npm run tauri -- build --bundles deb,rpm   # Linux
npm run tauri -- build --bundles dmg,app   # macOS
```

The Linux bundles are written under `src-tauri/target/release/bundle/`:

- `deb/Simpler_0.1.0_amd64.deb`
- `rpm/Simpler-0.1.0-1.x86_64.rpm`

The macOS bundles are written under `src-tauri/target/release/bundle/` (or `src-tauri/target/aarch64-apple-darwin/release/bundle/` when building with an explicit `--target`, as CI does):

- `macos/Simpler.app` and `macos/Simpler.app.tar.gz` (the self-update artifact)
- `dmg/Simpler_0.1.0_aarch64.dmg` (first-install only; the updater never touches it)

See [the MVP readiness record](docs/mvp-readiness.md) for the workflows verified in this checkout and the remaining environment-dependent checks.

## Releases

Current version: see `package.json`. Releases are published to [GitHub Releases](https://github.com/anmoya/simpler/releases) via `.github/workflows/release.yml` on `v*.*.*` tags, producing `.deb`, `.rpm`, and a self-updating `.AppImage` for Linux (see `docs/adr/0012-tauri-updater-with-appimage-for-linux.md`), plus a `.dmg` and a self-updating `.app.tar.gz` for Apple Silicon macOS (see `docs/adr/0015-unsigned-macos-distribution.md`). To cut a release, see `docs/release-checklist.md` or run `npm run release:cut -- <version>`.
