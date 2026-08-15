# macOS is a supported platform; Linux stays the reference platform

Simpler runs on macOS as a first-class target for daily use, but Linux remains the platform that settles ties. When a design decision can't satisfy both, Linux wins and macOS gets whatever divergence keeps it feeling native. macOS is not co-primary: a feature is not blocked from shipping because it hasn't been exercised on a Mac.

The reason is verification, not preference. The parts of Simpler that break per-platform — clipboard reads, drag-and-drop, window lifecycle, window decorations — are all verified by hand, on whichever machine is in front of the developer. A promise of first-class parity across two platforms is a promise this project has no automated way to keep, and ADR 0013 records what happens when a platform-specific path is declared finished on the strength of green tests that never exercised it.

"Supported" therefore means: macOS is built, released, installed and used; its divergences are deliberate and documented here; and its manual checks are listed in the release smoke test. It does not mean every ticket carries a macOS acceptance criterion.

## Deliberate divergences

These are design, not debt. Each one exists because the native platform behaviour differs and matching Linux would produce an app that feels borrowed:

- **Window decorations.** Linux runs `decorations: false` with a title bar drawn inside the webview. macOS runs `titleBarStyle: "Overlay"` — the native traffic lights float over the webview, and the app's own title bar keeps the drag region and title but hides its three buttons. Overlay is chosen over full system decorations specifically because the webview still spans the whole window, preserving the window-origin/viewport-origin coincidence that ADR 0013's drop-coordinate maths depends on. Platform-specific window config lives in `src-tauri/tauri.macos.conf.json`, which Tauri merges over the base config, so the Linux config stays free of conditionals.

- **Window lifecycle.** On Linux, closing the window exits the process (`app.exit(0)` on `Destroyed`, plus the GTK `delete-event` handler from the window-close-reliability work). On macOS, the red traffic light hides the window and leaves the app running; clicking the Dock icon brings it back (`RunEvent::Reopen`); Cmd+Q is the only real exit. The Linux force-exit becomes Linux-only rather than being generalised.

  The consequence, accepted knowingly: while the window is hidden on macOS there is **no automatic Sync**, because `automaticSyncScheduler.ts` lives in the frontend and the frontend lives in the window. Hidden-with-pending-changes waits for the window to come back. This is the same bargain as a closed app, not a new class of data loss — Local Save has already written the file to disk.

- **Clipboard paste.** The unconditional Cmd/Ctrl+V interception in `MarkdownEditor.tsx` becomes Linux-only. It exists solely as a workaround for WebKitGTK not exposing clipboard bytes to the DOM; WKWebView on macOS has no such defect, so macOS lets CodeMirror's native paste handle text and the already-written DOM `paste` handler handle images. Writing an NSPasteboard implementation would be building a workaround for a problem macOS does not have. Left as-is, this was not a missing feature on macOS but a total break: the native command returns *"clipboard text reads are only supported on Linux"*, so pasting anything at all failed.

  The frontend needs to know its platform to make this split. That is exposed through the existing `native_command` bus, the same way install kind already is, rather than adding Tauri's `os` plugin for one value.

- **Keychain.** `secret-tool` (libsecret) is Linux-only. macOS gets a second `GitHubCredentialStore` implementation shelling out to the `security` CLI (`add-generic-password` / `find-generic-password` / `delete-generic-password`), selected by `cfg(target_os)`. A cross-platform `keyring` crate was rejected: it contradicts the established pattern of outside-world collaborators as real subprocesses behind traits (ADR 0007), it would force re-verification of the Linux path that already works, and it adds a native dependency to build. The existing fake-based tests keep working untouched.

  Worth stating because it lowers the stakes: this token does not authenticate Sync. Per ADR 0010, `git pull`/`push` use System Git Credentials directly. The keychain only backs the GitHub connection state and the GitHub Connection Wizard.

## Automated guard

A CI workflow runs `npm run test` and `npm run test:native` on an `ubuntu-22.04` + `macos-latest` matrix on push. Before this, the repo had no test CI at all — acceptable with one platform and one machine, and no longer acceptable the moment the code carries two mutually invisible compilation branches. Without it, a `cfg(target_os = "macos")` block that fails to compile on Linux is discovered when the release tag has already been pushed.

What it does not do, so it isn't mistaken for more than it is: it proves both platforms compile and pass the tests that exist. Clipboard, drag-and-drop, traffic lights and window lifecycle remain manual checks on a real Mac.

## Status

Accepted (2026-08-12)
