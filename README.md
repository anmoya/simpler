# Simpler

Simpler is a Linux-first, local-first Markdown notes application. It opens a normal folder as a **Workspace**, edits Raw Markdown in place, and can synchronize a Git-backed Workspace through a Git remote.

## Run from a clean checkout

Prerequisites:

- Node.js 22 and npm
- Rust stable and Cargo
- Linux Tauri/WebKit build prerequisites for your distribution
- `git` for Workspace status, Sync, and cloning
- `curl` and `secret-tool` (`libsecret`) for GitHub Device Flow and credential storage

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

The application stores the resulting credential through `secret-tool`; it does not write the token to the Workspace. A Personal Access Token remains an advanced fallback in Settings. The app accepts GitHub repository URLs for connect and clone; its clone destination's parent folder must already exist.

## Verify and package

```bash
npm run test
npm run test:native
npm run build
npm run tauri -- build --bundles deb,rpm
```

The Linux bundles are written under `src-tauri/target/release/bundle/`:

- `deb/Simpler_0.1.0_amd64.deb`
- `rpm/Simpler-0.1.0-1.x86_64.rpm`

See [the MVP readiness record](docs/mvp-readiness.md) for the workflows verified in this checkout and the remaining environment-dependent checks.
