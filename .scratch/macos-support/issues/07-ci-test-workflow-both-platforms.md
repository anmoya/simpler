# CI test workflow across Linux and macOS

Status: ready-for-agent

## Parent

`.scratch/macos-support/spec.md` — reasoning in ADR 0014 ("Automated guard").

## What to build

The repo has **no test CI**: `.github/workflows/` contains only `release.yml`, which fires on a `v*.*.*` tag and only builds. Tests run when someone runs them.

That was coherent with one platform and one machine. It stops being coherent the moment the code carries `cfg(target_os = "linux")` and `cfg(target_os = "macos")` branches that no single compiler invocation ever sees together — the failure mode is discovering that macOS-authored code doesn't compile on Linux *after* the release tag is pushed.

Add `.github/workflows/test.yml`, on push and pull request:

- Matrix: `ubuntu-22.04` and `macos-latest`.
- `npm ci`, `npm run test`, `npm run test:native`.
- Linux needs the same build dependencies the release job installs (`libgtk-3-dev`, `libwebkit2gtk-4.1-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `patchelf`); macOS needs none of them.
- Cache cargo and npm — the macOS runner is the slow one.

The repo is public, so both runners are free.

## Acceptance criteria

- [ ] `.github/workflows/test.yml` runs both suites on both platforms on push and PR
- [ ] Both platforms are green on `main` at the time this ticket closes
- [ ] A deliberate `cfg(target_os = "macos")` compile error is caught by the Linux job (verify once on a scratch branch, then revert)
- [ ] The release workflow is left alone — this is a separate workflow, not an addition to it

## Notes

Worth writing in the workflow's own comment so nobody mistakes its coverage: this proves both platforms compile and pass the tests that exist. Clipboard, drag-and-drop, traffic lights and window lifecycle stay manual.

## Blocked by

- None — can start immediately. Most useful once 02–06 have introduced the platform branches it exists to guard.

## Comments

Added `.github/workflows/test.yml`: `ubuntu-22.04` + `macos-latest` matrix (`fail-fast: false` so one platform's failure doesn't hide the other's), triggered on push and pull_request. Linux build deps installed conditionally (`if: runner.os == 'Linux'`); macOS gets none, matching the ticket. Cargo/npm caching via `Swatinem/rust-cache` (scoped to `src-tauri`) and `actions/setup-node`'s built-in `cache: npm`. `release.yml` untouched — confirmed via diff, this is a separate file.

**Not independently verified**: actually pushing this to GitHub and watching both matrix legs go green, or pushing a deliberate `cfg(target_os = "macos")` compile error to a scratch branch to confirm the Linux job catches it. Doing either means pushing to the remote, which this agent treats as an action needing the user's go-ahead rather than something to do unattended mid-implementation. Locally, `npm run test` and `npm run test:native` both pass on this Mac as of this round (191 JS tests, 71 Rust tests — see tickets 01–06's comments), which is what each matrix leg runs; the workflow YAML itself was hand-checked against `release.yml`'s existing structure and dependency list rather than run through a validator (no `yamllint`/`actionlint` available in this environment). Worth a maintainer pushing this once and watching the Actions tab before considering the acceptance criteria fully closed.
