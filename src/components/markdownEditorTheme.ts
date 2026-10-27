import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting, syntaxTree } from "@codemirror/language";
import { Prec, RangeSetBuilder } from "@codemirror/state";
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
  },
  { tag: tags.quote, fontStyle: "italic", color: "var(--color-muted)" },
  // The `#`, `**`, `>` and `-` characters themselves. Raw Markdown keeps them
  // visible (that's the point of the editor), so a Theme gets to tint them
  // down rather than let them read as body text.
  { tag: tags.processingInstruction, color: "var(--color-markdown-mark)" },
  { tag: [tags.link, tags.url], color: "var(--color-accent)" },
]);

const inlineCodeMark = Decoration.mark({ class: "cm-inline-code" });
const fencedCodeLine = Decoration.line({ class: "cm-fenced-code-line" });
const fencedCodeLineFirst = Decoration.line({ class: "cm-fenced-code-line cm-fenced-code-line-first" });
const fencedCodeLineLast = Decoration.line({ class: "cm-fenced-code-line cm-fenced-code-line-last" });
const fencedCodeLineSingle = Decoration.line({
  class: "cm-fenced-code-line cm-fenced-code-line-first cm-fenced-code-line-last",
});

// Lezer's markdown grammar tags every monospace token (both inline `code` and
// fenced ```code``` blocks) with the same `tags.monospace` highlight tag, so a
// tag-based HighlightStyle can't tell them apart — it paints a background on
// every token, giving fenced blocks a per-line pill look instead of one
// continuous block. This walks the syntax tree by node type (`InlineCode` vs
// `FencedCode`) instead, so each gets its own decoration shape.
function buildCodeDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const ranges: { from: number; to: number; kind: "inline" | "fenced" }[] = [];

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        if (node.name === "InlineCode") {
          ranges.push({ from: node.from, to: node.to, kind: "inline" });
        } else if (node.name === "FencedCode") {
          ranges.push({ from: node.from, to: node.to, kind: "fenced" });
        }
      },
    });
  }

  const decorations: { from: number; to: number; decoration: Decoration }[] = [];

  for (const range of ranges) {
    if (range.kind === "inline") {
      decorations.push({ from: range.from, to: range.to, decoration: inlineCodeMark });
      continue;
    }

    const startLine = view.state.doc.lineAt(range.from).number;
    const endLine = view.state.doc.lineAt(range.to).number;
    for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
      const line = view.state.doc.line(lineNumber);
      const isFirst = lineNumber === startLine;
      const isLast = lineNumber === endLine;
      const decoration =
        isFirst && isLast
          ? fencedCodeLineSingle
          : isFirst
            ? fencedCodeLineFirst
            : isLast
              ? fencedCodeLineLast
              : fencedCodeLine;
      decorations.push({ from: line.from, to: line.from, decoration });
    }
  }

  decorations.sort((a, b) => a.from - b.from || a.decoration.startSide - b.decoration.startSide);
  for (const { from, to, decoration } of decorations) {
    builder.add(from, to, decoration);
  }

  return builder.finish();
}

const codeDecorationsPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildCodeDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || syntaxTree(update.state) !== syntaxTree(update.startState)) {
        this.decorations = buildCodeDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

const markdownEditorChrome = EditorView.theme({
  "&": {
    backgroundColor: "var(--color-editor)",
    color: "var(--color-text)",
    // Editor-only font size, independent of the whole-app-shell `--ui-zoom`.
    // Set inline by MarkdownEditor from persisted `simpler.editorFontSize`;
    // falls back to the default `--font-size-body` value when unset.
    fontSize: "var(--editor-font-size, 13.5px)",
    // Prose face, which a Theme may set apart from the UI chrome font.
    fontFamily: "var(--font-family-prose)",
  },
  ".cm-content": { caretColor: "var(--color-accent)" },
  ".cm-line": { lineHeight: "1.8" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--color-accent)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "var(--color-active)",
  },
  ".cm-inline-code": {
    fontFamily: "var(--font-family-mono)",
    backgroundColor: "var(--color-code-bg)",
    borderRadius: "4px",
  },
  ".cm-fenced-code-line": {
    fontFamily: "var(--font-family-mono)",
    backgroundColor: "var(--color-code-bg)",
  },
  ".cm-fenced-code-line-first": {
    borderTopLeftRadius: "4px",
    borderTopRightRadius: "4px",
  },
  ".cm-fenced-code-line-last": {
    borderBottomLeftRadius: "4px",
    borderBottomRightRadius: "4px",
  },
});

export function markdownEditorTheme() {
  return [
    markdownEditorChrome,
    Prec.highest(syntaxHighlighting(markdownHighlightStyle)),
    codeDecorationsPlugin,
  ];
}
