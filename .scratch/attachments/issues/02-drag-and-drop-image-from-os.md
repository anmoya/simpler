# Drag-and-drop image from the OS file explorer

Status: done

## Parent

`.scratch/attachments/spec.md`

## What to build

Dragging an image file from the OS file explorer and dropping it onto `MarkdownEditor` saves and inserts it the same way as clipboard paste (issue 01) — reuse the `save-attachment` native action and the same filename/location rules, rather than duplicating that logic.

Drop the image at the cursor position closest to the drop location (CodeMirror exposes a way to map a mouse position to a document position — use it rather than always inserting at the last cursor position, since drag-and-drop drop points are often far from where the cursor happened to be).

Only image files trigger this path; dropping other file types should not be silently swallowed — leave existing/default drop behavior (or a no-op, whichever is currently the case) for non-image files, and confirm which is true in the codebase today before deciding.

## Acceptance criteria

- [ ] Dropping a single image file onto the editor saves it to `assets/` (same naming/location rules as issue 01) and inserts `![](assets/<filename>)` at the drop position
- [ ] Dropping a non-image file does not go through the attachment path (existing behavior for non-image drops is preserved)
- [ ] Dropping an image far from the current cursor inserts the Markdown at the drop location, not the old cursor location
- [ ] A `MarkdownEditor` test simulates a drop event with image file data and asserts the inserted Markdown
- [ ] `npm run test` passes

## Blocked by

- `.scratch/attachments/issues/01-paste-image-from-clipboard.md`
