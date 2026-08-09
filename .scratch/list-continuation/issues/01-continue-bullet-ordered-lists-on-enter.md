# Continue bullet/ordered lists on Enter

Status: ready-for-agent

## Parent

`.scratch/list-continuation/spec.md`

## What to build

In the CodeMirror editor (`src/components/MarkdownEditor.tsx`), pressing Enter while the cursor is at the end of a line that starts a bullet list item (`- `, `* `, or `+ `) inserts a new line starting with the same marker, so the user can keep typing the next item without retyping the syntax.

Pressing Enter on a line starting an ordered list item (`1. `, `2. `, …) inserts a new line with the marker's number incremented by one, re-numbering only the newly inserted line (do not renumber the rest of the list).

This only fires when the cursor is positioned inside/at the end of a list-item line — normal Enter behavior elsewhere in the document is unaffected. Implement as a CodeMirror keymap extension added alongside `basicSetup` in the existing `extensions` array, high enough priority to run before the default Enter handling for this specific case (fall through to default behavior when the line isn't a list item).

## Acceptance criteria

- [ ] Enter at the end of a line `- foo` produces a new line starting with `- `
- [ ] Enter at the end of a line `* foo` produces a new line starting with `* `
- [ ] Enter at the end of a line `+ foo` produces a new line starting with `+ `
- [ ] Enter at the end of a line `1. foo` produces a new line starting with `2. `
- [ ] Enter at the end of a line `9. foo` produces a new line starting with `10. `
- [ ] Enter in the middle of a non-list line (e.g. plain paragraph text) keeps default CodeMirror Enter behavior (no marker inserted)
- [ ] A component/unit test in `MarkdownEditor.test.tsx` dispatches an Enter keypress in each list context above and asserts the resulting document content
- [ ] `npm run test` passes

## Blocked by

- None — can start immediately.
