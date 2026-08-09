import { keymap } from "@codemirror/view";
import { Prec, type EditorState } from "@codemirror/state";
import type { Command } from "@codemirror/view";

interface ParsedListLine {
  content: string;
  nextMarker: string;
}

function parseListLine(text: string): ParsedListLine | null {
  const checklist = text.match(/^(\s*)([-*+]) \[[ xX]\] (.*)$/);
  if (checklist) {
    const [, indent, bullet, content] = checklist;
    return { content, nextMarker: `${indent}${bullet} [ ] ` };
  }

  const bulletMatch = text.match(/^(\s*)([-*+]) (.*)$/);
  if (bulletMatch) {
    const [, indent, bullet, content] = bulletMatch;
    return { content, nextMarker: `${indent}${bullet} ` };
  }

  const orderedMatch = text.match(/^(\s*)(\d+)\. (.*)$/);
  if (orderedMatch) {
    const [, indent, number, content] = orderedMatch;
    const nextNumber = Number.parseInt(number, 10) + 1;
    return { content, nextMarker: `${indent}${nextNumber}. ` };
  }

  return null;
}

function continueList(state: EditorState): { from: number; to: number; insert: string; cursor: number } | null {
  const { from, to } = state.selection.main;
  if (from !== to) {
    return null;
  }

  const line = state.doc.lineAt(from);
  if (from !== line.to) {
    return null;
  }

  const parsed = parseListLine(line.text);
  if (!parsed) {
    return null;
  }

  if (parsed.content === "") {
    return { from: line.from, to: line.to, insert: "", cursor: line.from };
  }

  const insert = `\n${parsed.nextMarker}`;
  return { from, to: from, insert, cursor: from + insert.length };
}

const continueListCommand: Command = (view) => {
  const result = continueList(view.state);
  if (!result) {
    return false;
  }

  view.dispatch({
    changes: { from: result.from, to: result.to, insert: result.insert },
    selection: { anchor: result.cursor },
    scrollIntoView: true,
  });
  return true;
};

export function listContinuationKeymap() {
  return Prec.highest(keymap.of([{ key: "Enter", run: continueListCommand }]));
}
