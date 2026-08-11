Status: done

## What to build

Fix the confirmed root cause (from issue 05) preventing externally-copied text
from pasting into the Markdown editor. The fix must preserve existing working
behavior: pasting images from the system clipboard (the reason
`readClipboardImage()` exists — see the comment in `MarkdownEditor.tsx` about
WebKitGTK not exposing image bytes via the DOM `paste` event on Linux), and
pasting internally-copied text within the editor.

The exact change depends on issue 05's findings — do not guess at a fix before
that diagnosis lands.

## Acceptance criteria

- [ ] Pasting text copied from another application into the editor inserts that
      text correctly
- [ ] Pasting an image from the system clipboard still works (regression check)
- [ ] Pasting text copied within the editor itself still works (regression check)
- [ ] Existing paste-related tests still pass; new test added for the failure
      mode found in issue 05 where feasible

## Blocked by

- `.scratch/ui-repairs-aug2026/issues/05-diagnose-external-clipboard-paste-failure.md`
