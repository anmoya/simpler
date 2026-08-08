import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { EditorView } from "codemirror";
import { MarkdownEditor } from "./MarkdownEditor";
import { saveAttachment } from "../native/commands";

vi.mock("../native/commands", () => ({
  saveAttachment: vi.fn(),
}));

function makeImageFile(name = "screenshot.png", type = "image/png") {
  return new File(["fake-image-bytes"], name, { type });
}

describe("MarkdownEditor", () => {
  beforeEach(() => {
    vi.mocked(saveAttachment).mockReset();
  });

  describe("pasting an image", () => {
    it("saves the image and inserts a Markdown image reference at the cursor", async () => {
      vi.mocked(saveAttachment).mockResolvedValue({
        ok: true,
        domain: "filesystem",
        action: "save-attachment",
        error: null,
        data: { tree: [], itemPath: "daily/assets/2026-08-08-143022.png" },
      });

      render(
        <MarkdownEditor
          notePath="daily/today.md"
          workspacePath="/workspace"
          value="# Today"
          onChange={() => undefined}
        />,
      );

      const editor = screen.getByTestId("markdown-editor");
      const editable = editor.querySelector("[contenteditable=true]") as HTMLElement;
      editable.focus();

      const file = makeImageFile();
      fireEvent.paste(editable, {
        clipboardData: { files: [file], items: [], types: ["Files"] },
      });

      await waitFor(() => {
        expect(saveAttachment).toHaveBeenCalledWith(
          "/workspace",
          "daily",
          expect.stringMatching(/^\d{4}-\d{2}-\d{2}-\d{6}\.png$/),
          expect.any(String),
        );
      });

      await waitFor(() => {
        expect(editable.textContent).toContain("![](assets/2026-08-08-143022.png)");
      });
    });

    it("leaves plain text pasting unaffected", async () => {
      const onChange = vi.fn();
      render(
        <MarkdownEditor
          notePath="daily/today.md"
          workspacePath="/workspace"
          value=""
          onChange={onChange}
        />,
      );

      const editor = screen.getByTestId("markdown-editor");
      const editable = editor.querySelector("[contenteditable=true]") as HTMLElement;
      editable.focus();

      fireEvent.paste(editable, {
        clipboardData: { files: [], items: [], types: ["text/plain"], getData: () => "pasted text" },
      });

      expect(saveAttachment).not.toHaveBeenCalled();
    });
  });

  describe("dropping an image", () => {
    it("saves the image and inserts the Markdown reference at the drop position", async () => {
      vi.mocked(saveAttachment).mockResolvedValue({
        ok: true,
        domain: "filesystem",
        action: "save-attachment",
        error: null,
        data: { tree: [], itemPath: "daily/assets/2026-08-08-143022.png" },
      });

      render(
        <MarkdownEditor
          notePath="daily/today.md"
          workspacePath="/workspace"
          value={"# Today\n\nSome body text far from the drop point"}
          onChange={() => undefined}
        />,
      );

      const editor = screen.getByTestId("markdown-editor");
      const editable = editor.querySelector("[contenteditable=true]") as HTMLElement;

      const posAtCoordsSpy = vi.spyOn(EditorView.prototype, "posAtCoords").mockReturnValue(9);

      const file = makeImageFile();
      fireEvent.drop(editable, {
        dataTransfer: { files: [file], items: [], types: ["Files"] },
        clientX: 42,
        clientY: 7,
      });

      await waitFor(() => {
        expect(saveAttachment).toHaveBeenCalledWith(
          "/workspace",
          "daily",
          expect.stringMatching(/^\d{4}-\d{2}-\d{2}-\d{6}\.png$/),
          expect.any(String),
        );
      });

      await waitFor(() => {
        expect(editable.textContent).toContain("![](assets/2026-08-08-143022.png)");
      });

      posAtCoordsSpy.mockRestore();
    });

    it("does not intercept drops of non-image files", () => {
      render(
        <MarkdownEditor
          notePath="daily/today.md"
          workspacePath="/workspace"
          value=""
          onChange={() => undefined}
        />,
      );

      const editor = screen.getByTestId("markdown-editor");
      const editable = editor.querySelector("[contenteditable=true]") as HTMLElement;

      const file = new File(["not an image"], "notes.txt", { type: "text/plain" });
      fireEvent.drop(editable, {
        dataTransfer: { files: [file], items: [], types: ["Files"] },
        clientX: 42,
        clientY: 7,
      });

      expect(saveAttachment).not.toHaveBeenCalled();
    });
  });

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

  describe("list continuation on Enter", () => {
    it.each([
      ["- foo", "- foo\n- "],
      ["* foo", "* foo\n* "],
      ["+ foo", "+ foo\n+ "],
      ["1. foo", "1. foo\n2. "],
      ["9. foo", "9. foo\n10. "],
    ])("continues %s onto a new marker line", async (initial, expected) => {
      const onChange = vi.fn();
      render(<MarkdownEditor notePath="daily/today.md" value={initial} onChange={onChange} />);

      const editor = screen.getByTestId("markdown-editor");
      const editable = editor.querySelector("[contenteditable=true]") as HTMLElement;
      editable.focus();

      await userEvent.type(editable, "{End}{Enter}");

      expect(onChange).toHaveBeenCalledWith(expected);
    });

    it("keeps default Enter behavior in the middle of a non-list line", async () => {
      const onChange = vi.fn();
      render(<MarkdownEditor notePath="daily/today.md" value="plain text" onChange={onChange} />);

      const editor = screen.getByTestId("markdown-editor");
      const editable = editor.querySelector("[contenteditable=true]") as HTMLElement;
      editable.focus();

      await userEvent.type(editable, "{Home}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{Enter}");

      expect(onChange).toHaveBeenCalledWith("plain\ntext");
    });

    it.each([
      ["- [ ] foo", "- [ ] foo\n- [ ] "],
      ["- [x] foo", "- [x] foo\n- [ ] "],
    ])("continues checklist item %s as unchecked", async (initial, expected) => {
      const onChange = vi.fn();
      render(<MarkdownEditor notePath="daily/today.md" value={initial} onChange={onChange} />);

      const editor = screen.getByTestId("markdown-editor");
      const editable = editor.querySelector("[contenteditable=true]") as HTMLElement;
      editable.focus();

      await userEvent.type(editable, "{End}{Enter}");

      expect(onChange).toHaveBeenCalledWith(expected);
    });

    it.each([
      ["- ", ""],
      ["1. ", ""],
      ["- [ ] ", ""],
    ])("exits the list when Enter is pressed on an empty %s item", async (initial, expected) => {
      const onChange = vi.fn();
      render(<MarkdownEditor notePath="daily/today.md" value={initial} onChange={onChange} />);

      const editor = screen.getByTestId("markdown-editor");
      const editable = editor.querySelector("[contenteditable=true]") as HTMLElement;
      editable.focus();

      await userEvent.type(editable, "{End}{Enter}");

      expect(onChange).toHaveBeenCalledWith(expected);
    });
  });
});
