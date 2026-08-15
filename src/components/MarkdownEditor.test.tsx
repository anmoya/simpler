import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MarkdownEditor } from "./MarkdownEditor";
import { readClipboardImage, readClipboardText, saveAttachment } from "../native/commands";

vi.mock("../native/commands", () => ({
  saveAttachment: vi.fn(),
  readClipboardImage: vi.fn(),
  readClipboardText: vi.fn(),
  importAttachment: vi.fn(),
  isMacOS: (platform: string) => platform === "macos",
}));


function makeImageFile(name = "screenshot.png", type = "image/png") {
  return new File(["fake-image-bytes"], name, { type });
}

describe("MarkdownEditor", () => {
  beforeEach(() => {
    vi.mocked(saveAttachment).mockReset();
    vi.mocked(readClipboardImage).mockReset();
    vi.mocked(readClipboardText).mockReset();
  });

  describe("pasting an image via Ctrl+V (system clipboard)", () => {
    it("reads the clipboard image natively and inserts a Markdown image reference", async () => {
      vi.mocked(readClipboardImage).mockResolvedValue({
        ok: true,
        domain: "filesystem",
        action: "read-clipboard-image",
        error: null,
        data: { contentBase64: "ZmFrZS1pbWFnZS1ieXRlcw==", mimeType: "image/png" },
      });
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

      fireEvent.keyDown(editable, { key: "v", ctrlKey: true });

      await waitFor(() => {
        expect(readClipboardImage).toHaveBeenCalled();
        expect(saveAttachment).toHaveBeenCalledWith(
          "/workspace",
          "daily",
          expect.stringMatching(/^\d{4}-\d{2}-\d{2}-\d{6}\.png$/),
          "ZmFrZS1pbWFnZS1ieXRlcw==",
        );
      });

      await waitFor(() => {
        expect(editable.textContent).toContain("![](assets/2026-08-08-143022.png)");
      });
    });

    it("does not intercept Cmd+V on macOS, leaving native paste to CodeMirror", async () => {
      render(
        <MarkdownEditor
          platform="macos"
          notePath="daily/today.md"
          workspacePath="/workspace"
          value="# Today"
          onChange={() => undefined}
        />,
      );

      const editor = screen.getByTestId("markdown-editor");
      const editable = editor.querySelector("[contenteditable=true]") as HTMLElement;
      editable.focus();

      fireEvent.keyDown(editable, { key: "v", metaKey: true });

      expect(readClipboardImage).not.toHaveBeenCalled();
      expect(readClipboardText).not.toHaveBeenCalled();
    });

    it("falls back to the native clipboard text read when there is no clipboard image", async () => {
      vi.mocked(readClipboardImage).mockResolvedValue({
        ok: false,
        domain: "filesystem",
        action: "read-clipboard-image",
        error: "clipboard does not contain an image",
        data: null,
      });
      vi.mocked(readClipboardText).mockResolvedValue({
        ok: true,
        domain: "filesystem",
        action: "read-clipboard-text",
        error: null,
        data: { text: "pasted text" },
      });

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

      fireEvent.keyDown(editable, { key: "v", ctrlKey: true });

      await waitFor(() => {
        expect(saveAttachment).not.toHaveBeenCalled();
        expect(onChange).toHaveBeenCalledWith("pasted text");
      });
    });

    it("pastes externally-copied text even when the browser Clipboard API denies permission", async () => {
      // Regression test for
      // .scratch/ui-repairs-aug2026/issues/05-diagnose-external-clipboard-paste-failure.md:
      // navigator.clipboard.readText() rejected with NotAllowedError under
      // WebKitGTK for text copied outside the app. The paste path no longer
      // calls it at all, but this asserts that explicitly.
      const readText = vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError"));
      Object.defineProperty(navigator, "clipboard", {
        value: { readText },
        configurable: true,
      });
      vi.mocked(readClipboardImage).mockResolvedValue({
        ok: false,
        domain: "filesystem",
        action: "read-clipboard-image",
        error: "clipboard does not contain an image",
        data: null,
      });
      vi.mocked(readClipboardText).mockResolvedValue({
        ok: true,
        domain: "filesystem",
        action: "read-clipboard-text",
        error: null,
        data: { text: "externally copied text" },
      });

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

      fireEvent.keyDown(editable, { key: "v", ctrlKey: true });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith("externally copied text");
      });
      expect(readText).not.toHaveBeenCalled();
    });

    it("reports a failed clipboard-image save through onAttachmentError", async () => {
      vi.mocked(readClipboardImage).mockResolvedValue({
        ok: true,
        domain: "filesystem",
        action: "read-clipboard-image",
        error: null,
        data: { contentBase64: "ZmFrZQ==", mimeType: "image/png" },
      });
      vi.mocked(saveAttachment).mockRejectedValue(new Error("disk full"));
      const onAttachmentError = vi.fn();

      render(
        <MarkdownEditor
          notePath="daily/today.md"
          workspacePath="/workspace"
          value="# Today"
          onChange={() => undefined}
          onAttachmentError={onAttachmentError}
        />,
      );

      const editor = screen.getByTestId("markdown-editor");
      const editable = editor.querySelector("[contenteditable=true]") as HTMLElement;
      editable.focus();

      fireEvent.keyDown(editable, { key: "v", ctrlKey: true });

      await waitFor(() => {
        expect(onAttachmentError).toHaveBeenCalledWith(
          expect.stringContaining("Could not save the pasted image"),
        );
      });
    });

    // The native commands resolve with `ok: false` rather than throwing, so
    // this — not the rejected promise above — is where failures used to vanish.
    it("reports a save the native command refused, not just a rejected promise", async () => {
      vi.mocked(readClipboardImage).mockResolvedValue({
        ok: true,
        domain: "filesystem",
        action: "read-clipboard-image",
        error: null,
        data: { contentBase64: "ZmFrZQ==", mimeType: "image/png" },
      });
      vi.mocked(saveAttachment).mockResolvedValue({
        ok: false,
        domain: "filesystem",
        action: "save-attachment",
        error: "permission denied",
        data: null,
      });
      const onAttachmentError = vi.fn();

      render(
        <MarkdownEditor
          notePath="daily/today.md"
          workspacePath="/workspace"
          value="# Today"
          onChange={() => undefined}
          onAttachmentError={onAttachmentError}
        />,
      );

      const editor = screen.getByTestId("markdown-editor");
      const editable = editor.querySelector("[contenteditable=true]") as HTMLElement;
      editable.focus();

      fireEvent.keyDown(editable, { key: "v", ctrlKey: true });

      await waitFor(() => {
        expect(onAttachmentError).toHaveBeenCalledWith(
          expect.stringContaining("Could not save the pasted image"),
        );
      });
      expect(editable.textContent).not.toContain("![](");
    });

    it("clears a previous attachment failure once a save succeeds", async () => {
      vi.mocked(readClipboardImage).mockResolvedValue({
        ok: true,
        domain: "filesystem",
        action: "read-clipboard-image",
        error: null,
        data: { contentBase64: "ZmFrZQ==", mimeType: "image/png" },
      });
      vi.mocked(saveAttachment)
        .mockResolvedValueOnce({
          ok: false,
          domain: "filesystem",
          action: "save-attachment",
          error: "permission denied",
          data: null,
        })
        .mockResolvedValueOnce({
          ok: true,
          domain: "filesystem",
          action: "save-attachment",
          error: null,
          data: { tree: [], itemPath: "daily/assets/2026-08-08-143022.png" },
        });
      const onAttachmentError = vi.fn();

      render(
        <MarkdownEditor
          notePath="daily/today.md"
          workspacePath="/workspace"
          value="# Today"
          onChange={() => undefined}
          onAttachmentError={onAttachmentError}
        />,
      );

      const editor = screen.getByTestId("markdown-editor");
      const editable = editor.querySelector("[contenteditable=true]") as HTMLElement;
      editable.focus();

      fireEvent.keyDown(editable, { key: "v", ctrlKey: true });
      await waitFor(() => expect(onAttachmentError).toHaveBeenCalledWith(expect.any(String)));

      fireEvent.keyDown(editable, { key: "v", ctrlKey: true });
      await waitFor(() => expect(onAttachmentError).toHaveBeenLastCalledWith(null));
    });
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

  // There is no test here for the file-manager drop. It arrives on Tauri's
  // window-level channel, which jsdom cannot produce: a synthetic event would
  // only re-assert our own logic and would pass with the feature inoperative,
  // which is exactly how this feature was closed twice while broken. The
  // parsing is covered in `attachments/droppedImagePath.test.ts`, the
  // coordinate translation in `attachments/nativeDropChannel.test.ts`, and the
  // channel itself by a real drag (see the drag-and-drop spec).

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
    // The `#` mark is highlighted separately from the heading text (see the
    // Markdown-mark test below), so the heading spans two elements.
    const headingText = Array.from(editor.querySelectorAll("span")).find((span) =>
      span.textContent?.includes("Today"),
    );

    expect(headingText).toBeDefined();
    expect(headingText!.className).not.toBe("");

    const styleRules = Array.from(document.querySelectorAll("style"))
      .map((style) => style.textContent ?? "")
      .join("\n");
    const headingClass = headingText!.className;

    expect(styleRules).toMatch(new RegExp(`\\.${headingClass}\\s*\\{[^}]*var\\(--color-heading\\)`));
    expect(styleRules).toMatch(new RegExp(`\\.${headingClass}\\s*\\{[^}]*var\\(--font-family-heading\\)`));
  });

  it("tints the Markdown syntax marks apart from the text they decorate", () => {
    render(<MarkdownEditor notePath="daily/today.md" value={"# Today"} onChange={() => undefined} />);

    const editor = screen.getByTestId("markdown-editor");
    const mark = Array.from(editor.querySelectorAll("span")).find((span) => span.textContent === "#");

    expect(mark).toBeDefined();

    const styleRules = Array.from(document.querySelectorAll("style"))
      .map((style) => style.textContent ?? "")
      .join("\n");
    // The mark carries both the heading class and its own mark class; only the
    // latter is expected to reference the Markdown-mark token.
    const markClasses = mark!.className.split(/\s+/).filter(Boolean);

    expect(
      markClasses.some((markClass) =>
        new RegExp(`\\.${markClass}\\s*\\{[^}]*var\\(--color-markdown-mark\\)`).test(styleRules),
      ),
    ).toBe(true);
  });

  it("gives a fenced code block one continuous background, distinct from the inline code pill", () => {
    render(
      <MarkdownEditor
        notePath="daily/today.md"
        value={"`inline`\n\n```\nfirst\nsecond\n```"}
        onChange={() => undefined}
      />,
    );

    const editor = screen.getByTestId("markdown-editor");

    expect(editor.querySelector(".cm-inline-code")).not.toBeNull();

    const fencedLines = editor.querySelectorAll(".cm-fenced-code-line");
    expect(fencedLines.length).toBeGreaterThanOrEqual(2);
    expect(editor.querySelector(".cm-fenced-code-line-first")).not.toBeNull();
    expect(editor.querySelector(".cm-fenced-code-line-last")).not.toBeNull();

    const styleRules = Array.from(document.querySelectorAll("style"))
      .map((style) => style.textContent ?? "")
      .join("\n");
    expect(styleRules).toMatch(/\.cm-inline-code\s*\{[^}]*var\(--color-code-bg\)/);
    expect(styleRules).toMatch(/\.cm-fenced-code-line\s*\{[^}]*var\(--color-code-bg\)/);
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

  describe("editor font size", () => {
    it("applies the fontSize prop as the --editor-font-size CSS variable, and updates it when the prop changes", () => {
      const { rerender } = render(
        <MarkdownEditor
          notePath="daily/today.md"
          value="# Today"
          onChange={() => undefined}
          fontSize={16}
        />,
      );

      const editor = screen.getByTestId("markdown-editor");
      expect(editor.style.getPropertyValue("--editor-font-size")).toBe("16px");

      rerender(
        <MarkdownEditor
          notePath="daily/today.md"
          value="# Today"
          onChange={() => undefined}
          fontSize={20}
        />,
      );

      expect(editor.style.getPropertyValue("--editor-font-size")).toBe("20px");
    });

    it("defaults to 13.5px when no fontSize prop is given", () => {
      render(<MarkdownEditor notePath="daily/today.md" value="# Today" onChange={() => undefined} />);

      const editor = screen.getByTestId("markdown-editor");
      expect(editor.style.getPropertyValue("--editor-font-size")).toBe("13.5px");
    });
  });
});
