# 05 — Isolate editor content from AppState

**What to build:** Typing in the editor no longer re-renders the sidebar, Workspace Tree, or Command Palette. The editor owns its own live content buffer and only reports changes upward into the shared `AppState` when a save is actually flushed (via the debounce module from ticket 02), instead of on every keystroke.

**Blocked by:** 02 (needs the Local Save debounce module's flush signal to know when to notify `AppState`)

**Status:** implemented

- [x] The actively-edited note's live content lives in the editor (`MarkdownEditor.tsx` or a thin wrapper), not in the shared `AppState` object that `ClassicShell.tsx` and its descendants read from.
- [x] `App.tsx`/`ClassicShell.tsx` are notified of content changes only when ticket 02's debounce module flushes, not on every keystroke.
- [x] Switching the active note still goes through the existing `AppState`-driven flow, unchanged.
- [x] A Vitest + Testing Library test asserts (e.g. via a render-count spy) that typing in the editor does not cause sidebar/Workspace Tree components to re-render.
- [x] A test confirms content still reaches `AppState`/disk correctly after a flush.
