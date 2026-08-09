# Paste image from clipboard into a note

Status: done

## Parent

`.scratch/attachments/spec.md`

## What to build

When the user pastes an image (from the OS clipboard, e.g. a screenshot or a copied image) while the cursor is in `MarkdownEditor` (`src/components/MarkdownEditor.tsx`), save it as a real file and insert a Markdown image reference at the cursor.

- Save location: `assets/` inside the same folder as the current note (create the folder if it doesn't exist yet). Use `sanitize_child_name`/`resolve_workspace_path`-style validation on the Rust side, matching how other filesystem writes in this codebase are validated.
- Filename: `<YYYY-MM-DD-HHmmss>.<ext>` derived from the pasted image's MIME type (e.g. `.png` for `image/png`, `.jpg` for `image/jpeg`). If a file with that exact name already exists (same-second paste), append a short disambiguating suffix rather than overwriting.
- Insert `![](assets/<filename>)` at the cursor position, replacing any current selection.
- New native action needed under the `Filesystem` domain (e.g. `save-attachment`) taking the current note's folder and the image bytes (base64-encoded over the JSON envelope) and returning the relative path used, following the existing payload-struct → handler-fn → `dispatch_native_command` branch pattern. Add the typed wrapper in `src/native/commands.ts`.
- Only handle actual pasted image data (`clipboardData.files`/image `DataTransferItem`s) — pasting text continues to work exactly as before.

## Acceptance criteria

- [ ] Pasting an image while editing a note creates `assets/<timestamp>.<ext>` in that note's folder with the image bytes
- [ ] The editor inserts `![](assets/<timestamp>.<ext>)` at the cursor
- [ ] Pasting two images within the same second produces two distinct files, not an overwrite
- [ ] Pasting plain text is unaffected (existing paste behavior)
- [ ] Rust unit test covers `save-attachment` writing the file and returning the expected relative path
- [ ] A `MarkdownEditor` test simulates an image paste event and asserts the inserted Markdown and the native call made
- [ ] `npm run test` and `npm run test:native` pass

## Blocked by

- None — can start immediately.
