import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import type { FileSearchJump } from "../app/appState";
import { markdownEditorTheme } from "./markdownEditorTheme";

export interface MarkdownEditorProps {
  notePath: string;
  value: string;
  onChange: (content: string) => void;
  searchJump?: FileSearchJump | null;
}

export function MarkdownEditor({ notePath, value, onChange, searchJump = null }: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          markdown(),
          EditorView.lineWrapping,
          markdownEditorTheme(),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
        ],
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notePath]);

  useEffect(() => {
    const view = viewRef.current;

    if (!view) {
      return;
    }

    const currentContent = view.state.doc.toString();

    if (currentContent !== value) {
      view.dispatch({
        changes: { from: 0, to: currentContent.length, insert: value },
      });
    }
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;

    if (!view || !searchJump || searchJump.notePath !== notePath) {
      return;
    }

    const line = view.state.doc.line(Math.min(searchJump.lineNumber, view.state.doc.lines));
    const from = Math.min(line.from + searchJump.matchStart, line.to);
    const to = Math.min(line.from + searchJump.matchEnd, line.to);

    view.dispatch({
      selection: { anchor: from, head: to },
      scrollIntoView: true,
    });
  }, [notePath, searchJump]);

  return <div className="markdown-editor" data-testid="markdown-editor" ref={containerRef} />;
}
