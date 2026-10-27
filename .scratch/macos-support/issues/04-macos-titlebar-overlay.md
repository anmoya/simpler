# macOS title bar: native traffic lights over the webview

Status: ready-for-agent

## Parent

`.scratch/macos-support/spec.md` — reasoning in ADR 0014 ("Window decorations").

## What to build

Add `src-tauri/tauri.macos.conf.json` (Tauri 2 merges platform config over the base) setting the main window to `titleBarStyle: "Overlay"`. `tauri.conf.json` keeps `decorations: false` for Linux and gains no conditionals.

Then adapt the app's own title bar (the `.titlebar` header in `ClassicShell.tsx` and its rules in `styles.css`) on macOS only:

- Hide `.titlebar__controls` — the three buttons are the traffic lights' job now.
- Add left padding so the title doesn't sit underneath the traffic lights.
- Keep `data-tauri-drag-region` on the strip: it's still how the window is dragged.

Use the platform value from issue 02 rather than sniffing the user agent.

**Do not switch to full system decorations.** ADR 0013's drop-coordinate maths assumes the window origin and the viewport origin coincide, which holds under Overlay (the webview still spans the whole window) and breaks under system decorations. This is the reason Overlay was chosen.

## Acceptance criteria

- [ ] `src-tauri/tauri.macos.conf.json` exists and sets Overlay; `tauri.conf.json` is unchanged for Linux
- [ ] On the Mac: native traffic lights are visible and functional (close/minimise/zoom)
- [ ] On the Mac: the app's own min/max/close buttons are hidden, and the title is not obscured by the traffic lights
- [ ] On the Mac: dragging the title strip moves the window
- [ ] On Linux: the title bar is visually and functionally unchanged (manual check)
- [ ] The window still looks right at the 720px responsive breakpoint on both platforms

## Blocked by

- 02 (needs the platform value)
