import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { Prec } from "@codemirror/state";
import { tags } from "@lezer/highlight";

const markdownHighlightStyle = HighlightStyle.define([
  {
    tag: tags.heading1,
    fontFamily: "var(--font-family-heading)",
    fontWeight: "700",
    color: "var(--color-heading)",
  },
  {
    tag: tags.heading2,
    fontFamily: "var(--font-family-heading)",
    fontWeight: "600",
    color: "var(--color-heading)",
  },
  {
    tag: [tags.heading3, tags.heading4, tags.heading5, tags.heading6],
    fontFamily: "var(--font-family-heading)",
    fontWeight: "600",
    color: "var(--color-heading-text)",
  },
  { tag: tags.strong, fontWeight: "700", color: "var(--color-text)" },
  { tag: tags.emphasis, fontStyle: "italic", color: "var(--color-text)" },
  {
    tag: tags.monospace,
    fontFamily: "var(--font-family-mono)",
    color: "var(--color-text)",
    backgroundColor: "var(--color-code-bg)",
    borderRadius: "4px",
  },
  { tag: tags.quote, fontStyle: "italic", color: "var(--color-muted)" },
  { tag: [tags.link, tags.url], color: "var(--color-accent)" },
]);

const markdownEditorChrome = EditorView.theme({
  "&": { backgroundColor: "var(--color-editor)", color: "var(--color-text)" },
  ".cm-content": { caretColor: "var(--color-accent)" },
  ".cm-line": { lineHeight: "1.8" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--color-accent)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "var(--color-active)",
  },
});

export function markdownEditorTheme() {
  return [markdownEditorChrome, Prec.highest(syntaxHighlighting(markdownHighlightStyle))];
}
