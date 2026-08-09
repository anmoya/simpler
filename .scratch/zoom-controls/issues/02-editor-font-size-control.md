# Editor font size control

Status: done

## Parent

`.scratch/zoom-controls/spec.md`

## What to build

Add an independent font-size control for the CodeMirror editor content only (`MarkdownEditor.tsx`/`markdownEditorTheme.ts`), separate from the UI zoom added in issue 01 — this one does not touch the sidebar/toolbar.

- Discrete steps, default matching the current `--font-size-body`.
- Persist per device in `localStorage` (new key, e.g. `simpler.editorFontSize`), same pattern as `themeMode`.
- Keyboard shortcuts distinct from UI zoom's plain Ctrl+/Ctrl- (both can't own the same combo) — e.g. Ctrl/Cmd+Shift+`=`/`-`/`0`. Wire into the same `handleKeyDown` in `ClassicShell.tsx`.
- Add matching `ShellCommand` entries for Command Palette/Command Help.
- Apply the size via a CSS variable read by `markdownEditorTheme()` (CodeMirror theme extension), not by touching `basicSetup`/the document model.

## Acceptance criteria

- [ ] Ctrl/Cmd+Shift+`+` increases editor font size one step, up to a sane max
- [ ] Ctrl/Cmd+Shift+`-` decreases it one step, down to a sane min
- [ ] Ctrl/Cmd+Shift+`0` resets to default
- [ ] Font size persists across restarts (localStorage), independent of UI zoom's stored value
- [ ] Changing editor font size does not affect sidebar/toolbar sizing (verifies independence from issue 01)
- [ ] The three actions appear in Command Palette and Command Help with their shortcuts
- [ ] A `MarkdownEditor` test asserts the CSS variable/computed style changes when the size changes
- [ ] `npm run test` passes

## Blocked by

- `.scratch/zoom-controls/issues/01-ui-zoom-control.md`
