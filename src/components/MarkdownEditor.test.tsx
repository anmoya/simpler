import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MarkdownEditor } from "./MarkdownEditor";

describe("MarkdownEditor", () => {
  it("renders the note's raw Markdown content with line numbers", () => {
    render(<MarkdownEditor notePath="daily/today.md" value={"# Today\n\nBody"} onChange={() => undefined} />);

    const editor = screen.getByTestId("markdown-editor");
    expect(editor.textContent).toContain("Today");
    expect(editor.querySelector(".cm-lineNumbers")).not.toBeNull();
  });

  it("reports edits back through onChange as Raw Markdown", async () => {
    const onChange = vi.fn();

    render(<MarkdownEditor notePath="daily/today.md" value="# Today" onChange={onChange} />);

    const editor = screen.getByTestId("markdown-editor");
    const editable = editor.querySelector("[contenteditable=true]") as HTMLElement;
    editable.focus();

    await userEvent.type(editable, "{End}!");

    expect(onChange).toHaveBeenCalledWith("# Today!");
  });

  it("styles Markdown headings with the theme's heading color and font", () => {
    render(<MarkdownEditor notePath="daily/today.md" value={"# Today"} onChange={() => undefined} />);

    const editor = screen.getByTestId("markdown-editor");
    const headingLine = Array.from(editor.querySelectorAll("span")).find(
      (span) => span.textContent === "# Today",
    );

    expect(headingLine).toBeDefined();
    expect(headingLine!.className).not.toBe("");

    const styleRules = Array.from(document.querySelectorAll("style"))
      .map((style) => style.textContent ?? "")
      .join("\n");
    const headingClass = headingLine!.className;

    expect(styleRules).toMatch(new RegExp(`\\.${headingClass}\\s*\\{[^}]*var\\(--color-heading\\)`));
    expect(styleRules).toMatch(new RegExp(`\\.${headingClass}\\s*\\{[^}]*var\\(--font-family-heading\\)`));
  });

  it("selects the requested file search jump range", () => {
    render(
      <MarkdownEditor
        notePath="daily/today.md"
        value={"# Today\nneedle line"}
        searchJump={{ notePath: "daily/today.md", lineNumber: 2, matchStart: 0, matchEnd: 6 }}
        onChange={() => undefined}
      />,
    );

    const editor = screen.getByTestId("markdown-editor");
    const activeLine = editor.querySelector(".cm-activeLine");

    expect(activeLine?.textContent).toBe("needle line");
  });
});
