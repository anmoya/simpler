Status: done

## What to build

Fix the editor's fenced code block (```` ``` ````) rendering so it shows one
uniform background across the whole block, instead of a separate gray,
rounded-corner background applied per line/token.

Root cause: `markdownEditorTheme.ts` applies `backgroundColor:
var(--color-code-bg)` and `borderRadius: 4px` to the Lezer `tags.monospace` tag
via `HighlightStyle.define(...)`. Lezer's markdown grammar tags every monospace
token inside a fenced code block with `tags.monospace` — the same tag used for
inline code (`` `code` ``) — so each token/line gets its own pill-shaped
background instead of the whole block sharing one.

Inline code (`` `code` ``) should keep its current pill-style background;
fenced code blocks should get a single, full-width block background (no
per-token rounding), styled as a line/container decoration rather than a
per-tag highlight style. CodeMirro's `@codemirror/lang-markdown` package
distinguishes fenced code content from inline code in its parse tree (via
`CodeText`/`FencedCode` node types) — use that distinction rather than the
shared `monospace` tag to target the block styling.

## Acceptance criteria

- [ ] A fenced code block spanning multiple lines renders with one continuous
      background covering the full block, not per-line pill shapes
- [ ] Inline code spans keep their existing pill-style background, unaffected
- [ ] Works in both light and dark themes (verified via `--color-code-bg`)
- [ ] No regression in existing markdown syntax highlighting (headings, bold,
      italic, links, quotes)

## Blocked by

None - can start immediately
