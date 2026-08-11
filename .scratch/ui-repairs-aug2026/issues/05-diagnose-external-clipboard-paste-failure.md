Status: done

## What to build

Diagnose why pasting text copied from *outside* Simpler (another app) into the
Markdown editor with Ctrl+V does nothing, while pasting text copied *inside* the
editor works fine, and pasting either external or internal text into other
inputs (e.g. Global Search) also works fine.

In `MarkdownEditor.tsx`, the editor's `keydown` handler intercepts Ctrl+V,
calls `preventDefault()`, and always routes through `pasteFromSystemClipboard`,
which first calls the native command `readClipboardImage()` (Rust, reads the OS
clipboard directly) before falling back to `navigator.clipboard.readText()` for
plain text. Since this path is skipped for internal copies (CodeMirror's default
paste handling never gets a chance to run once `preventDefault()` is called) and
never triggered at all for other inputs (they don't have this keydown
interception), the native clipboard read is the prime suspect — likely a
Wayland/WebKitGTK-specific issue reading clipboard content whose source
application is a different process than Simpler's own webview.

Add diagnostic logging (or reproduce via `npm run tauri:dev` with DevTools open)
around `pasteFromSystemClipboard` (`readClipboardImage()` and the
`navigator.clipboard.readText()` fallback) to determine exactly which call
fails, throws, or returns empty for externally-sourced text, and why.

## Acceptance criteria

- [ ] Reproduced the failure locally with `npm run tauri:dev` + DevTools console
- [ ] Confirmed whether `readClipboardImage()` or `navigator.clipboard.readText()`
      is the failure point for external text, with console evidence
- [ ] Root cause documented in this ticket

## Blocked by

None - can start immediately

## Comments

Reproduced live via `npm run tauri:dev` with DevTools, with diagnostic
logging around `readClipboardImage()` and `navigator.clipboard.readText()`.

Root cause: `readClipboardImage()` correctly returned its normal
"clipboard does not contain an image" fall-through, but
`navigator.clipboard.readText()` then rejected with
`NotAllowedError: The request is not allowed by the user agent or the
platform in the current context, possibly because the user denied
permission.` — WebKitGTK's Permissions model blocks the async Clipboard
API's text read even on this user-gesture-triggered Ctrl+V. Fixed in
[[06-fix-external-clipboard-paste-failure]] by adding a native
`read-clipboard-text` command (mirroring the existing image one) that
reads GTK's clipboard directly instead.
