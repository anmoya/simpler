# Checklist continuation and empty-item exit

Status: done

## Parent

`.scratch/list-continuation/spec.md`

## What to build

Extend the Enter keymap added in issue 01 to also handle checklist items:

- Pressing Enter at the end of a line starting `- [ ] ` or `- [x] ` (checked or unchecked) inserts a new line starting with `- [ ] ` — always unchecked, regardless of whether the current item was checked.

Also add the "exit list on empty item" behavior, applying to all three marker families handled by this feature (bullet `- `/`* `/`+ `, ordered `N. `, checklist `- [ ] `/`- [x] `):

- If Enter is pressed on a list-item line whose content after the marker is empty (i.e. the user already has an empty `- ` / `1. ` / `- [ ] ` line with nothing typed after it), instead of inserting another marker, clear the current line's marker and leave a plain empty line, exiting the list — matching the common editor convention (e.g. how most Markdown editors and note apps break out of a list on a double-Enter-equivalent).

## Acceptance criteria

- [ ] Enter at the end of `- [ ] foo` produces a new line starting with `- [ ] `
- [ ] Enter at the end of `- [x] foo` produces a new line starting with `- [ ] ` (not `- [x] `)
- [ ] Enter on an empty `- ` line removes the marker and leaves a plain empty line (list exited)
- [ ] Enter on an empty `1. ` line removes the marker and leaves a plain empty line (list exited)
- [ ] Enter on an empty `- [ ] ` line removes the marker and leaves a plain empty line (list exited)
- [ ] A component/unit test in `MarkdownEditor.test.tsx` covers each case above
- [ ] `npm run test` passes

## Blocked by

- `.scratch/list-continuation/issues/01-continue-bullet-ordered-lists-on-enter.md`
