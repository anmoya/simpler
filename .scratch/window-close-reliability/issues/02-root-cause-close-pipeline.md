Status: ready-for-agent

# Root-cause why onCloseRequested never reaches destroy()

## Parent

.scratch/window-close-reliability/spec.md

## What to build

Issue 01 adds a defensive fallback so the window always closes eventually, but it's a safety net, not a fix — right now nobody knows *why* a close request doesn't already result in the process exiting. Root-cause and fix the actual pipeline so the fallback in issue 01 is rarely or never needed.

Investigation starting points (from live reproduction on a Hyprland/Wayland desktop build, not yet conclusive):

- Confirmed: a window-manager-level close request (`hyprctl dispatch closewindow <address>`, equivalent to a native close control or WM close keybind) leaves the process alive and the window still `mapped: true`.
- Confirmed: `kill` (SIGTERM) alone cleanly exits the process and its `WebKitWebProcess`/`WebKitNetworkProcess` children — so nothing at the OS/process level blocks a normal exit; the app just never requests one.
- Unconfirmed/worth checking:
  - Whether `getCurrentWindow().onCloseRequested(...)`'s registration (`src/app/App.tsx` ~line 75, inside a `useEffect` with an async `.then((unlisten) => ...)`) reliably completes before a close request can arrive — a race where the listener isn't registered yet when Tauri's default WINDOW_CLOSE_REQUESTED path is disabled but our JS one is also not ready could plausibly wedge in unexpected ways.
  - Whether `requestCloseSync()` → `schedulerRef.current?.appClosing()` → the scheduler's `requestSync` → `syncWorkspaceRef.current` chain (`src/app/App.tsx`) throws, hangs, or otherwise never lets the `onCloseRequested` handler's promise settle in a real environment (vs. how it behaves in Vitest, where Tauri APIs are absent and the whole block is skipped via the `try/catch` around `getCurrentWindow()`).
  - Whether Tauri's default "exit when last window closes" behavior is actually active for this app — `src-tauri/src/lib.rs`'s `pub fn run()` uses a bare `tauri::Builder::default()...run(...)` with no custom `on_window_event`/`RunEvent` handling, so this should be the default, but verify rather than assume, e.g. by testing what happens when `destroy()` is confirmed to run (with the issue 01 fallback in place, does the process actually exit, or does it linger even after the window is destroyed?).
  - Whether `WebKitCache` corruption is a contributing factor — repeated hard-link warnings were observed in dev-mode logs (`Failed to create hard link from .../WebKitCache/Version 17/Blobs/... to .../Records/...`). Test whether this reproduces on a clean cache and whether it's dev-mode-only (unlikely to matter for production/bundled builds, but worth ruling out explicitly) or also present in a release build.

## Acceptance criteria

- [ ] Root cause is identified and documented (in the PR/commit description at minimum) with enough detail that a future regression wouldn't require re-discovering it from scratch.
- [ ] The actual fix addresses the root cause, not just the fallback from issue 01 — after this fix, a normal close request (window-manager-level close, and the in-app close button) results in the process exiting promptly, without needing to fall through to the bounded timeout added in issue 01.
- [ ] Manually re-verified on a Linux desktop build the same way issue 01 was: dispatch a window-manager-level close request and confirm the process exits (no orphaned `target/debug/simpler` or bundled-binary process, no orphaned `WebKitWebProcess`/`WebKitNetworkProcess`).
- [ ] Regression coverage added at whatever layer is appropriate given the actual root cause (Rust unit/integration test if it's a Rust-side issue, Vitest if it's JS-side, or a documented manual QA step in the PR if the root cause is environmental/native and can't be captured in the existing test suites).

## Blocked by

- Guarantee the window closes even if app-closing logic fails (01) — ships first as a safety net so users aren't stuck while this is investigated
