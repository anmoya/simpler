# macOS support

Status: ready-for-agent

## Source

`/grill-with-docs` session, 2026-08-12. Decisions recorded in ADR 0014 (macOS supported, Linux reference platform) and ADR 0015 (unsigned macOS distribution), with amendments to ADR 0011 (Close Sync Prompt), ADR 0012 (updater) and ADR 0013 (drag-and-drop), and a revised *Close Sync Prompt* definition in `CONTEXT.md`.

## What to build

Simpler runs on macOS (Apple Silicon, macOS 15) as an installable `.dmg` that self-updates in place, feels native where the platforms genuinely differ, and doesn't disturb the Linux behaviour that already works.

Read ADR 0014 and ADR 0015 before starting — they carry the reasoning, this file only carries the work.

Shape of the round:

1. **Get on the platform** (01–02). Toolchain and a baseline run, then the prefactor that lets the frontend know where it's running — extracted first because paste and the title bar both need it, and without it one would sit blocked on a detail buried inside the other.
2. **Make it usable** (03, 06). Paste and the keychain. Paste is not a gap on macOS today, it's a total break: the Cmd+V interception in `MarkdownEditor.tsx` `preventDefault()`s unconditionally and routes to a native command that answers *"clipboard text reads are only supported on Linux"*.
3. **Make it feel native** (04–05). Traffic lights, window lifecycle, Dock reopen.
4. **Make it shippable** (07–09). Test CI across both platforms, macOS release job, install docs.
5. **Verify what tests can't** (10–11). Live checks on a real Mac.

Once 02 lands, 03 / 04 / 05 / 06 are independent of each other and can go in any order.

## Constraints that apply to every ticket

- **Linux behaviour must not change.** Every divergence is `cfg(target_os)` on the Rust side or a platform check on the frontend side, never a replacement of the Linux path.
- Platform-specific window config goes in `src-tauri/tauri.macos.conf.json` (Tauri merges it over the base), not conditionals in `tauri.conf.json`.
- New outside-world collaborators follow ADR 0007: real subprocess behind a trait, pure logic testable against a fake.
- Green tests are not evidence for anything on the manual-verification list. See ADR 0013 for why this project states that so bluntly.

## Blocked by

- None — 01 can start immediately.
