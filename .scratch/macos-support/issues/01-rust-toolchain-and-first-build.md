# Rust toolchain on the Mac and a first `tauri:dev` run

Status: ready-for-agent

## Parent

`.scratch/macos-support/spec.md`

## What to build

Nothing, initially — this is the prerequisite that unblocks every other ticket. The Mac has Node 24 and Xcode command line tools (`/Applications/Xcode.app/Contents/Developer`) but **no Rust** (`cargo not found`).

- Install Rust (rustup, stable, `aarch64-apple-darwin`).
- `npm ci`, then `npm run tauri:dev`.
- Record what breaks. The expectation from the grill is: the app launches, the window has no traffic lights and a Linux-style title bar, pasting is dead, and the GitHub connection state can't be read. Anything *else* that breaks is a finding worth its own ticket — the point of this ticket is to replace an expectation with an observation before the other tickets are written against it.
- `npm run test` and `npm run test:native` on the Mac, to see whether the existing suite passes on macOS before any changes.

## Acceptance criteria

- [ ] `npm run tauri:dev` launches Simpler on the Mac
- [ ] A Workspace can be opened, a note created, edited and reopened (typing works even though pasting doesn't)
- [ ] `npm run test` and `npm run test:native` results on macOS are recorded in the Comments below — pass or fail, with the failures named
- [ ] Any breakage not predicted by the grill is written up as a new ticket in this directory rather than fixed inline

## Blocked by

- None.

## Comments

Rust (rustup, stable, `aarch64-apple-darwin`, 1.97.1) installed via `rustup.rs`; `~/.cargo/env` needed sourcing since it wasn't yet on `PATH` in this shell. `npm ci` succeeded (217 packages).

`npm run tauri:dev` builds and launches: Vite dev server on `:1427`, then `cargo run` compiles `simpler` (debug, 1.99s incremental) and starts `target/debug/simpler` as a running process. Confirmed the process stays up (not an immediate crash) and was shut down cleanly afterwards. This agent has no GUI automation for native (non-Chrome) windows, so the visual/interactive parts of the grill's prediction — no traffic lights, Linux-style title bar, dead paste, unreadable GitHub connection state — were **not independently re-confirmed by eye or by hand** here; they're taken on the grill's authority for now and are exactly what tickets 03/04/06 exist to fix. Workspace-open/note-create/edit/reopen was likewise not driven interactively for the same reason — someone with hands on the Mac should do that pass once, but it is not expected to differ from the Rust/JS unit-level results below.

`npm run test`: **186/186 passed**, 11 files, no macOS-specific failures.

`npm run test:native`: **69/69 passed**, no macOS-specific failures. (5 unrelated `dead_code`/`unused_variable` warnings in `lib.rs`, pre-existing, not macOS-specific.)

Both suites being green on macOS with zero code changes means the "no test CI" gap (ticket 07) hasn't been silently masking a platform-specific unit-test failure — the platform-specific breakage is all in code paths (clipboard, keychain, window chrome) that today's suite doesn't exercise on either platform, which is exactly what tickets 02–06 add coverage for as they touch that code.

No breakage beyond the grill's prediction was found at the build/process level; nothing new to spin out as its own ticket from this pass.
