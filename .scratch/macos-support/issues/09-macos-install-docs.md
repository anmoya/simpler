# macOS install docs, including the Gatekeeper step

Status: ready-for-agent

## Parent

`.scratch/macos-support/spec.md` — reasoning in ADR 0015 ("Gatekeeper, once").

## What to build

A macOS section in `README.md` covering install and first launch, plus the macOS entries in `docs/release-checklist.md` and the manual smoke test in `docs/mvp-readiness.md`.

The Gatekeeper instructions have to be right, because the widely-known workaround no longer works: **Control-click → Open was removed as an unsigned-app bypass in macOS 15 Sequoia.** Document the two paths that do work:

1. Try to open the app, get refused, then System Settings → Privacy & Security → **"Open Anyway"**.
2. Or `xattr -dr com.apple.quarantine /Applications/Simpler.app`.

State plainly that this is **once per fresh install, not once per version** — quarantine is applied by LaunchServices to browser downloads, and the `.app.tar.gz` the updater fetches itself never acquires it. Also state plainly that Simpler is unsigned and why (ADR 0015), so the warning isn't mistaken for something having gone wrong.

Development setup on macOS also belongs here: Rust via rustup, Xcode command line tools, `npm run tauri:dev`. Note that `SIMPLER_GITHUB_CLIENT_ID` works the same as on Linux.

## Acceptance criteria

- [ ] `README.md` has a macOS install section with the correct macOS 15 Gatekeeper steps, and does **not** tell the user to Control-click → Open
- [ ] It says the app is unsigned and that the friction is once per install
- [ ] macOS development setup is documented
- [ ] `docs/release-checklist.md` covers the macOS artefacts
- [ ] `docs/mvp-readiness.md`'s manual smoke test gains its macOS-specific checks (traffic lights, Cmd+Q, Dock reopen, paste, drag-and-drop)
- [ ] Someone following the README on a clean Mac gets from `.dmg` to a running app without needing anything not written down

## Blocked by

- 08

## Comments

Added a "Install on macOS" section to `README.md` with the macOS 15 Gatekeeper steps (System Settings → Privacy & Security → "Open Anyway", and the `xattr -dr` fallback), explicitly stating Control-click → Open no longer works and that the friction is once per fresh install. Also updated the prerequisites list (rustup + Xcode CLT vs. Linux's WebKit deps + `secret-tool`), the GitHub setup paragraph (keychain backend differs, `SIMPLER_GITHUB_CLIENT_ID` doesn't), and the build/package section (macOS bundle targets and output paths, including the `--target`-suffixed path CI uses). `docs/release-checklist.md` gained three steps for the macOS manifest entry, a fresh-install launch check, and the self-update-without-a-Gatekeeper-prompt check. `docs/mvp-readiness.md`'s manual smoke test gained a macOS-specific subsection covering all six items the ticket names (traffic lights, red-light-hides, Dock reopen, Cmd+Q, paste, drag-and-drop).

**Not independently verified**: the acceptance criterion "someone following the README on a clean Mac gets from `.dmg` to a running app without needing anything not written down" needs an actual clean Mac and an actual signed `.dmg` from a real release (ticket 08's release job hasn't been run for real yet — see its comments). What's written is accurate to how ADR 0015 and this round's implementation actually behave, but the doc itself hasn't been proof-read against a live first-run experience.
