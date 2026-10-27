# 02 — Debounce Local Save

**What to build:** Typing in a note no longer triggers a native write on every keystroke. A small, independently-testable debounce/state-machine module (parallel in spirit to `automaticSyncScheduler.ts`, not merged into it) decides when the in-progress edit actually gets flushed to disk via `writeNote`, after a pause in typing. From the user's perspective, Local Save still feels automatic — the only change is that it no longer runs on every character.

**Blocked by:** None — can start immediately

**Status:** implemented

- [x] A debounce module owns the decision of when to flush a note's content to `writeNote`, coalescing rapid keystrokes into a single write after a pause.
- [x] The module flushes immediately (not waiting out the debounce window) when the user switches notes or the app is closing, so no in-progress edit is lost on navigation/close.
- [x] Vitest unit tests exercise the module against a fake clock and fake write function, following `automaticSyncScheduler.ts`'s pattern of testing a state machine independent of React: rapid-keystroke coalescing, flush-after-pause, flush-on-note-switch, flush-on-close.
- [x] `App.tsx`'s `changeNoteContent` path is wired to this module instead of calling `writeNote` directly on every content change.
- [x] No change to `automaticSyncScheduler.ts`'s own scheduling logic or to the Sync flow.
