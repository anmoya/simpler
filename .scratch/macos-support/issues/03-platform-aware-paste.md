# Platform-aware paste (fixes pasting being entirely broken on macOS)

Status: ready-for-agent

## Parent

`.scratch/macos-support/spec.md` — reasoning in ADR 0014 ("Clipboard paste").

## What to build

Today the `keydown` handler in `MarkdownEditor.tsx` intercepts `ctrlKey || metaKey` + `v` **unconditionally**, calls `preventDefault()`, and routes to the native clipboard command. On macOS that command returns *"clipboard text reads are only supported on Linux"*, so **pasting anything — text included — silently fails**. This is a break, not a missing feature.

Make the interception Linux-only, using the platform value from issue 02. On macOS, don't `preventDefault()` the paste shortcut: CodeMirror's native paste handles text, and the DOM `paste` handler already written a few lines below (currently unreachable on Linux) handles images. No new native clipboard code — WKWebView exposes clipboard bytes to the DOM, so the GTK workaround has nothing to work around.

Keep the comment in `pasteFromSystemClipboard` explaining *why* the native path exists, and extend it to say why macOS skips it. The next person to read that code should not have to guess whether the Linux behaviour was an accident.

## Acceptance criteria

- [ ] On macOS the Cmd+V shortcut is not intercepted; on Linux the existing native path is unchanged
- [ ] Live on the Mac: Cmd+V pastes **plain text** into a note
- [ ] Live on the Mac: Cmd+V pastes an **image** copied from another app, saving it into `assets/` and inserting a Standard Markdown reference — the same result the Linux path produces
- [ ] Live on Linux: pasting text and images still works (regression check, manual — the automated tests can't see this)
- [ ] Component tests cover the platform branch in isolation; `npm run test` passes

## Notes

Per ADR 0013's standard, the automated tests here prove the branch logic, not that pasting works. Both live checks above are the actual acceptance.

## Blocked by

- 02
