import { EditorView } from "@codemirror/view";

export function visibleSourceLine(container: HTMLElement, anchors: readonly HTMLElement[]): number | null {
  const top = container.getBoundingClientRect().top;
  const visible = anchors.find(anchor => anchor.getBoundingClientRect().bottom > top + 1) ?? anchors.at(-1);
  if (!visible) return null;
  const editor = EditorView.findFromDOM(container);
  if (editor) {
    try { return editor.state.doc.lineAt(editor.posAtDOM(visible)).number; } catch { /* Fall through for stale virtualized DOM. */ }
  }
  const explicitLine = Number(visible.dataset.sourceLine);
  if (Number.isFinite(explicitLine) && explicitLine > 0) return explicitLine;
  const index = anchors.indexOf(visible);
  return index >= 0 ? index + 1 : null;
}

export function syncToSourceLine(target: HTMLElement, sourceLine: number): boolean {
  const editor = EditorView.findFromDOM(target);
  if (editor) {
    const lineNumber = Math.max(1, Math.min(sourceLine, editor.state.doc.lines));
    const line = editor.state.doc.line(lineNumber);
    target.scrollTop = editor.lineBlockAt(line.from).top;
    return true;
  }
  const semanticAnchors = [...target.querySelectorAll<HTMLElement>("[data-source-line]")];
  const anchors = semanticAnchors.length > 0 ? semanticAnchors : [...target.querySelectorAll<HTMLElement>(".cm-line")];
  if (!anchors.length) return false;
  const lineAt = (element: HTMLElement) => {
    const explicitLine = Number(element.dataset.sourceLine);
    return Number.isFinite(explicitLine) && explicitLine > 0 ? explicitLine : anchors.indexOf(element) + 1;
  };
  const anchor = anchors.reduce((best, candidate) => {
    const bestDistance = Math.abs(lineAt(best) - sourceLine);
    const candidateDistance = Math.abs(lineAt(candidate) - sourceLine);
    return candidateDistance < bestDistance ? candidate : best;
  });
  target.scrollTop += anchor.getBoundingClientRect().top - target.getBoundingClientRect().top;
  return true;
}
