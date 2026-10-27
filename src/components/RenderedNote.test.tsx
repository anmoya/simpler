import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RenderedNote, resolveRelativeNote } from "./RenderedNote";

vi.mock("../native/commands", () => ({ openWebUrl: vi.fn(), previewImage: vi.fn().mockResolvedValue({ data: { dataUrl: "data:image/png;base64,AA==" } }) }));

const props = { notePath: "notes/source.md", workspacePath: "/workspace", onNavigate: vi.fn() };

describe("RenderedNote Standard Markdown", () => {
  it("renders CommonMark and GFM structures from one markdown parse", () => {
    render(<RenderedNote {...props} content={[
      "Setext title", "===========", "", "Nested **bold *and italic*** text.", "", "- outer", "  - nested", "", "| Name | Value |", "| --- | ---: |", "| A | 2 |", "", "- [x] done", "- [ ] todo", "", "```md", "![fake](missing.png)", "```", "", "`![also fake](missing.png)`", "", "<script>alert(1)</script>",
    ].join("\n")} />);
    expect(screen.getByRole("heading", { name: "Setext title" })).toBeInTheDocument();
    expect(screen.getByText("and italic")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    expect(screen.getByText("![fake](missing.png)")).toBeInTheDocument();
    expect(screen.getByText("![also fake](missing.png)")).toBeInTheDocument();
    expect(screen.queryByText(/Imagen no disponible/)).not.toBeInTheDocument();
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector("[data-source-line='1']")).toBeTruthy();
  });

  it("identifies actual Markdown images, including nested in links", async () => {
    const { previewImage } = await import("../native/commands");
    render(<RenderedNote {...props} content={'![real](assets/real.png)\n\n[caption ![nested](assets/nested.png)](https://example.com)'} />);
    await waitFor(() => expect(previewImage).toHaveBeenCalledTimes(2));
  });

  it("resolves reference-style images and links from Markdown definitions", async () => {
    const { previewImage } = await import("../native/commands");
    vi.mocked(previewImage).mockClear();
    render(<RenderedNote {...props} content={'![diagram][image-ref] [source][web-ref]\n\n[image-ref]: assets/diagram.png "Diagram"\n[web-ref]: https://example.com "Source"'} />);
    expect(await screen.findByRole("img", { name: "diagram" })).toHaveAttribute("title", "Diagram");
    expect(screen.getByRole("link", { name: "source" })).toHaveAttribute("href", "https://example.com");
    await waitFor(() => expect(previewImage).toHaveBeenCalledOnce());
  });
});

describe("relative note links", () => {
  it.each([
    ["folder/source.md", "other.md", "folder/other.md"],
    ["folder/source.md", "my%name.MD", "folder/my%name.MD"],
    ["folder/source.md", "my%20note.md", "folder/my note.md"],
    ["folder/nested/source.md", "../next.Md", "folder/next.Md"],
    ["source.md", "../escape.md", null],
    ["source.md", "https://example.com/a.md", null],
    ["source.md", "bad%2Gname.md", "bad%2Gname.md"],
  ])("resolves %s + %s", (source, href, expected) => {
    expect(resolveRelativeNote(source, href)).toBe(expected);
  });
  it("recovers from invalid UTF-8 escapes", () => {
    expect(resolveRelativeNote("source.md", "%E0%A4%A.md")).toBeNull();
  });
  it("opens the resolved relative note through the navigation callback", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    const onNavigate = vi.fn();
    render(<RenderedNote {...props} onNavigate={onNavigate} content={'[next](folder/my%20note.MD) [bad](%E0%A4%A.md)'} />);
    await user.click(screen.getByRole("link", { name: "next" }));
    await user.click(screen.getByText("bad"));
    expect(onNavigate).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith("notes/folder/my note.MD");
  });
});
