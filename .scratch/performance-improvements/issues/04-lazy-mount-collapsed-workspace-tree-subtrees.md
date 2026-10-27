# 04 — Stop mounting collapsed Workspace Tree subtrees in the DOM

**What to build:** Collapsed folders in the Workspace Tree sidebar no longer keep their descendant DOM nodes mounted (currently hidden only via `inert`/`aria-hidden` for a CSS transition). A Workspace with thousands of files stays smooth to scroll and expand/collapse, because collapsed content isn't paid for in the DOM. The existing expand/collapse CSS transition and behavior from Workspace Tree collapsible folders (`.scratch/workspace-tree-collapse/spec.md`) is preserved exactly — this is a rendering-strategy change only, with no user-visible UX change.

**Blocked by:** None — can start immediately

**Status:** implemented

- [x] Collapsed folders' descendant note/folder elements are absent from the DOM, not merely visually hidden.
- [x] Expanding a folder mounts its descendants; collapsing it removes them again.
- [x] The existing collapse/expand CSS transition (from `.scratch/workspace-tree-collapse/spec.md`) still works, whichever approach is chosen (lazy-mount-on-expand or a virtualization library).
- [x] A Testing Library test asserts collapsed folders' descendant elements are absent from the DOM, and present after expanding.
- [x] Existing Workspace Tree collapse/expand tests continue to pass.
