# Close Sync Prompt only guards the in-app close button

The Close Sync Prompt (see CONTEXT.md) only appears for the in-app close action. A window-manager-initiated close (alt+F4, tiling WM close keybind, `hyprctl dispatch closewindow`) never shows it — that path is handled entirely by the Rust/GTK layer added to fix window-close reliability, and a live-tested attempt to route that path's close event back into the frontend (via `Window::close()` and via manually re-emitting `tauri://close-requested`) did not reach the webview. Until that gap is closed, a WM-initiated close always force-exits without prompting, even with changes pending Sync — that's a pre-existing risk (WM closes never synced before this feature either), not a regression introduced by it.

The prompt is a blocking dialog with no cancel option — it always resolves to closing, only choosing whether to wait for Sync first. While it's open, it pauses the bounded fallback timers (issue: window-close-reliability) that otherwise force-close the window; those resume once the user picks an option, so the reliability guarantee isn't weakened.

## Status

Accepted

## Amendment (2026-08-12): macOS

The exclusion above is a Linux finding, not a general rule. It exists because a WM-initiated close on Linux never reaches the webview — the live-tested attempts to route it there are recorded above. On macOS that path *does* reach the JS layer, so the reason for the exclusion does not apply and the decision has to be made on its merits instead.

On macOS the Close Sync Prompt appears for **Cmd+Q and the in-app close button**. It does **not** appear for the red traffic light, because that hides the window rather than ending anything (see ADR 0014): the process stays alive, Local Save has already written the file, and Sync resumes when the window comes back. A blocking prompt on an action a Mac user performs dozens of times a day, to guard against a loss that isn't happening, would be noise.

The consequence, accepted deliberately: with the window hidden there is no automatic Sync, since the scheduler lives in the frontend. Pending changes wait for the window to reappear.
