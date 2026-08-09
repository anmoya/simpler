# Auto-collapse sidebar by window width

Status: done

## Parent

`.scratch/collapsible-sidebar/spec.md`

## What to build

Extend the collapse mechanism from issue 01 so the sidebar automatically switches to the icon rail when the window narrows below a threshold (pick a value below the existing 720px breakpoint in `styles.css`, since 720px already triggers a different stacked layout — e.g. ~480–520px, tuned to where the icon rail actually starts making sense over the stacked layout), and automatically returns to full width once the window widens back past it.

The automatic state and the manual toggle (issue 01) need to coexist sensibly: a manual expand while the window is still narrow should be respected (don't immediately re-collapse it out from under the user) until the window is resized again or the user manually collapses it again. Track "auto-collapsed" separately from "manually collapsed" so the persisted per-device preference from issue 01 isn't overwritten by automatic width-based changes.

## Acceptance criteria

- [ ] Narrowing the window below the threshold auto-collapses the sidebar to the icon rail
- [ ] Widening the window back above the threshold auto-expands it again (if the user hasn't manually collapsed it)
- [ ] Manually expanding the sidebar while the window is still narrow keeps it expanded until the next resize crossing the threshold, rather than snapping back immediately
- [ ] A user's manual collapse preference (issue 01) is not silently overwritten by automatic width-based state once the window widens again
- [ ] A `ClassicShell` test simulates a narrow viewport (mocking window width/resize) and asserts the sidebar collapses, then widens and asserts it expands
- [ ] `npm run test` passes

## Blocked by

- `.scratch/collapsible-sidebar/issues/01-manual-collapse-toggle-and-overlap-fix.md`
