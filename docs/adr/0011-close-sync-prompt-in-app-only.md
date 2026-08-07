# Close Sync Prompt only guards the in-app close button

The Close Sync Prompt (see CONTEXT.md) only appears for the in-app close action. A window-manager-initiated close (alt+F4, tiling WM close keybind, `hyprctl dispatch closewindow`) never shows it — that path is handled entirely by the Rust/GTK layer added to fix window-close reliability, and a live-tested attempt to route that path's close event back into the frontend (via `Window::close()` and via manually re-emitting `tauri://close-requested`) did not reach the webview. Until that gap is closed, a WM-initiated close always force-exits without prompting, even with changes pending Sync — that's a pre-existing risk (WM closes never synced before this feature either), not a regression introduced by it.

The prompt is a blocking dialog with no cancel option — it always resolves to closing, only choosing whether to wait for Sync first. While it's open, it pauses the bounded fallback timers (issue: window-close-reliability) that otherwise force-close the window; those resume once the user picks an option, so the reliability guarantee isn't weakened.

## Status

Accepted
