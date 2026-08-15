# macOS window lifecycle: hide on red, reopen from the Dock, quit on Cmd+Q

Status: ready-for-agent

## Parent

`.scratch/macos-support/spec.md` — reasoning in ADR 0014 ("Window lifecycle") and the 2026-08-12 amendment to ADR 0011.

## What to build

macOS behaves like macOS: closing the window is not quitting.

- **Scope the Linux force-exit to Linux.** `on_window_event` in `lib.rs` currently calls `app.exit(0)` on `Destroyed`, and the GTK `delete-event` handler is already `cfg`-gated. The `Destroyed` force-exit becomes Linux-only. Leave the long comment block explaining the Wayland/tauri#10555 root cause intact — it's still true, it's just Linux's truth.
- **Red traffic light hides the window** instead of destroying it.
- **Dock click brings it back** (`RunEvent::Reopen`). Without this the app is a zombie in the Dock with no way to get a window back — that's the whole reason this ticket exists rather than just "don't exit".
- **Cmd+Q quits**, and is the only path that does.
- **Close Sync Prompt on macOS fires for Cmd+Q and the in-app close button, not for the red light.** Hiding loses nothing: the process lives, Local Save already wrote the file, Sync resumes when the window returns.

Accepted consequence, already recorded in the ADRs — do not try to fix it here: while the window is hidden there is **no automatic Sync**, because `automaticSyncScheduler.ts` lives in the frontend. Moving the scheduler into Rust is explicitly out of scope for this round.

## Acceptance criteria

- [ ] On the Mac: the red traffic light hides the window; the app stays in the Dock; no Close Sync Prompt appears
- [ ] On the Mac: clicking the Dock icon restores the window with the Workspace and active note intact
- [ ] On the Mac: Cmd+Q with changes pending Sync shows the Close Sync Prompt, and both options ("wait for Sync" / "close anyway") end in the process exiting
- [ ] On the Mac: Cmd+Q with nothing pending quits immediately
- [ ] On the Mac: the in-app close button behaves as the Close Sync Prompt spec describes
- [ ] On Linux: window close still exits the process, including a WM-initiated close (regression check against the window-close-reliability work — manual)
- [ ] Scheduler/prompt logic that can be tested without a window is covered by tests; `npm run test` and `npm run test:native` pass

## Blocked by

- 01

## Comments

Implemented: the `Destroyed` force-exit in `lib.rs` is now gated to Linux/BSD only. On macOS, `.setup()` swaps the default menu's predefined Quit item (whose accelerator is wired to the native `terminate:` selector — confirmed by reading `muda`/`tao` source, since that selector bypasses every Rust and JS hook and calls `exit()` directly) for a custom `MenuItem` with the same Cmd+Q accelerator but a plain click action, routed through `on_menu_event` into a `simpler://quit-requested` window event. `RunEvent::Reopen` (Dock click) shows and focuses the window when no window is visible, which required switching `Builder::run(context)` to `Builder::build(context)?` + `App::run(callback)` to get `RunEvent` access at all.

The hide-vs-destroy decision is made entirely in the existing JS `onCloseRequested` listener (App.tsx), reusing the pre-existing `skipCloseRequestedSyncRef` flag rather than adding new Rust-side interception: that flag is already set right before `performClose()`'s own `currentWindow.close()` call, so on macOS "flag set" now means "this CloseRequested came from our own decided close (in-app button or Cmd+Q, both funnel through `closeWindow()`)" and "flag unset" means "this is an actual unprompted native close request", which on macOS can only be the red traffic light (there is no separate WM-close path on macOS the way there is on Linux). This works because Tauri's internal window manager always forwards every `CloseRequested` to the JS listener when one is registered, regardless of platform or origin — confirmed by reading `tauri::manager::window::on_window_event` — so there was no way to distinguish red-light-vs-programmatic at the Rust level; the existing JS-side flag was the only usable signal, and it was already there for an unrelated reason (avoiding a double sync run on Linux).

Verified live on the Mac: `cargo build` and `npm run tauri:dev` succeed with this menu code active, the app launches without crashing (menu construction has no silent-failure path that would leave the native Quit in place undetected — confirmed via screenshot that the app's own menu bar under "Simpler" reads "Quit Simpler ⌘Q" as a plain item, not the OS-styled predefined one). `npm run test` (191/191) and `npm run test:native` (71/71) pass, including two new App.test.tsx cases that simulate the Rust-emitted `close-requested` (no prior decision → hides, never calls destroy) and `simpler://quit-requested` (routes through the same `closeWindow()` pipeline as the in-app button → destroys when there's nothing pending) events against a mocked window.

**Not independently re-verified by hand**: physically clicking the real red traffic light, physically clicking the Dock icon, and physically pressing Cmd+Q. This agent's earlier attempt to drive that verification via `osascript`/System Events GUI scripting was unreliable (button/window lookups failed) and at one point focus-switched to and screenshotted the user's own browser windows (Netflix/YouTube/ChatGPT tabs) — a privacy risk that outweighed finishing this checklist by force. Those three checks, plus the Linux WM-initiated-close regression check, need a human with hands on the actual hardware; the code path they'd exercise is otherwise verified as described above.

**Worth flagging explicitly**: the AC "the in-app close button behaves as the Close Sync Prompt spec describes" has no literal UI surface to click on macOS — ticket 04 hides `.titlebar__controls` (including the close button) entirely there, since the native traffic lights take over that job. On macOS the shared `closeWindow()` pipeline this AC is really about is reached only through Cmd+Q today (verified, see above and the App.test.tsx cases). That's a faithful reading of ADR 0011's amendment (Close Sync Prompt fires "for Cmd+Q and the in-app close button" — plural because Linux still has both, macOS effectively has one), not a gap, but it's worth a human's sign-off that this reading is the intended one before treating this AC as satisfied.
