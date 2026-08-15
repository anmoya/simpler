# Live check: image drag-and-drop on macOS

Status: ready-for-agent

## Parent

`.scratch/macos-support/spec.md` — see the 2026-08-12 amendment to ADR 0013.

## What to build

Nothing, unless it fails. This is a verification ticket.

ADR 0013 records "macOS and Windows are consciously left uncovered" for image drag-and-drop, but that was a scope decision, not a technical finding. Tauri's native drag-drop channel is cross-platform, so `onDragDropEvent` may already fire on macOS with no code change. There is no evidence either way, and this ADR is emphatic that a passing suite is not evidence.

Drag a real image file from Finder into an open note on the Mac, with the app built from this branch.

- **If it works**: amend the ADR 0013 macOS section with the observed result, and check that the insertion point matches the pointer position — the coordinate translation divides by the monitor scale factor, and a Retina display is a 2x scale factor, so this is exactly where an off-by-scale bug would show up. Test it on an external display too if one is available.
- **If it doesn't work**: record what was observed (does `dragover` fire? does the native channel fire at all?) and open a separate ticket. Do not patch it inside this round — ADR 0013 exists because this feature was twice declared finished against a channel that received nothing.

Also confirm `IMPORTABLE_IMAGE_EXTENSIONS` in `lib.rs` and `importableImageExtensions` in `droppedImagePath.ts` are still in step, since a mismatch turns a silent no-op into a visible error.

## Acceptance criteria

- [ ] A real drag from Finder into a note has been performed on the Mac and the result recorded in the Comments below
- [ ] ADR 0013's macOS amendment states the observed outcome instead of "unverified"
- [ ] If it works: the image lands in `assets/`, the Markdown reference is inserted at the pointer position, and the position is correct on a Retina display
- [ ] If it doesn't: a separate ticket exists with the observations, and ADR 0013 says so

## Blocked by

- 04 (the title bar decision affects the coordinate assumption this checks)

## Comments

Not performed. This ticket is explicitly a live-hands check — dragging a real file from Finder into a running app window — and this agent has no reliable, safe way to drive that: Chrome browser automation doesn't reach a native Tauri window, and an earlier attempt in this same round to use `osascript`/System Events GUI scripting for a related check (ticket 05) was unreliable (window/button lookups failed) and at one point focus-switched to and screenshotted the user's own browser windows — a mistake not worth repeating to force this one through.

What *was* done, per the ticket's own secondary task: confirmed `IMPORTABLE_IMAGE_EXTENSIONS` in `lib.rs` (`png, jpg, jpeg, gif, webp, bmp`) and `importableImageExtensions` in `droppedImagePath.ts` are still in step — they are, unchanged by this round.

ADR 0013 is left saying "Status: unverified" rather than being edited to claim an outcome that wasn't observed — the whole point of that ADR, restated in its own text, is that this status must come from an actual drag on actual hardware. Someone with hands on the Mac needs to do the drag, watch whether `dragover`/the native channel fires, and either amend the ADR with the real result or open the follow-up ticket the "if it doesn't work" branch calls for.
