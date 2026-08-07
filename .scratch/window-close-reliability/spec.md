Status: ready-for-agent

# Window Close Reliability

## Problem Statement

The app window does not reliably close. Confirmed live on a Linux/Wayland (Hyprland) desktop build:

- Found two `target/debug/simpler` processes from a prior dev session still running and fully visible (`mapped: true` in Hyprland) a day later — evidence the bug happens in real usage, not just a hypothetical.
- Reproduced fresh: dispatching a window-manager-level close request (`hyprctl dispatch closewindow`, functionally the same signal a native close control, a taskbar/dock "close", or a WM close keybind would send) leaves the process alive and the window still mapped.
- Calling the app's own `getCurrentWindow().close()` (the exact call the in-app close button makes, since `tauri.conf.json` sets `"decorations": false` and there is no native OS close control to fall back on) also did not visibly close the window within the observation window during live testing.
- Plain `kill` (SIGTERM) does cleanly terminate the process and its `WebKitWebProcess`/`WebKitNetworkProcess` children — no zombies left behind. So nothing at the OS level is blocking termination; the app just never voluntarily follows through on a close request.

Relevant code:
- `src/app/App.tsx` — a `useEffect` (~line 75) registers `getCurrentWindow().onCloseRequested(() => { requestCloseSync() })`; `requestCloseSync` calls `schedulerRef.current?.appClosing()`. `closeWindow` (~line 141) calls `getCurrentWindow().close()` directly (used by the in-app close button).
- `src-tauri/src/lib.rs` `pub fn run()` uses `tauri::Builder::default()...run(...)` with no custom `on_window_event`/`RunEvent` handling — default Tauri exit-on-last-window-closed behavior is assumed but unverified.
- `@tauri-apps/api`'s `onCloseRequested` wrapper only calls `window.destroy()` if the JS handler resolves without `event.preventDefault()` being called — if the handler throws/rejects, or never resolves, `destroy()` is never reached and the window is stuck open with no fallback.

Root cause was not pinned during live investigation (diagnostic instrumentation — `window.alert`, `setTitle` probes, clearing a corrupted-looking `WebKitCache` dir that had hard-link warnings in the logs — did not surface a clear culprit before investigation was stopped for time). Both issues below can be picked up independently; issue 01 ships a safety net regardless of root cause, issue 02 does the actual root-cause fix.

## Solution

1. Make window close unconditionally succeed even if something in the app-closing JS logic throws or hangs (defensive fallback).
2. Root-cause why the close request pipeline doesn't reach `destroy()`/process exit today, and fix it properly.

## Out of Scope

- Any change to the automatic-sync-on-close behavior itself (`schedulerRef.current?.appClosing()` / `AutomaticSyncScheduler.appClosing()`) beyond making sure it can't block closing.
- Production packaging/bundling concerns unrelated to close behavior.
