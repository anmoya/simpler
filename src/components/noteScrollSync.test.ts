import { describe, expect, it, vi } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { syncToSourceLine, visibleSourceLine } from "./noteScrollSync";

describe("note scroll section mapping", () => {
  it("anchors by source section even when a tall image changes rendered page heights", () => {
    const target = document.createElement("article");
    const heading = document.createElement("h2"); heading.dataset.sourceLine = "1";
    const imageBlock = document.createElement("p"); imageBlock.dataset.sourceLine = "8";
    const laterHeading = document.createElement("h2"); laterHeading.dataset.sourceLine = "14";
    target.append(heading, imageBlock, laterHeading);
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 600, 400));
    vi.spyOn(heading, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 10, 300, 30));
    vi.spyOn(imageBlock, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 1200, 300, 800));
    vi.spyOn(laterHeading, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 2050, 300, 30));
    Object.defineProperty(target, "scrollTop", { configurable: true, writable: true, value: 1500 });

    expect(syncToSourceLine(target, 13)).toBe(true);
    expect(target.scrollTop).toBe(3550);
  });

  it("finds the visible CodeMirror source line rather than using total scroll percentage", () => {
    const container = document.createElement("div");
    const first = document.createElement("div"); first.dataset.sourceLine = "2";
    const second = document.createElement("div"); second.dataset.sourceLine = "9";
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 200, 500, 300));
    vi.spyOn(first, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 100, 400, 20));
    vi.spyOn(second, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 205, 400, 20));
    expect(visibleSourceLine(container, [first, second])).toBe(9);
  });

  it("maps both directions to real CodeMirror positions in a long virtualized note", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const view = new EditorView({ state: EditorState.create({ doc: Array.from({ length: 10000 }, (_, i) => `line ${i + 1}`).join("\n") }), parent: host });
    const scroller = view.scrollDOM;
    const visibleLine = scroller.querySelector<HTMLElement>(".cm-line")!;
    const lineNumber = 8421;
    vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 100, 500, 500));
    vi.spyOn(visibleLine, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 110, 400, 20));
    vi.spyOn(view, "posAtDOM").mockReturnValue(view.state.doc.line(lineNumber).from);

    // The DOM contains only a small rendered window, while the source anchor is
    // on line 8421 of the full 10,000-line document.
    expect(visibleSourceLine(scroller, [visibleLine])).toBe(lineNumber);

    const rendered = document.createElement("article");
    const renderedAnchor = document.createElement("p");
    renderedAnchor.dataset.sourceLine = String(lineNumber);
    rendered.append(renderedAnchor);
    vi.spyOn(rendered, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 500, 500));
    vi.spyOn(renderedAnchor, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 400, 30));
    const targetBlock = { top: 168420 } as ReturnType<EditorView["lineBlockAt"]>;
    vi.spyOn(view, "lineBlockAt").mockReturnValue(targetBlock);
    expect(syncToSourceLine(scroller, lineNumber)).toBe(true);
    expect(view.lineBlockAt).toHaveBeenCalledWith(view.state.doc.line(lineNumber).from);
    expect(scroller.scrollTop).toBe(168420);
    expect(syncToSourceLine(scroller, visibleSourceLine(rendered, [renderedAnchor])!)).toBe(true);
    expect(scroller.scrollTop).toBe(168420);
    view.destroy();
    host.remove();
    rendered.remove();
  });
});
