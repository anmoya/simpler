import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  open: vi.fn(),
  destroy: vi.fn(async () => undefined),
  hide: vi.fn(async () => undefined),
  closeRequestedHandler: null as null | ((event: { preventDefault: () => void }) => unknown),
  quitRequestedHandler: null as null | (() => unknown),
  appClosingOverride: null as null | (() => void),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: mocks.invoke }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: mocks.open }));
vi.mock("./automaticSyncScheduler", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./automaticSyncScheduler")>();
  return {
    ...actual,
    createAutomaticSyncScheduler: (options: Parameters<typeof actual.createAutomaticSyncScheduler>[0]) => {
      const scheduler = actual.createAutomaticSyncScheduler(options);
      return {
        ...scheduler,
        appClosing: mocks.appClosingOverride ?? scheduler.appClosing,
      };
    },
  };
});

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    onCloseRequested: async (handler: (event: { preventDefault: () => void }) => unknown) => {
      mocks.closeRequestedHandler = handler;
      return () => {
        mocks.closeRequestedHandler = null;
      };
    },
    onResized: async () => () => undefined,
    isMaximized: async () => false,
    minimize: async () => undefined,
    toggleMaximize: async () => undefined,
    close: async () => undefined,
    destroy: mocks.destroy,
    hide: mocks.hide,
    listen: async (event: string, handler: () => unknown) => {
      if (event === "simpler://quit-requested") {
        mocks.quitRequestedHandler = handler;
      }
      return () => {
        mocks.quitRequestedHandler = null;
      };
    },
  }),
}));

// CodeMirror mounts its contenteditable DOM node in a useEffect that fires
// after the "markdown-editor" container itself is in the DOM, so a bare
// querySelector immediately after opening a note is a race — flaky under
// CI's scheduling even when reliably fast on a local machine. Poll instead.
async function findEditableElement(): Promise<HTMLElement> {
  return waitFor(() => {
    const editable = screen.getByTestId("markdown-editor").querySelector("[contenteditable=true]");
    if (!editable) {
      throw new Error("markdown editor contenteditable not mounted yet");
    }
    return editable as HTMLElement;
  });
}

describe("App", () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
    mocks.open.mockReset();
    mocks.destroy.mockClear();
    mocks.hide.mockClear();
    mocks.closeRequestedHandler = null;
    mocks.quitRequestedHandler = null;
    mocks.appClosingOverride = null;
    localStorage.clear();
    localStorage.setItem("simpler.showWelcome", "false");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps the active note when flushing a pending edit fails during navigation", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const reply = (data: unknown) => Promise.resolve({ ok: true, domain: request.domain, action: request.action, data, error: null });
      if (request.action === "open") return reply({ name: "notes", path: "/tmp/notes", tree: ["a.md", "b.md"].map((path) => ({ name: path, path, kind: "note", children: [] })), metadata: { lastNotePath: "a.md", githubWizardPostponed: true } });
      if (request.action === "read-note") return reply({ content: "Initial" });
      if (request.action === "write-note") return Promise.resolve({ ok: false, error: "Disk full" });
      if (request.action === "status") return reply({ isRepository: false, hasRemote: false, syncStatus: "sin-git", conflictedFiles: [] });
      if (request.action === "github-remote") return reply({ remote: null });
      return reply({});
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    const editable = await findEditableElement();
    await user.click(editable);
    await user.type(editable, "{End} change");
    await user.click(screen.getByRole("button", { name: "b.md" }));
    expect(await screen.findByText("Disk full")).toBeInTheDocument();
    expect(editable).toHaveTextContent("Initial change");
    expect(mocks.invoke.mock.calls.filter(([, { request }]) => request.action === "read-note").map(([, { request }]) => request.payload.notePath)).toEqual(["a.md"]);
  });

  it("keeps the latest note and typing focus when an older note read finishes after rapid navigation", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    let finishOldRead!: (response: unknown) => void;
    const saved: string[] = [];
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const reply = (data: unknown) => Promise.resolve({ ok: true, domain: request.domain, action: request.action, data, error: null });
      if (request.action === "open") return reply({ name: "notes", path: "/tmp/notes", tree: ["a.md", "b.md", "c.md"].map((path) => ({ name: path, path, kind: "note", children: [] })), metadata: { lastNotePath: "a.md", githubWizardPostponed: true } });
      if (request.action === "read-note") {
        if (request.payload.notePath === "b.md") return new Promise((resolve) => { finishOldRead = resolve; });
        return reply({ content: request.payload.notePath === "c.md" ? "# Latest C" : "# Initial A" });
      }
      if (request.action === "write-note") { saved.push(request.payload.content); return reply({ content: request.payload.content }); }
      if (request.action === "status") return reply({ isRepository: false, hasRemote: false, syncStatus: "sin-git", conflictedFiles: [] });
      if (request.action === "github-remote") return reply({ remote: null });
      return reply({});
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    await waitFor(() => expect(screen.getByTestId("markdown-editor")).toHaveTextContent("# Initial A"));
    await user.click(screen.getByRole("button", { name: "b.md" }));
    await user.click(screen.getByRole("button", { name: "c.md" }));
    await waitFor(() => expect(screen.getByTestId("markdown-editor")).toHaveTextContent("# Latest C"));
    const editable = await findEditableElement();
    editable.focus();
    await user.keyboard("X");
    await waitFor(() => expect(saved).toContain("X# Latest C"));
    await act(async () => finishOldRead({ ok: true, domain: "filesystem", action: "read-note", data: { content: "# Stale B" }, error: null }));
    expect(editable).toHaveTextContent("X# Latest C");
    expect(editable).toHaveFocus();
    expect(screen.getByTestId("markdown-editor").querySelector("[contenteditable=true]")).toBe(editable);
    expect(screen.queryByText("# Stale B")).not.toBeInTheDocument();
  });

  it("reveals a restored image in its folder while preserving the active note and edits", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    const current = { name: "current.md", path: "current.md", kind: "note", children: [] };
    const archive = { name: "archive", path: "archive", kind: "folder", children: [] };
    const other = { name: "other", path: "other", kind: "folder", children: [] };
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const reply = (data: unknown) => Promise.resolve({ ok: true, domain: request.domain, action: request.action, data, error: null });
      if (request.action === "open") return reply({ name: "notes", path: "/tmp/notes", tree: [archive, other, current], metadata: { lastNotePath: "current.md", githubWizardPostponed: true, treeMode: "accordion", openFolderPaths: ["other"] } });
      if (request.action === "read-note") return reply({ content: "Current work" });
      if (request.action === "write-note") return new Promise(() => {});
      if (request.action === "status") return reply({ isRepository: false, hasRemote: false, syncStatus: "sin-git", conflictedFiles: [] });
      if (request.action === "github-remote") return reply({ remote: null });
      if (request.action === "list-trash") return reply({ entries: [{ id: "image-1", originalRelativePath: "archive/restored.png", trashedRelativePath: ".simpler/local/trash/image-1-restored.png", deletedAt: new Date().toISOString(), isDirectory: false }] });
      if (request.action === "restore-trash-item") return reply({ itemPath: "archive/restored.png", tree: [{ ...archive, children: [{ name: "restored.png", path: "archive/restored.png", kind: "image", children: [] }] }, other, current] });
      return reply({});
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    const editable = await findEditableElement();
    editable.focus();
    await user.keyboard("X");
    const content = editable.textContent;
    await user.click(screen.getByRole("tab", { name: "Trash" }));
    await user.click(await screen.findByRole("button", { name: "Restore" }));
    expect(await screen.findByRole("button", { name: "restored.png" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse archive" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand other" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Workspace action" })).toHaveTextContent("Restaurado: archive/restored.png");
    expect(screen.getByTestId("markdown-editor").querySelector("[contenteditable=true]")).toBe(editable);
    expect(editable.textContent).toBe(content);
  });

  it("persists a mixed sibling drag order without moving files or changing the active note", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    let tree = [
      { name: "folder", path: "folder", kind: "folder", children: [{ name: "nested.md", path: "folder/nested.md", kind: "note", children: [] }] },
      { name: "a.md", path: "a.md", kind: "note", children: [] },
      { name: "z.png", path: "z.png", kind: "image", children: [] },
    ];
    const orders: string[][] = [];
    let failNextOrder = false;
    let physicalMoves = 0;
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const reply = (data: unknown) => Promise.resolve({ ok: true, domain: request.domain, action: request.action, data, error: null });
      if (request.action === "open") return reply({ name: "notes", path: "/tmp/notes", tree, metadata: { lastNotePath: "a.md", openFolderPaths: ["folder"], githubWizardPostponed: true } });
      if (request.action === "read-note") return reply({ content: "Keep writing" });
      if (request.action === "status") return reply({ isRepository: false, hasRemote: false, syncStatus: "sin-git", conflictedFiles: [] });
      if (request.action === "github-remote") return reply({ remote: null });
      if (request.action === "write-note") return new Promise(() => {});
      if (request.action === "set-tree-order") {
        orders.push(request.payload.orderedPaths);
        if (failNextOrder) return Promise.resolve({ ok: false, domain: "workspace", action: "set-tree-order", data: null, error: "Tree order could not be saved" });
        tree = request.payload.orderedPaths.map((path: string) => tree.find((item) => item.path === path)!);
        return reply({ tree, itemPath: "" });
      }
      if (request.action === "move-item") physicalMoves++;
      return reply({});
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    const editor = await screen.findByTestId("markdown-editor");
    (await findEditableElement()).focus();
    await user.keyboard("X");
    const editedContent = editor.textContent;
    const values = new Map<string, string>();
    const transfer = { setData: (type: string, value: string) => values.set(type, value), getData: (type: string) => values.get(type) ?? "", get types() { return [...values.keys()]; }, effectAllowed: "", dropEffect: "" };
    const source = screen.getByRole("button", { name: "z.png" });
    const target = screen.getByRole("button", { name: "folder" });
    vi.spyOn(target.parentElement!, "getBoundingClientRect").mockReturnValue({ top: 20, height: 24 } as DOMRect);
    const dragAt = (element: HTMLElement, type: string, clientY: number) => fireEvent(element, Object.assign(new Event(type, { bubbles: true, cancelable: true }), { dataTransfer: transfer, clientY }));
    fireEvent.dragStart(source, { dataTransfer: transfer });
    dragAt(target, "dragover", 20);
    expect(screen.getByRole("status", { name: "Destino de orden" })).toHaveTextContent("antes de folder");
    dragAt(target, "drop", 20);
    await waitFor(() => expect(orders).toEqual([["z.png", "folder", "a.md"]]));
    await waitFor(() => expect(screen.getAllByRole("button", { name: /^(folder|a.md|z.png)$/ }).map((button) => button.textContent)).toEqual(["z.png", "folder", "a.md"]));
    expect(editor.textContent).toBe(editedContent);
    expect(physicalMoves).toBe(0);
    // Another parent's child is not a valid reorder destination.
    fireEvent.dragStart(source, { dataTransfer: transfer });
    const nested = screen.getByRole("button", { name: "nested.md" });
    fireEvent.dragOver(nested, { dataTransfer: transfer });
    fireEvent.drop(nested, { dataTransfer: transfer });
    fireEvent.dragEnd(source, { dataTransfer: transfer });
    expect(orders).toHaveLength(1);
    expect(physicalMoves).toBe(0);
    expect(screen.queryByRole("status", { name: "Destino de orden" })).not.toBeInTheDocument();
    // External text/file drags have no tree-origin token and cannot reorder.
    fireEvent.dragOver(target, { dataTransfer: { types: ["text/plain"], getData: () => "a.md" } });
    fireEvent.drop(target, { dataTransfer: { types: ["text/plain"], getData: () => "a.md" } });
    expect(orders).toHaveLength(1);
    expect(physicalMoves).toBe(0);
    fireEvent.dragStart(source, { dataTransfer: transfer });
    dragAt(target, "dragover", 44);
    expect(screen.getByRole("status", { name: "Destino de orden" })).toHaveTextContent("después de folder");
    fireEvent.dragEnd(source, { dataTransfer: transfer });
    expect(screen.queryByRole("status", { name: "Destino de orden" })).not.toBeInTheDocument();
    expect(orders).toHaveLength(1);
    failNextOrder = true;
    fireEvent.dragStart(source, { dataTransfer: transfer });
    dragAt(target, "dragover", 44);
    dragAt(target, "drop", 44);
    expect(await screen.findByText("Tree order could not be saved")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^(folder|a.md|z.png)$/ }).map((button) => button.textContent)).toEqual(["z.png", "folder", "a.md"]);
    expect(editor.textContent).toBe(editedContent);
  });

  it("previews a relative Markdown image from the keyboard and preserves the editing selection", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValueOnce("/tmp/notes").mockResolvedValueOnce("/tmp/other");
    const original = "![Photo](<../assets/a b.png>)\n\nDraft";
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const result = (data: unknown) => Promise.resolve({ ok: true, domain: request.domain, action: request.action, data, error: null });
      if (request.action === "open") return result({ name: "notes", path: request.payload.workspacePath, tree: [
        { name: "draft.md", path: "projects/nested/draft.md", kind: "note", children: [] },
      ], metadata: { lastNotePath: "projects/nested/draft.md", githubWizardPostponed: true } });
      if (request.action === "status") return result({ isRepository: false, hasRemote: false, syncStatus: "sin-git", conflictedFiles: [] });
      if (request.action === "github-remote") return result({ remote: null });
      if (request.action === "read-note") return result({ content: original });
      if (request.action === "preview-image") return result({ name: "a b.png", sizeBytes: 80, width: 1, height: 1, dataUrl: "data:image/png;base64,eA==" });
      if (request.action === "write-note") return result({ content: request.payload.content });
      return result({});
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    const editable = await findEditableElement();
    await waitFor(() => expect(editable.textContent).toContain("Draft"));
    editable.focus();
    await user.keyboard("{Control>}{Home}{/Control}");
    expect(screen.getByRole("button", { name: "Previsualizar imagen (Alt+Enter)" })).toBeInTheDocument();
    const writesBeforePreview = mocks.invoke.mock.calls.filter(([, { request }]) => request.action === "write-note").length;
    expect(writesBeforePreview).toBe(0);
    await user.keyboard("{ArrowRight}{ArrowRight}{Alt>}{Enter}{/Alt}");
    const preview = await screen.findByRole("dialog", { name: "Vista previa de imagen" });
    expect(await within(preview).findByRole("img", { name: "a b.png" })).toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenCalledWith("native_command", { request: { domain: "filesystem", action: "preview-image", payload: { workspacePath: "/tmp/notes", imagePath: "projects/assets/a b.png" } } });
    expect(mocks.invoke.mock.calls.filter(([, { request }]) => request.action === "write-note")).toHaveLength(writesBeforePreview);
    await user.keyboard("{Escape}");
    expect(editable).toHaveFocus();
    await user.keyboard("X");
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("native_command", { request: { domain: "filesystem", action: "write-note", payload: { workspacePath: "/tmp/notes", notePath: "projects/nested/draft.md", content: "![XPhoto](<../assets/a b.png>)\n\nDraft" } } }));
    await user.keyboard("{Alt>}{Enter}{/Alt}");
    await screen.findByRole("dialog", { name: "Vista previa de imagen" });
    await user.keyboard("{Control>}o{/Control}");
    await screen.findByText("/tmp/other");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Vista previa de imagen" })).not.toBeInTheDocument());
    expect(mocks.invoke.mock.calls.filter(([, { request }]) => request.action === "preview-image").every(([, { request }]) => request.payload.workspacePath === "/tmp/notes")).toBe(true);
  });

  it("previews a named Markdown image reference through the visible action", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    const original = "![Photo][picture]\n\n[picture]: assets/a%20b.png \"Example\"";
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const result = (data: unknown) => Promise.resolve({ ok: true, domain: request.domain, action: request.action, data, error: null });
      if (request.action === "open") return result({ name: "notes", path: "/tmp/notes", tree: [{ name: "draft.md", path: "draft.md", kind: "note", children: [] }], metadata: { lastNotePath: "draft.md", githubWizardPostponed: true } });
      if (request.action === "status") return result({ isRepository: false, hasRemote: false, syncStatus: "sin-git", conflictedFiles: [] });
      if (request.action === "github-remote") return result({ remote: null });
      if (request.action === "read-note") return result({ content: original });
      if (request.action === "preview-image") return result({ name: "a b.png", sizeBytes: 80, width: 1, height: 1, dataUrl: "data:image/png;base64,eA==" });
      return result({});
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    const editable = await findEditableElement();
    await waitFor(() => expect(editable.textContent).toContain(original.split("\n")[0]));
    editable.focus();
    await user.keyboard("{Control>}{Home}{/Control}{Shift>}{Tab}{/Shift}");
    const action = screen.getByRole("button", { name: "Previsualizar imagen (Alt+Enter)" });
    expect(action).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("dialog", { name: "Vista previa de imagen" })).toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenCalledWith("native_command", { request: { domain: "filesystem", action: "preview-image", payload: { workspacePath: "/tmp/notes", imagePath: "assets/a b.png" } } });
  });

  it.each([
    ["![Photo](https://example.com/a.png)", "Solo se previsualizan imágenes locales"],
    ["![Photo](file:///tmp/a.png)", "Solo se previsualizan imágenes locales"],
    ["![Photo](../outside.png)", "La imagen debe estar dentro del Workspace"],
    ["![Photo](assets/a%zz.png)", "La ruta de la imagen no es válida"],
    ["![Photo](assets/missing.png)", "Imagen no disponible"],
  ])("reports an unavailable Markdown image without fetching or changing the note: %s", async (content, message) => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const result = (data: unknown) => Promise.resolve({ ok: true, domain: request.domain, action: request.action, data, error: null });
      if (request.action === "open") return result({ name: "notes", path: "/tmp/notes", tree: [{ name: "draft.md", path: "draft.md", kind: "note", children: [] }], metadata: { lastNotePath: "draft.md", githubWizardPostponed: true } });
      if (request.action === "status") return result({ isRepository: false, hasRemote: false, syncStatus: "sin-git", conflictedFiles: [] });
      if (request.action === "github-remote") return result({ remote: null });
      if (request.action === "read-note") return result({ content });
      if (request.action === "preview-image") return Promise.resolve({ ok: false, domain: "filesystem", action: "preview-image", data: null, error: "Imagen no disponible" });
      return result({});
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    const editable = await findEditableElement();
    await waitFor(() => expect(editable.textContent).toBe(content));
    editable.focus();
    await user.keyboard("{Control>}{Home}{/Control}");
    const originalText = editable.textContent;
    const writesBeforePreview = mocks.invoke.mock.calls.filter(([, { request }]) => request.action === "write-note").length;
    expect(writesBeforePreview).toBe(0);
    await user.click(screen.getByRole("button", { name: "Previsualizar imagen (Alt+Enter)" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(editable.textContent).toBe(originalText);
    const nativePreviews = mocks.invoke.mock.calls.filter(([, { request }]) => request.action === "preview-image");
    expect(nativePreviews).toHaveLength(content.includes("missing.png") ? 1 : 0);
    expect(mocks.invoke.mock.calls.filter(([, { request }]) => request.action === "write-note")).toHaveLength(writesBeforePreview);
  });

  it("retains seven distinct recent notes, keeps unavailable entries and lets the user remove one", async () => {
    const user = userEvent.setup();
    localStorage.removeItem("simpler.showWelcome");
    const entries = Array.from({ length: 7 }, (_, index) => ({ workspacePath: "/tmp/notes", workspaceName: "notes", notePath: `n${index}.md`, openedAt: new Date(Date.now() - (index + 1) * 60000).toISOString(), available: true }));
    localStorage.setItem("simpler.recentNotes", JSON.stringify(entries));
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const reply = (data: unknown) => Promise.resolve({ ok: true, data, error: null });
      if (request.action === "note-availability") return reply({ available: request.payload.notePath !== "n0.md" });
      if (request.domain === "workspace" && request.action === "open") return reply({ name: "notes", path: "/tmp/notes", tree: Array.from({ length: 8 }, (_, index) => ({ name: `n${index}.md`, path: `n${index}.md`, kind: "note", children: [] })), metadata: { lastNotePath: null, githubWizardPostponed: true } });
      if (request.action === "read-note") return reply({ content: request.payload.notePath });
      if (request.domain === "workspace") return reply({});
      if (request.action === "status" && request.domain === "git") return reply({ isRepository: false, hasRemote: false, syncStatus: "sin-git", conflictedFiles: [] });
      if (request.action === "github-remote") return reply({ remote: null });
      throw new Error(`unexpected ${request.domain}/${request.action}`);
    });
    render(<App />);
    let welcome = screen.getByRole("region", { name: "Recientes" });
    expect(await within(welcome).findByRole("button", { name: "n0.md — notes — No disponible" })).toBeInTheDocument();
    expect(within(welcome).getAllByRole("listitem")).toHaveLength(7);
    await user.click(within(welcome).getByRole("button", { name: "n2.md — notes" }));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Recientes" })).not.toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem("simpler.recentNotes")!)).toHaveLength(7);
    await user.click(screen.getByRole("button", { name: "n7.md" }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem("simpler.recentNotes")!)[0].notePath).toBe("n7.md"));
    const stored = JSON.parse(localStorage.getItem("simpler.recentNotes")!);
    expect(stored).toHaveLength(7);
    expect(stored.some((note: { notePath: string }) => note.notePath === "n6.md")).toBe(false);
    expect(stored.some((note: { notePath: string }) => note.notePath === "n0.md")).toBe(true);
    await user.keyboard("{Control>}k{/Control}");
    await user.click(screen.getByRole("button", { name: "Recientes" }));
    welcome = screen.getByRole("region", { name: "Recientes" });
    await user.click(within(welcome).getByRole("button", { name: "Quitar n0.md de Recientes" }));
    expect(within(welcome).getAllByRole("listitem")).toHaveLength(6);
    expect(JSON.parse(localStorage.getItem("simpler.recentNotes")!)).toHaveLength(6);
  });

  it("persists the device Welcome preference across process restarts", async () => {
    const user = userEvent.setup();
    mocks.invoke.mockResolvedValue({ ok: false, data: null, error: "Unavailable" });
    const first = render(<App />);
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("tab", { name: "Workspace" }));
    const preference = screen.getByRole("checkbox", { name: "Mostrar bienvenida al iniciar" });
    expect(preference).not.toBeChecked();
    await user.click(preference);
    await user.click(screen.getByRole("button", { name: "Cerrar configuración" }));
    first.unmount();
    const restarted = render(<App />);
    expect(screen.getByRole("region", { name: "Recientes" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("tab", { name: "Workspace" }));
    await user.click(screen.getByRole("checkbox", { name: "Mostrar bienvenida al iniciar" }));
    await user.click(screen.getByRole("button", { name: "Cerrar configuración" }));
    expect(screen.queryByRole("region", { name: "Recientes" })).not.toBeInTheDocument();
    restarted.unmount();
    render(<App />);
    expect(screen.queryByRole("region", { name: "Recientes" })).not.toBeInTheDocument();
  });

  it("keeps the latest recent-note choice when an older Workspace load finishes late", async () => {
    const user = userEvent.setup();
    localStorage.removeItem("simpler.showWelcome");
    localStorage.setItem("simpler.recentNotes", JSON.stringify(["first", "second"].map((name) => ({ workspacePath: `/tmp/${name}`, workspaceName: name, notePath: "today.md", openedAt: new Date().toISOString(), available: true }))));
    let finishFirst!: (response: unknown) => void;
    const workspace = (name: string) => ({ name, path: `/tmp/${name}`, tree: [{ name: "today.md", path: "today.md", kind: "note", children: [] }], metadata: { lastNotePath: null, githubWizardPostponed: true } });
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const reply = (data: unknown) => Promise.resolve({ ok: true, data, error: null });
      if (request.action === "note-availability") return reply({ available: true });
      if (request.action === "open") return request.payload.workspacePath === "/tmp/first" ? new Promise((resolve) => { finishFirst = resolve; }) : reply(workspace("second"));
      if (request.action === "read-note") return reply({ content: request.payload.workspacePath });
      if (request.domain === "workspace") return reply({});
      if (request.action === "status" && request.domain === "git") return reply({ isRepository: false, hasRemote: false, syncStatus: "sin-git", conflictedFiles: [] });
      if (request.action === "github-remote") return reply({ remote: null });
      throw new Error(`unexpected ${request.domain}/${request.action}`);
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "today.md — first" }));
    await user.click(screen.getByRole("button", { name: "today.md — second" }));
    await waitFor(() => expect(screen.getByTestId("markdown-editor")).toHaveTextContent("/tmp/second"));
    finishFirst({ ok: true, data: workspace("first"), error: null });
    await waitFor(() => expect(screen.getByTestId("markdown-editor")).toHaveTextContent("/tmp/second"));
    expect(screen.getByRole("button", { name: "second — Abrir o cambiar…" })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("simpler.recentNotes")!)).toHaveLength(2);
  });

  it("shows Welcome by default, records opened notes locally and reopens Recientes from the Workspace menu", async () => {
    const user = userEvent.setup();
    localStorage.removeItem("simpler.showWelcome");
    localStorage.setItem("simpler.recentWorkspaces", JSON.stringify([{ name: "notes", path: "/tmp/notes" }]));
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const reply = (data: unknown) => Promise.resolve({ ok: true, data, error: null });
      if (request.domain === "workspace" && request.action === "open") return reply({ name: "notes", path: "/tmp/notes", tree: [{ name: "today.md", path: "today.md", kind: "note", children: [] }], metadata: { lastNotePath: "today.md", githubWizardPostponed: true } });
      if (request.action === "read-note") return reply({ content: "Last session is ready" });
      if (request.action === "note-availability") return reply({ available: true });
      if (request.domain === "workspace") return reply({});
      if (request.domain === "git" && request.action === "status") return reply({ isRepository: false, hasRemote: false, syncStatus: "sin-git", conflictedFiles: [] });
      if (request.action === "github-remote") return reply({ remote: null });
      throw new Error(`unexpected ${request.domain}/${request.action}`);
    });
    render(<App />);
    const welcome = screen.getByRole("region", { name: "Recientes" });
    expect(await within(welcome).findByRole("button", { name: /today.md.*notes/ })).toBeInTheDocument();
    const entries = JSON.parse(localStorage.getItem("simpler.recentNotes") ?? "[]");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ workspacePath: "/tmp/notes", notePath: "today.md" });
    await user.click(within(welcome).getByRole("button", { name: "Continuar" }));
    expect(screen.getByTestId("markdown-editor")).toHaveTextContent("Last session is ready");
    await user.click(screen.getByRole("button", { name: "notes — Abrir o cambiar…" }));
    await user.click(screen.getByRole("menuitem", { name: "Recientes" }));
    expect(screen.getByRole("region", { name: "Recientes" })).toBeInTheDocument();
  });

  it("edits preferences in a contained Settings dialog and restores focus when closed", async () => {
    const user = userEvent.setup();
    mocks.invoke.mockResolvedValue({ ok: false, data: null, error: "Unavailable" });
    render(<App />);
    const origin = screen.getByRole("button", { name: "Settings" });
    await user.click(origin);
    const dialog = screen.getByRole("dialog", { name: "Configuración" });
    for (const name of ["Apariencia", "Editor", "Workspace", "Sync"]) expect(within(dialog).getByRole("tab", { name })).toBeInTheDocument();
    await user.selectOptions(within(dialog).getByLabelText("Modo de apariencia"), "dark");
    expect(localStorage.getItem("simpler.themeMode")).toBe("dark");
    await user.click(within(dialog).getByRole("tab", { name: "Editor" }));
    await user.selectOptions(within(dialog).getByLabelText("Tamaño de letra"), "16");
    await user.click(dialog.parentElement!);
    expect(dialog).toBeInTheDocument();
    origin.focus();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    const close = within(dialog).getByRole("button", { name: "Cerrar configuración" });
    close.focus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Configuración" })).not.toBeInTheDocument();
    expect(origin).toHaveFocus();
    await user.click(origin);
    await user.click(screen.getByRole("tab", { name: "Apariencia" }));
    expect(screen.getByLabelText("Modo de apariencia")).toHaveValue("dark");
    await user.click(screen.getByRole("tab", { name: "Editor" }));
    expect(screen.getByLabelText("Tamaño de letra")).toHaveValue("16");
    await user.click(screen.getByRole("button", { name: "Cerrar configuración" }));
    expect(origin).toHaveFocus();
  });

  it.each(["Renombrar", "Mover", "Eliminar"])("waits for pending Local Save before %s mutates the active note path", async (action) => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    let finishSave!: (value: unknown) => void;
    const mutations: string[] = [];
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const reply = (data: unknown) => Promise.resolve({ ok: true, domain: request.domain, action: request.action, data, error: null });
      const tree = [{ name: "a.md", path: "a.md", kind: "note", children: [] }];
      if (request.action === "open") return reply({ name: "notes", path: "/tmp/notes", tree, metadata: { lastNotePath: "a.md", githubWizardPostponed: true } });
      if (request.action === "read-note") return reply({ content: "Keep writing" });
      if (request.action === "status") return reply({ isRepository: false, hasRemote: false, syncStatus: "sin-git", conflictedFiles: [] });
      if (request.action === "github-remote") return reply({ remote: null });
      if (request.action === "write-note") return new Promise((resolve) => { finishSave = resolve; });
      if (["rename-item", "move-item", "delete-item"].includes(request.action)) {
        mutations.push(request.action);
        return reply({ tree, itemPath: "changed.md" });
      }
      return reply({});
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    const editable = await findEditableElement();
    editable.focus();
    await user.keyboard("X");
    await user.click(screen.getByRole("button", { name: "Más acciones para a.md" }));
    await user.click(screen.getByRole("menuitem", { name: action }));
    const dialog = screen.getByRole("dialog");
    if (action !== "Eliminar") {
      const input = within(dialog).getByRole("textbox");
      await user.clear(input);
      await user.type(input, "changed");
    }
    await user.click(within(dialog).getByRole("button", { name: action === "Eliminar" ? "Eliminar" : "Aceptar" }));
    expect(mutations).toEqual([]);
    finishSave({ ok: true, domain: "filesystem", action: "write-note", data: {}, error: null });
    await waitFor(() => expect(mutations).toHaveLength(1));
  });

  it("reorders mixed siblings from item menus and shows a failed reset without losing the active note", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    let tree = [
      { name: "folder", path: "folder", kind: "folder", children: [] },
      { name: "a.md", path: "a.md", kind: "note", children: [] },
      { name: "z.png", path: "z.png", kind: "image", children: [] },
    ];
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const reply = (data: unknown) => Promise.resolve({ ok: true, domain: request.domain, action: request.action, data, error: null });
      if (request.action === "open") return reply({ name: "notes", path: "/tmp/notes", tree, metadata: { lastNotePath: "a.md", githubWizardPostponed: true } });
      if (request.action === "read-note") return reply({ content: "Keep writing" });
      if (request.action === "status") return reply({ isRepository: false, hasRemote: false, syncStatus: "sin-git", conflictedFiles: [] });
      if (request.action === "github-remote") return reply({ remote: null });
      if (request.action === "set-tree-order") {
        if (request.payload.orderedPaths === null) return Promise.resolve({ ok: false, domain: "workspace", action: "set-tree-order", data: null, error: "Manual Tree Order could not be saved" });
        tree = request.payload.orderedPaths.map((path: string) => tree.find((item) => item.path === path)!);
        return reply({ tree, itemPath: request.payload.parentPath });
      }
      return reply({});
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    const editor = await screen.findByTestId("markdown-editor");
    await user.click(screen.getByRole("button", { name: "Más acciones para z.png" }));
    expect(screen.getByRole("menuitem", { name: "Bajar" })).toBeDisabled();
    await user.click(screen.getByRole("menuitem", { name: "Subir" }));
    await waitFor(() => expect(screen.getAllByRole("button", { name: /^(folder|a.md|z.png)$/ }).map((button) => button.textContent)).toEqual(["folder", "z.png", "a.md"]));
    expect(editor).toHaveTextContent("Keep writing");
    await user.click(screen.getByRole("button", { name: "Más acciones para folder" }));
    expect(screen.getByRole("menuitem", { name: "Subir" })).toBeDisabled();
    await user.click(screen.getByRole("menuitem", { name: "Restablecer orden alfabético" }));
    expect(await screen.findByText("Manual Tree Order could not be saved")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^(folder|a.md|z.png)$/ }).map((button) => button.textContent)).toEqual(["folder", "z.png", "a.md"]);
    expect(editor).toHaveTextContent("Keep writing");
  });

  it.each(["Renombrar", "Mover", "Eliminar"])("uses the clicked tree item for %s while keeping the active note and its edits", async (action) => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    const operations: Array<{ action: string; payload: Record<string, string> }> = [];
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const reply = (data: unknown) => Promise.resolve({ ok: true, domain: request.domain, action: request.action, data, error: null });
      const tree = ["today.md", "other.md"].map((path) => ({ name: path, path, kind: "note", children: [] }));
      if (request.domain === "workspace" && request.action === "open") return reply({ name: "notes", path: "/tmp/notes", tree, metadata: { lastNotePath: "today.md", githubWizardPostponed: true } });
      if (request.domain === "workspace" && ["remember-note", "remember-tree-state"].includes(request.action)) return reply({});
      if (request.domain === "filesystem" && request.action === "read-note") {
        if (request.payload.notePath !== "today.md") throw new Error("Opening an item menu must not read or select that note");
        return reply({ content: "Current text" });
      }
      if (request.domain === "filesystem" && request.action === "write-note") return reply({ content: request.payload.content });
      if (request.domain === "filesystem" && ["rename-item", "move-item", "delete-item"].includes(request.action)) {
        operations.push(request);
        return reply({ tree, itemPath: action === "Renombrar" ? "renamed.md" : action === "Mover" ? "archive/other.md" : "" });
      }
      if (request.domain === "git" && request.action === "status") return reply({ isRepository: false, hasRemote: false, syncStatus: "sin-git", conflictedFiles: [] });
      if (request.domain === "git" && request.action === "github-remote") return reply({ remote: null });
      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    const editable = await findEditableElement();
    editable.focus();
    await user.keyboard("X");
    const currentText = editable.textContent;
    const moreButton = screen.getByRole("button", { name: "Más acciones para other.md" });
    await user.click(moreButton);
    expect(screen.getByRole("menuitem", { name: "Renombrar" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Mover" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(moreButton).toHaveFocus();
    if (action === "Renombrar") await user.click(moreButton);
    else if (action === "Mover") {
      screen.getByRole("button", { name: "other.md" }).focus();
      await user.keyboard("{Shift>}{F10}{/Shift}");
    } else fireEvent.contextMenu(screen.getByRole("button", { name: "other.md" }));
    await user.click(screen.getByRole("menuitem", { name: action }));
    const dialog = screen.getByRole("dialog");
    if (action !== "Eliminar") {
      const input = within(dialog).getByRole("textbox");
      await user.clear(input);
      await user.type(input, action === "Renombrar" ? "renamed" : "archive");
    }
    await user.click(within(dialog).getByRole("button", { name: action === "Eliminar" ? "Eliminar" : "Aceptar" }));
    await waitFor(() => expect(operations).toHaveLength(1));
    expect(operations[0].payload.itemPath).toBe("other.md");
    expect(screen.getByTestId("markdown-editor").querySelector("[contenteditable=true]")).toBe(editable);
    expect(editable.textContent).toBe(currentText);
    expect(screen.getByRole("button", { name: "Workspace Tree Mode" })).toHaveAccessibleDescription(/Modo libre/);
    expect(screen.getByRole("button", { name: "Focus Active Note" })).toHaveAccessibleDescription(/mostrar la ruta de la nota activa/);
  });

  it("previews an image without changing the active Raw Markdown note and returns focus", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    let finishPreview!: (value: unknown) => void;
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const result = (data: unknown) => Promise.resolve({ ok: true, domain: request.domain, action: request.action, data, error: null });
      if (request.action === "open") return result({ name: "notes", path: "/tmp/notes", tree: [
        { name: "draft.md", path: "draft.md", kind: "note", children: [] },
        { name: "assets", path: "assets", kind: "folder", children: [
          { name: "photo.png", path: "assets/photo.png", kind: "image", children: [] },
        ] },
      ], metadata: { lastNotePath: "draft.md", openFolderPaths: ["assets"], githubWizardPostponed: true } });
      if (request.action === "status") return result({ isRepository: false, hasRemote: false, syncStatus: "sin-git", conflictedFiles: [] });
      if (request.action === "github-remote") return result({ remote: null });
      if (request.action === "read-note") return result({ content: "# Draft\nLocal work stays here" });
      if (request.action === "write-note") return new Promise(() => {});
      if (request.action === "preview-image") return new Promise((resolve) => { finishPreview = resolve; });
      return result({});
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    await screen.findByText("Local work stays here", { exact: false });
    const editable = await findEditableElement();
    await user.click(editable);
    await user.type(editable, "{End} unsaved");
    const editedContent = screen.getByTestId("markdown-editor").textContent;
    await waitFor(() => expect(mocks.invoke.mock.calls.some(([, { request }]) => request.action === "write-note")).toBe(true));
    const imageButton = screen.getByRole("button", { name: "photo.png" });
    await user.click(imageButton);
    const preview = screen.getByRole("dialog", { name: "Vista previa de imagen" });
    expect(within(preview).getByText("Cargando imagen…")).toBeInTheDocument();
    expect(screen.getByTestId("markdown-editor").textContent).toBe(editedContent);
    finishPreview({ ok: true, domain: "filesystem", action: "preview-image", data: { name: "photo.png", sizeBytes: 1234, width: 40, height: 30, dataUrl: "data:image/png;base64,aGVsbG8=" }, error: null });
    expect(await within(preview).findByText("1.2 KiB · 40 × 30 px")).toBeInTheDocument();
    await user.click(within(preview).getByRole("button", { name: "Abrir externamente" }));
    expect(mocks.invoke).toHaveBeenCalledWith("native_command", { request: { domain: "filesystem", action: "open-image-external", payload: { workspacePath: "/tmp/notes", imagePath: "assets/photo.png" } } });
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Vista previa de imagen" })).not.toBeInTheDocument();
    expect(imageButton).toHaveFocus();
    expect(screen.getByTestId("markdown-editor").textContent).toBe(editedContent);
    expect(mocks.invoke.mock.calls.filter(([, { request }]) => request.action === "read-note").map(([, { request }]) => request.payload.notePath)).toEqual(["draft.md"]);
    await user.click(imageButton);
    finishPreview({ ok: false, domain: "filesystem", action: "preview-image", data: null, error: "Imagen demasiado grande" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Imagen demasiado grande");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(screen.getByText("Cargando imagen…")).toBeInTheDocument();
    finishPreview({ ok: true, domain: "filesystem", action: "preview-image", data: { name: "photo.png", sizeBytes: 1234, width: 40, height: 30, dataUrl: "data:image/png;base64,aGVsbG8=" }, error: null });
    const recoveredImage = await screen.findByRole("img", { name: "photo.png" });
    fireEvent.error(recoveredImage);
    expect(screen.getByRole("alert")).toHaveTextContent("La imagen no se puede mostrar");
    await user.click(screen.getByRole("button", { name: "Cerrar vista previa" }));
    expect(screen.getByTestId("markdown-editor").textContent).toBe(editedContent);
  });

  it("restores the last Workspace and note on process startup without opening the folder menu", async () => {
    localStorage.setItem("simpler.recentWorkspaces", JSON.stringify([{ name: "notes", path: "/tmp/notes" }]));
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const reply = (data: unknown) => Promise.resolve({ ok: true, domain: request.domain, action: request.action, data, error: null });
      if (request.domain === "workspace" && request.action === "open") return reply({ name: "notes", path: "/tmp/notes", tree: [{ name: "today.md", path: "today.md", kind: "note", children: [] }], metadata: { lastNotePath: "today.md", githubWizardPostponed: true } });
      if (request.domain === "workspace" && ["remember-note", "remember-tree-state"].includes(request.action)) return reply({});
      if (request.domain === "filesystem" && request.action === "read-note") return reply({ content: "# Last session" });
      if (request.domain === "git" && request.action === "status") return reply({ isRepository: false, hasRemote: false, syncStatus: "sin-git", conflictedFiles: [] });
      if (request.domain === "git" && request.action === "github-remote") return reply({ remote: null });
      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });
    const firstProcess = render(<App />);
    expect(await screen.findByTestId("markdown-editor")).toHaveTextContent("# Last session");
    firstProcess.unmount();
    render(<App />);
    expect(await screen.findByTestId("markdown-editor")).toHaveTextContent("# Last session");
  });

  it.each(["workspace", "note"])("offers a usable startup when the last %s is unavailable", async (unavailable) => {
    localStorage.setItem("simpler.recentWorkspaces", JSON.stringify([{ name: "notes", path: "/tmp/notes" }]));
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const reply = (data: unknown) => Promise.resolve({ ok: true, domain: request.domain, action: request.action, data, error: null });
      if (request.domain === "workspace" && request.action === "open") {
        if (unavailable === "workspace") return Promise.resolve({ ok: false, domain: "workspace", action: "open", data: null, error: "Workspace folder is unavailable" });
        return reply({ name: "notes", path: "/tmp/notes", tree: [], metadata: { lastNotePath: null, githubWizardPostponed: true } });
      }
      if (request.domain === "git" && request.action === "status") return reply({ isRepository: false, hasRemote: false, syncStatus: "sin-git", conflictedFiles: [] });
      if (request.domain === "git" && request.action === "github-remote") return reply({ remote: null });
      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });
    render(<App />);
    if (unavailable === "workspace") {
      expect(await screen.findByText("Workspace folder is unavailable")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Abrir carpeta" })).toBeEnabled();
    } else {
      expect(await screen.findByText("Create a note to start writing in notes.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "New note" })).toBeEnabled();
    }
    expect(screen.queryByTestId("markdown-editor")).not.toBeInTheDocument();
  });

  it("shows a pending startup check in Welcome and reports a late result above the editor", async () => {
    const user = userEvent.setup();
    localStorage.setItem("simpler.showWelcome", "true");
    localStorage.setItem("simpler.recentWorkspaces", JSON.stringify([{ name: "notes", path: "/tmp/notes" }]));
    let finishCheck!: (result: unknown) => void;
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const reply = (data: unknown) => Promise.resolve({ ok: true, domain: request.domain, action: request.action, data, error: null });
      if (request.domain === "workspace" && request.action === "open") return reply({ name: "notes", path: "/tmp/notes", tree: [], metadata: { lastNotePath: null, githubWizardPostponed: true } });
      if (request.domain === "git" && request.action === "status") return reply({ isRepository: true, hasRemote: true, syncStatus: "sincronizado", conflictedFiles: [] });
      if (request.action === "check-remote") return new Promise((resolve) => { finishCheck = resolve; });
      return reply({ remote: null });
    });
    render(<App />);
    const welcome = screen.getByRole("region", { name: "Recientes" });
    expect(await screen.findByRole("button", { name: "Comprobando actualizaciones…" })).toBeInTheDocument();
    await user.click(within(welcome).getByRole("button", { name: "Continuar" }));
    finishCheck({ ok: true, data: { state: "incoming", ahead: 0, behind: 1, hasLocalChanges: true, message: null }, error: null });
    expect(await screen.findByText("Hay cambios locales y remotos pendientes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sincronizar — cambios remotos disponibles" })).toBeInTheDocument();
    expect(mocks.invoke.mock.calls.some(([, { request }]) => request.action === "sync")).toBe(false);
  });

  it("shows incoming remote changes and retries a disconnected check without syncing", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/remote-notes");
    let checks = 0;
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const answer = (data: unknown) => Promise.resolve({ ok: true, domain: request.domain, action: request.action, data, error: null });
      if (request.domain === "workspace" && request.action === "open") return answer({ name: "remote-notes", path: "/tmp/remote-notes", tree: [], metadata: { lastNotePath: null } });
      if (request.action === "status" && request.domain === "git") return answer({ isRepository: true, hasRemote: true, syncStatus: "sincronizado", conflictedFiles: [] });
      if (request.action === "github-remote") return answer({ remote: { name: "origin", url: "https://github.com/simpler/notes.git" } });
      if (request.action === "check-remote") {
        checks += 1;
        return answer(checks !== 2
          ? { state: "disconnected", ahead: 0, behind: 0, hasLocalChanges: false, message: "Could not resolve host" }
          : { state: "incoming", ahead: 0, behind: 2, hasLocalChanges: true, message: null });
      }
      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });
    render(<App />);
    await user.click(screen.getAllByRole("button", { name: "Abrir carpeta" })[0]);
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    await user.click(await screen.findByRole("button", { name: "Desconectado — reintentar" }));
    const sync = await screen.findByRole("button", { name: "Sincronizar — cambios remotos disponibles" });
    expect(sync).toHaveAttribute("title", expect.stringContaining("cambios locales y remotos"));
    expect(mocks.invoke.mock.calls.some(([, { request }]) => request.action === "sync")).toBe(false);
    fireEvent.focus(window);
    expect(checks).toBe(2);
    await user.click(sync);
    const disconnected = await screen.findByRole("button", { name: "Desconectado — reintentar" });
    expect(disconnected).toHaveAttribute("title", expect.stringContaining("Última comprobación correcta:"));
  });

  it("ignores old Workspace remote results and coalesces focus checks while one is pending", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValueOnce("/tmp/first").mockResolvedValueOnce("/tmp/second");
    let finishFirst!: (response: unknown) => void;
    const checked: string[] = [];
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const answer = (data: unknown) => Promise.resolve({ ok: true, domain: request.domain, action: request.action, data, error: null });
      if (request.domain === "workspace" && request.action === "open") return answer({ name: request.payload.workspacePath.split("/").pop(), path: request.payload.workspacePath, tree: [], metadata: { lastNotePath: null } });
      if (request.action === "status" && request.domain === "git") return answer({ isRepository: true, hasRemote: true, syncStatus: "sincronizado", conflictedFiles: [] });
      if (request.action === "github-remote") return answer({ remote: { name: "origin", url: "https://github.com/simpler/notes.git" } });
      if (request.action === "check-remote") {
        checked.push(request.payload.workspacePath);
        if (request.payload.workspacePath === "/tmp/first") return new Promise((resolve) => { finishFirst = resolve; });
        return answer({ state: "up-to-date", ahead: 0, behind: 0, hasLocalChanges: false, message: null });
      }
      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });
    render(<App />);
    await user.click(screen.getAllByRole("button", { name: "Abrir carpeta" })[0]);
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    await screen.findByRole("button", { name: "Comprobando actualizaciones…" });
    fireEvent.focus(window);
    fireEvent.focus(window);
    expect(checked).toEqual(["/tmp/first"]);
    await user.click(screen.getByRole("button", { name: /first/ }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    finishFirst({ ok: true, data: { state: "incoming", behind: 3, ahead: 0, hasLocalChanges: false, message: null }, error: null });
    await waitFor(() => expect(checked).toEqual(["/tmp/first", "/tmp/second"]));
    await screen.findByRole("button", { name: "Sincronizar" });
    expect(screen.queryByRole("button", { name: "Sincronizar — cambios remotos disponibles" })).not.toBeInTheDocument();
  });

  it("creates a visible note in its collapsed folder and accepts typing immediately without refocusing on Local Save", async () => {
    const user = userEvent.setup();
    const writes: string[] = [];
    let finishSave!: () => void;
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const reply = (data: unknown) => Promise.resolve({ ok: true, domain: request.domain, action: request.action, data, error: null });
      const folder = { name: "project", path: "project", kind: "folder", children: [] as unknown[] };
      if (request.domain === "workspace" && request.action === "open") {
        return reply({ name: "notes", path: "/tmp/notes", tree: [folder], metadata: { lastNotePath: null, githubWizardPostponed: true } });
      }
      if (request.domain === "git" && request.action === "status") {
        return reply({ isRepository: false, hasRemote: false, syncStatus: "sin-git", conflictedFiles: [] });
      }
      if (request.domain === "git" && request.action === "github-remote") return reply({ remote: null });
      if (request.domain === "workspace" && ["remember-note", "remember-tree-state"].includes(request.action)) return reply({});
      if (request.domain === "filesystem" && request.action === "create-note") {
        expect(request.payload.parentPath).toBe("project");
        return reply({ itemPath: "project/draft.md", tree: [{ ...folder, children: [{ name: "draft.md", path: "project/draft.md", kind: "note", children: [] }] }] });
      }
      if (request.domain === "filesystem" && request.action === "write-note") {
        writes.push(request.payload.content);
        return new Promise((resolve) => {
          finishSave = () => resolve({ ok: true, domain: "filesystem", action: "write-note", data: { content: request.payload.content }, error: null });
        });
      }
      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    // A context action targets this folder without selecting or expanding it first.
    fireEvent.contextMenu(screen.getByRole("button", { name: "project" }));
    expect(screen.getByRole("button", { name: "Expand project" })).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Nueva nota" }));
    await user.type(within(screen.getByRole("dialog", { name: "Nombre de la nota" })).getByRole("textbox"), "draft{Enter}");
    const editable = await findEditableElement();
    expect(editable).toHaveFocus();
    await user.keyboard("X");
    await waitFor(() => expect(writes).toContain("X"));
    expect(editable).toHaveFocus();
    expect(screen.getByRole("button", { name: "Collapse project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "draft.md" })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("simpler.recentNotes")!)[0]).toMatchObject({ workspacePath: "/tmp/notes", notePath: "project/draft.md" });
    await user.click(screen.getByRole("button", { name: "New folder" }));
    const folderNameInput = within(screen.getByRole("dialog", { name: "Nombre de la carpeta" })).getByRole("textbox");
    finishSave();
    await waitFor(() => expect(folderNameInput).toHaveFocus());
  });

  it.each(["cancel", "failure"])("keeps the current note and its changes when note creation ends in %s", async (outcome) => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const reply = (data: unknown) => Promise.resolve({ ok: true, domain: request.domain, action: request.action, data, error: null });
      if (request.domain === "workspace" && request.action === "open") return reply({ name: "notes", path: "/tmp/notes", tree: [{ name: "today.md", path: "today.md", kind: "note", children: [] }], metadata: { lastNotePath: "today.md", githubWizardPostponed: true } });
      if (request.domain === "filesystem" && request.action === "read-note") return reply({ content: "Existing words" });
      if (request.domain === "filesystem" && request.action === "write-note") return reply({ content: request.payload.content });
      if (request.domain === "workspace" && ["remember-note", "remember-tree-state"].includes(request.action)) return reply({});
      if (request.domain === "git" && request.action === "status") return reply({ isRepository: false, hasRemote: false, syncStatus: "sin-git", conflictedFiles: [] });
      if (request.domain === "git" && request.action === "github-remote") return reply({ remote: null });
      if (request.domain === "filesystem" && request.action === "create-note") return Promise.resolve({ ok: false, domain: "filesystem", action: "create-note", data: null, error: "A note with that name already exists" });
      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    const editable = await findEditableElement();
    editable.focus();
    await user.keyboard("X");
    const currentText = editable.textContent;
    await user.click(screen.getByRole("button", { name: "New note" }));
    const dialog = screen.getByRole("dialog", { name: "Nombre de la nota" });
    if (outcome === "cancel") await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    else {
      await user.type(within(dialog).getByRole("textbox"), "today{Enter}");
      expect(await screen.findByText("A note with that name already exists")).toBeInTheDocument();
    }
    expect(screen.getByTestId("markdown-editor").querySelector("[contenteditable=true]")).toBe(editable);
    expect(editable.textContent).toBe(currentText);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the current note when a pending Local Save or the destination Workspace fails", async () => {
    const user = userEvent.setup();
    localStorage.setItem("simpler.recentWorkspaces", JSON.stringify([{ name: "source", path: "/tmp/source" }]));
    mocks.open.mockResolvedValue("/tmp/destination");
    let finishSave!: (response: unknown) => void;
    let writes = 0;
    const opened: string[] = [];
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const reply = (data: unknown) => Promise.resolve({ ok: true, data, error: null });
      if (request.domain === "workspace" && request.action === "open") {
        opened.push(request.payload.workspacePath);
        if (request.payload.workspacePath === "/tmp/destination") return Promise.resolve({ ok: false, data: null, error: "Destination unavailable" });
        return reply({ name: "source", path: "/tmp/source", tree: [{ name: "today.md", path: "today.md", kind: "note", children: [] }], metadata: { lastNotePath: "today.md", githubWizardPostponed: true } });
      }
      if (request.action === "read-note") return reply({ content: "Keep my writing" });
      if (request.action === "write-note") {
        writes += 1;
        if (writes === 1) return new Promise((resolve) => { finishSave = resolve; });
        return reply({ content: request.payload.content });
      }
      if (request.domain === "workspace") return reply({});
      if (request.action === "status" && request.domain === "git") return reply({ isRepository: false, hasRemote: false, syncStatus: "sin-git", conflictedFiles: [] });
      if (request.action === "github-remote") return reply({ remote: null });
      throw new Error(`unexpected ${request.domain}/${request.action}`);
    });
    render(<App />);
    const editor = await screen.findByTestId("markdown-editor");
    const editable = await findEditableElement();
    await waitFor(() => expect(editable.textContent).toBe("Keep my writing"));
    editable.focus();
    await user.keyboard("X");
    await user.click(screen.getByRole("button", { name: "source — Abrir o cambiar…" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    expect(opened).toEqual(["/tmp/source"]);
    finishSave({ ok: false, data: null, error: "Disk full" });
    expect(await screen.findByText("Disk full")).toBeInTheDocument();
    expect(editable.textContent).toContain("X");
    expect(opened).toEqual(["/tmp/source"]);
    editable.focus();
    await user.keyboard("Y");
    await user.click(screen.getByRole("button", { name: "source — Abrir o cambiar…" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    expect(await screen.findByText("Destination unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "source — Abrir o cambiar…" })).toBeInTheDocument();
    expect(screen.getByTestId("markdown-editor").textContent).toContain("XY");
  });

  it("navigates the Workspace menu by keyboard and returns focus to its trigger", async () => {
    const user = userEvent.setup();
    localStorage.setItem("simpler.recentWorkspaces", JSON.stringify([{ name: "archived", path: "/tmp/archived" }]));
    mocks.invoke.mockResolvedValue({ ok: false, data: null, error: "Unavailable" });
    render(<App />);
    const trigger = screen.getByRole("button", { name: "Abrir carpeta" });
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Abrir carpeta" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Recientes" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "/tmp/archived" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "Clonar desde GitHub" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu", { name: "Workspace menu" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("offers cloning as a secondary Workspace menu action and opens the cloned Workspace", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "prompt")
      .mockReturnValueOnce("https://github.com/simpler/notes.git")
      .mockReturnValueOnce("/tmp/cloned-notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      if (request.domain === "git" && request.action === "clone-github-repository") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "clone-github-repository",
          data: { workspacePath: "/tmp/cloned-notes" },
          error: null,
        });
      }
      if (request.domain === "workspace" && request.action === "open") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "open",
          data: { name: "cloned-notes", path: "/tmp/cloned-notes", tree: [], metadata: { lastNotePath: null } },
          error: null,
        });
      }
      if (request.domain === "git" && request.action === "status") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "status",
          data: { isRepository: true, hasRemote: true, syncStatus: "sincronizado", conflictedFiles: [] },
          error: null,
        });
      }
      if (request.domain === "git" && request.action === "github-remote") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "github-remote",
          data: { remote: { name: "origin", url: "https://github.com/simpler/notes.git" } },
          error: null,
        });
      }
      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });

    render(<App />);

    expect(screen.getByRole("button", { name: "Abrir carpeta" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clonar desde GitHub" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Clonar desde GitHub" }));

    expect(mocks.invoke).toHaveBeenCalledWith("native_command", {
      request: {
        domain: "git",
        action: "clone-github-repository",
        payload: { repositoryUrl: "https://github.com/simpler/notes.git", destinationPath: "/tmp/cloned-notes" },
      },
    });
    await waitFor(() => expect(screen.getByText("/tmp/cloned-notes")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "cloned-notes — Abrir o cambiar…" })).toBeInTheDocument();
    expect(screen.getByText("Abrir o cambiar…")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(within(screen.getByRole("dialog", { name: "Configuración" })).getByRole("tab", { name: "Sync" }));
    expect(screen.getByText("https://github.com/simpler/notes.git")).toBeInTheDocument();
  });

  it("renders advanced Git details, Sync events, and GitHub authentication without making Git the primary view", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      if (request.domain === "workspace" && request.action === "open") {
        return Promise.resolve({ ok: true, domain: "workspace", action: "open", data: { name: "notes", path: "/tmp/notes", tree: [], metadata: { lastNotePath: null } }, error: null });
      }
      if (request.domain === "git" && request.action === "status") {
        return Promise.resolve({ ok: true, domain: "git", action: "status", data: { isRepository: true, hasRemote: true, syncStatus: "sincronizado", conflictedFiles: [] }, error: null });
      }
      if (request.domain === "git" && request.action === "github-remote") {
        return Promise.resolve({ ok: true, domain: "git", action: "github-remote", data: { remote: { name: "origin", url: "https://github.com/simpler/notes.git" } }, error: null });
      }
      if (request.domain === "git" && request.action === "advanced-status") {
        return Promise.resolve({ ok: true, domain: "git", action: "advanced-status", data: { isRepository: true, repository: "https://github.com/simpler/notes.git", branch: "main", latestCommit: { id: "abc1234", subject: "Write today", timestamp: "2026-08-05T12:00:00Z" }, pendingChanges: ["today.md"] }, error: null });
      }
      if (request.domain === "auth" && request.action === "status") {
        return Promise.resolve({ ok: true, domain: "auth", action: "status", data: { state: "connected", message: null }, error: null });
      }
      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });

    render(<App />);
    await user.click(screen.getAllByRole("button", { name: "Abrir carpeta" })[0]);
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(within(screen.getByRole("dialog", { name: "Configuración" })).getByRole("tab", { name: "Sync" }));
    await user.click(screen.getByText("Advanced Git"));

    const advanced = screen.getByRole("region", { name: "Advanced Git details" });
    expect(within(advanced).getByText("https://github.com/simpler/notes.git")).toBeInTheDocument();
    expect(within(advanced).getByText("main")).toBeInTheDocument();
    expect(within(advanced).getByText("abc1234 Write today")).toBeInTheDocument();
    expect(within(advanced).getByText("today.md")).toBeInTheDocument();
    expect(await within(advanced).findByText("connected")).toBeInTheDocument();
    expect(within(advanced).getByText("No Sync events yet.")).toBeInTheDocument();
    expect(within(advanced).getByRole("button", { name: "Refresh Git details" })).toBeInTheDocument();
  });

  it("opens Trash, restores an item, and refreshes the Workspace Tree", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      if (request.domain === "workspace" && request.action === "open") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "open",
          data: {
            name: "notes",
            path: "/tmp/notes",
            tree: [],
            metadata: { lastNotePath: null, githubWizardPostponed: true, openFolderPaths: [], treeMode: "free" },
          },
          error: null,
        });
      }
      if (request.domain === "git" && request.action === "status") {
        return Promise.resolve({ ok: true, domain: "git", action: "status", data: { isRepository: false, hasRemote: false, syncStatus: "sin-git", conflictedFiles: [] }, error: null });
      }
      if (request.domain === "git" && request.action === "github-remote") {
        return Promise.resolve({ ok: true, domain: "git", action: "github-remote", data: { remote: null }, error: null });
      }
      if (request.domain === "filesystem" && request.action === "list-trash") {
        return Promise.resolve({
          ok: true,
          domain: "filesystem",
          action: "list-trash",
          data: { entries: [{
            id: "trash-1",
            originalRelativePath: "today.md",
            trashedRelativePath: ".simpler/local/trash/trash-1-today.md",
            deletedAt: "2026-08-08T12:00:00Z",
            isDirectory: false,
          }] },
          error: null,
        });
      }
      if (request.domain === "filesystem" && request.action === "restore-trash-item") {
        return Promise.resolve({
          ok: true,
          domain: "filesystem",
          action: "restore-trash-item",
          data: {
            patch: {
              removedPaths: [],
              upsertedItem: { name: "today.md", path: "today.md", kind: "note", children: [] },
            },
            itemPath: "today.md",
          },
          error: null,
        });
      }
      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });

    render(<App />);
    await user.click(screen.getAllByRole("button", { name: "Abrir carpeta" })[0]);
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("tab", { name: "Trash" }));
    await user.click(await screen.findByRole("button", { name: "Restore" }));
    expect(await screen.findByRole("button", { name: "today.md" })).toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenCalledWith("native_command", {
      request: { domain: "filesystem", action: "restore-trash-item", payload: { workspacePath: "/tmp/notes", id: "trash-1" } },
    });
  });

  it("connects a GitHub remote through the GitHubConnectionWizard, syncs, and reports connection errors", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    let connectShouldFail = true;
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      if (request.domain === "workspace" && request.action === "open") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "open",
          data: { name: "notes", path: "/tmp/notes", tree: [], metadata: { lastNotePath: null } },
          error: null,
        });
      }
      if (request.domain === "git" && request.action === "status") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "status",
          data: { isRepository: true, hasRemote: !connectShouldFail, syncStatus: connectShouldFail ? "sin-remoto" : "sincronizado", conflictedFiles: [] },
          error: null,
        });
      }
      if (request.domain === "git" && request.action === "advanced-status") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "advanced-status",
          data: { isRepository: true, repository: null, branch: null, latestCommit: null, pendingChanges: [] },
          error: null,
        });
      }
      if (request.domain === "git" && request.action === "github-remote") {
        return Promise.resolve({ ok: true, domain: "git", action: "github-remote", data: { remote: null }, error: null });
      }
      if (request.domain === "git" && request.action === "connect-github-remote") {
        return Promise.resolve(connectShouldFail
          ? { ok: false, domain: "git", action: "connect-github-remote", data: null, error: "remote origin already exists" }
          : { ok: true, domain: "git", action: "connect-github-remote", data: { name: "origin", url: request.payload.remoteUrl }, error: null });
      }
      if (request.domain === "git" && request.action === "sync") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "sync",
          data: { status: "synced", message: "Sync completed", conflictedFiles: [] },
          error: null,
        });
      }
      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });

    render(<App />);
    await user.click(screen.getAllByRole("button", { name: "Abrir carpeta" })[0]);
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    await user.keyboard("{Control>}2{/Control}");
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(within(screen.getByRole("dialog", { name: "Configuración" })).getByRole("tab", { name: "Sync" }));
    await user.click(screen.getByRole("button", { name: "Conectar remoto GitHub" }));

    const urlInput = screen.getByLabelText("GitHub repository URL");
    await user.type(urlInput, "https://github.com/simpler/notes.git");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    expect(await screen.findByText("remote origin already exists")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "GitHub Connection Wizard" })).toBeInTheDocument();

    connectShouldFail = false;
    await user.click(screen.getByRole("button", { name: "Connect" }));

    expect(mocks.invoke).toHaveBeenCalledWith("native_command", {
      request: {
        domain: "git",
        action: "connect-github-remote",
        payload: { workspacePath: "/tmp/notes", remoteUrl: "https://github.com/simpler/notes.git" },
      },
    });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "GitHub Connection Wizard" })).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(within(screen.getByRole("dialog", { name: "Configuración" })).getByRole("tab", { name: "Sync" }));
    expect(screen.getByText("https://github.com/simpler/notes.git")).toBeInTheDocument();
  });

  it("keeps the wizard open with the returned error when the post-connect Sync call fails", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      if (request.domain === "workspace" && request.action === "open") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "open",
          data: { name: "notes", path: "/tmp/notes", tree: [], metadata: { lastNotePath: null } },
          error: null,
        });
      }
      if (request.domain === "git" && request.action === "status") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "status",
          data: { isRepository: true, hasRemote: false, syncStatus: "sin-remoto", conflictedFiles: [] },
          error: null,
        });
      }
      if (request.domain === "git" && request.action === "github-remote") {
        return Promise.resolve({ ok: true, domain: "git", action: "github-remote", data: { remote: null }, error: null });
      }
      if (request.domain === "git" && request.action === "connect-github-remote") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "connect-github-remote",
          data: { name: "origin", url: request.payload.remoteUrl },
          error: null,
        });
      }
      if (request.domain === "git" && request.action === "sync") {
        return Promise.resolve({
          ok: false,
          domain: "git",
          action: "sync",
          data: null,
          error: "Git credentials problem - check your SSH key or credential helper",
        });
      }
      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });

    render(<App />);
    await user.click(screen.getAllByRole("button", { name: "Abrir carpeta" })[0]);
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    await user.keyboard("{Control>}2{/Control}");
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(within(screen.getByRole("dialog", { name: "Configuración" })).getByRole("tab", { name: "Sync" }));
    await user.click(screen.getByRole("button", { name: "Conectar remoto GitHub" }));

    await user.type(screen.getByLabelText("GitHub repository URL"), "https://github.com/simpler/notes.git");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    const wizard = await screen.findByRole("dialog", { name: "GitHub Connection Wizard" });
    expect(within(wizard).getByText("Git credentials problem - check your SSH key or credential helper")).toBeInTheDocument();
  });

  it("shows an inline validation error for a non-GitHub URL without calling the native command", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      if (request.domain === "workspace" && request.action === "open") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "open",
          data: { name: "notes", path: "/tmp/notes", tree: [], metadata: { lastNotePath: null } },
          error: null,
        });
      }
      if (request.domain === "git" && request.action === "status") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "status",
          data: { isRepository: true, hasRemote: false, syncStatus: "sin-remoto", conflictedFiles: [] },
          error: null,
        });
      }
      if (request.domain === "git" && request.action === "github-remote") {
        return Promise.resolve({ ok: true, domain: "git", action: "github-remote", data: { remote: null }, error: null });
      }
      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });

    render(<App />);
    await user.click(screen.getAllByRole("button", { name: "Abrir carpeta" })[0]);
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    await user.keyboard("{Control>}2{/Control}");
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(within(screen.getByRole("dialog", { name: "Configuración" })).getByRole("tab", { name: "Sync" }));
    await user.click(screen.getByRole("button", { name: "Conectar remoto GitHub" }));

    await user.type(screen.getByLabelText("GitHub repository URL"), "https://gitlab.com/simpler/notes.git");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    expect(await screen.findByText("Enter a valid GitHub repository URL")).toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalledWith(
      "native_command",
      expect.objectContaining({ request: expect.objectContaining({ action: "connect-github-remote" }) }),
    );
  });

  describe("GitHub Connection Wizard auto-trigger and postpone", () => {
    function mockOpenedWorkspace(syncStatus: string, githubWizardPostponed = false) {
      mocks.invoke.mockImplementation((_command: string, { request }) => {
        if (request.domain === "workspace" && request.action === "open") {
          return Promise.resolve({
            ok: true,
            domain: "workspace",
            action: "open",
            data: {
              name: "notes",
              path: "/tmp/notes",
              tree: [],
              metadata: { lastNotePath: null, githubWizardPostponed },
            },
            error: null,
          });
        }
        if (request.domain === "git" && request.action === "status") {
          return Promise.resolve({
            ok: true,
            domain: "git",
            action: "status",
            data: { isRepository: syncStatus !== "sin-git", hasRemote: syncStatus === "sincronizado", syncStatus, conflictedFiles: [] },
            error: null,
          });
        }
        if (request.domain === "git" && request.action === "github-remote") {
          return Promise.resolve({
            ok: true,
            domain: "git",
            action: "github-remote",
            data: { remote: syncStatus === "sincronizado" ? { name: "origin", url: "https://github.com/simpler/notes.git" } : null },
            error: null,
          });
        }
        if (request.domain === "git" && request.action === "advanced-status") {
          return Promise.resolve({
            ok: true,
            domain: "git",
            action: "advanced-status",
            data: { isRepository: syncStatus !== "sin-git", repository: null, branch: null, latestCommit: null, pendingChanges: [] },
            error: null,
          });
        }
        if (request.domain === "workspace" && request.action === "postpone-github-wizard") {
          return Promise.resolve({
            ok: true,
            domain: "workspace",
            action: "postpone-github-wizard",
            data: { lastNotePath: null, githubWizardPostponed: true },
            error: null,
          });
        }
        throw new Error(`unexpected native command ${request.domain}/${request.action}`);
      });
    }

    it("auto-opens the wizard when Workspace status is sin-git", async () => {
      const user = userEvent.setup();
      mocks.open.mockResolvedValue("/tmp/notes");
      mockOpenedWorkspace("sin-git");

      render(<App />);
      await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
      await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));

      expect(await screen.findByRole("dialog", { name: "GitHub Connection Wizard" })).toBeInTheDocument();
    });

    it("auto-opens the wizard when Workspace status is sin-remoto", async () => {
      const user = userEvent.setup();
      mocks.open.mockResolvedValue("/tmp/notes");
      mockOpenedWorkspace("sin-remoto");

      render(<App />);
      await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
      await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));

      expect(await screen.findByRole("dialog", { name: "GitHub Connection Wizard" })).toBeInTheDocument();
    });

    it("never auto-opens the wizard when a remote is already configured", async () => {
      const user = userEvent.setup();
      mocks.open.mockResolvedValue("/tmp/notes");
      mockOpenedWorkspace("sincronizado");

      render(<App />);
      await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
      await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
      await user.click(screen.getByRole("button", { name: "Settings" }));

      await user.click(within(screen.getByRole("dialog", { name: "Configuración" })).getByRole("tab", { name: "Sync" }));
      await waitFor(() => expect(screen.getByText("https://github.com/simpler/notes.git")).toBeInTheDocument());
      expect(screen.queryByRole("dialog", { name: "GitHub Connection Wizard" })).not.toBeInTheDocument();
    });

    it("does not auto-open the wizard when it was previously postponed for this Workspace", async () => {
      const user = userEvent.setup();
      mocks.open.mockResolvedValue("/tmp/notes");
      mockOpenedWorkspace("sin-remoto", true);

      render(<App />);
      await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
      await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
      await user.keyboard("{Control>}2{/Control}");

      expect(screen.getByRole("region", { name: "Sync workspace" })).toBeInTheDocument();
      expect(screen.queryByRole("dialog", { name: "GitHub Connection Wizard" })).not.toBeInTheDocument();
    });

    it("postponing closes the wizard, persists the choice, and calls no Git/connect native command", async () => {
      const user = userEvent.setup();
      mocks.open.mockResolvedValue("/tmp/notes");
      mockOpenedWorkspace("sin-remoto");

      render(<App />);
      await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
      await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));

      expect(await screen.findByRole("dialog", { name: "GitHub Connection Wizard" })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      await waitFor(() => expect(screen.queryByRole("dialog", { name: "GitHub Connection Wizard" })).not.toBeInTheDocument());
      expect(mocks.invoke).toHaveBeenCalledWith("native_command", {
        request: {
          domain: "workspace",
          action: "postpone-github-wizard",
          payload: { workspacePath: "/tmp/notes" },
        },
      });
      expect(mocks.invoke).not.toHaveBeenCalledWith(
        "native_command",
        expect.objectContaining({ request: expect.objectContaining({ action: "connect-github-remote" }) }),
      );
      expect(mocks.invoke).not.toHaveBeenCalledWith(
        "native_command",
        expect.objectContaining({ request: expect.objectContaining({ domain: "git", action: "sync" }) }),
      );
    });

    it("still lets the user open the wizard manually after postponing", async () => {
      const user = userEvent.setup();
      mocks.open.mockResolvedValue("/tmp/notes");
      mockOpenedWorkspace("sin-remoto");

      render(<App />);
      await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
      await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));

      expect(await screen.findByRole("dialog", { name: "GitHub Connection Wizard" })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(screen.queryByRole("dialog", { name: "GitHub Connection Wizard" })).not.toBeInTheDocument());

      await user.keyboard("{Control>}2{/Control}");
      await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(within(screen.getByRole("dialog", { name: "Configuración" })).getByRole("tab", { name: "Sync" }));
    await user.click(screen.getByRole("button", { name: "Conectar remoto GitHub" }));

      expect(screen.getByRole("dialog", { name: "GitHub Connection Wizard" })).toBeInTheDocument();
    });
  });

  it("opens a Global Search result as the active Raw Markdown note", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      if (request.domain === "workspace" && request.action === "open") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "open",
          data: {
            name: "notes",
            path: "/tmp/notes",
            tree: [
              {
                name: "daily",
                path: "daily",
                kind: "folder",
                children: [{ name: "today.md", path: "daily/today.md", kind: "note", children: [] }],
              },
            ],
            metadata: { lastNotePath: null, openFolderPaths: [], treeMode: "free" },
          },
          error: null,
        });
      }

      if (request.domain === "filesystem" && request.action === "global-search") {
        return Promise.resolve({
          ok: true,
          domain: "filesystem",
          action: "global-search",
          data: {
            results: [
              {
                notePath: "daily/today.md",
                lineNumber: 2,
                lineText: "needle line",
                matchStart: 0,
                matchEnd: 6,
              },
            ],
          },
          error: null,
        });
      }

      if (request.domain === "filesystem" && request.action === "read-note") {
        return Promise.resolve({
          ok: true,
          domain: "filesystem",
          action: "read-note",
          data: { content: "# Today\nneedle line" },
          error: null,
        });
      }

      if (request.domain === "workspace" && request.action === "remember-note") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "remember-note",
          data: { lastNotePath: request.payload.notePath },
          error: null,
        });
      }

      if (request.domain === "workspace" && request.action === "remember-tree-state") {
        return Promise.resolve({ ok: true, domain: "workspace", action: request.action, data: null, error: null });
      }

      if (request.domain === "git" && request.action === "status") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "status",
          data: { isRepository: false, hasRemote: false, syncStatus: "sin-git" },
          error: null,
        });
      }

      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    expect(screen.queryByRole("button", { name: "today.md" })).not.toBeInTheDocument();
    await user.keyboard("{Control>}{Shift>}f{/Shift}{/Control}");
    await user.type(screen.getByRole("searchbox", { name: "Global Search" }), "needle");
    await user.click(await screen.findByRole("button", { name: "daily/today.md line 2: needle line" }));

    const breadcrumb = screen.getByRole("navigation", { name: "Note location" });
    expect(within(breadcrumb).getByText("daily")).toBeInTheDocument();
    expect(within(breadcrumb).getByText("today.md")).toBeInTheDocument();
    expect(screen.getByTestId("markdown-editor").textContent).toContain("needle line");
    expect(screen.getByRole("button", { name: "today.md" })).toBeInTheDocument();
  });

  it("remembers recent Workspaces and restores the last opened note when available", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      if (request.domain === "workspace" && request.action === "open") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "open",
          data: {
            name: "notes",
            path: "/tmp/notes",
            tree: [
              {
                name: "daily",
                path: "daily",
                kind: "folder",
                children: [{ name: "today.md", path: "daily/today.md", kind: "note", children: [] }],
              },
            ],
            metadata: { lastNotePath: "daily/today.md", openFolderPaths: [], treeMode: "free" },
          },
          error: null,
        });
      }

      if (request.domain === "filesystem" && request.action === "read-note") {
        return Promise.resolve({
          ok: true,
          domain: "filesystem",
          action: "read-note",
          data: { content: "# Today\n\nRestored body" },
          error: null,
        });
      }

      if (request.domain === "workspace" && request.action === "remember-note") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "remember-note",
          data: { lastNotePath: request.payload.notePath },
          error: null,
        });
      }

      if (request.domain === "workspace" && request.action === "remember-tree-state") {
        return Promise.resolve({ ok: true, domain: "workspace", action: request.action, data: null, error: null });
      }

      if (request.domain === "git" && request.action === "status") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "status",
          data: { isRepository: true, hasRemote: true, syncStatus: "sincronizado" },
          error: null,
        });
      }

      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));

    expect(mocks.invoke).toHaveBeenCalledWith("native_command", {
      request: {
        domain: "workspace",
        action: "open",
        payload: { workspacePath: "/tmp/notes" },
      },
    });
    expect(mocks.invoke).toHaveBeenCalledWith("native_command", {
      request: {
        domain: "workspace",
        action: "remember-note",
        payload: { workspacePath: "/tmp/notes", notePath: "daily/today.md" },
      },
    });
    await waitFor(() => expect(screen.getByTestId("markdown-editor").textContent).toContain("Restored body"));
    expect(screen.getByRole("button", { name: "today.md" })).toBeInTheDocument();
    expect(screen.getByText("/tmp/notes")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("simpler.recentWorkspaces") ?? "[]")).toEqual([
      { name: "notes", path: "/tmp/notes" },
    ]);
  });

  it("restores and persists Tree Mode while Command Palette navigation and Focus Active Note reveal the right branch", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      if (request.domain === "workspace" && request.action === "open") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "open",
          data: {
            name: "notes",
            path: "/tmp/notes",
            tree: [
              {
                name: "daily",
                path: "daily",
                kind: "folder",
                children: [{ name: "today.md", path: "daily/today.md", kind: "note", children: [] }],
              },
              {
                name: "ideas",
                path: "ideas",
                kind: "folder",
                children: [{ name: "plan.md", path: "ideas/plan.md", kind: "note", children: [] }],
              },
            ],
            metadata: { lastNotePath: null, openFolderPaths: ["daily"], treeMode: "accordion" },
          },
          error: null,
        });
      }
      if (request.domain === "filesystem" && request.action === "read-note") {
        return Promise.resolve({
          ok: true,
          domain: "filesystem",
          action: "read-note",
          data: { content: "# Plan" },
          error: null,
        });
      }
      if (request.domain === "workspace" && ["remember-note", "remember-tree-state"].includes(request.action)) {
        return Promise.resolve({ ok: true, domain: "workspace", action: request.action, data: null, error: null });
      }
      if (request.domain === "git" && request.action === "status") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "status",
          data: { isRepository: true, hasRemote: true, syncStatus: "sincronizado" },
          error: null,
        });
      }
      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));

    expect(screen.getByRole("button", { name: "Workspace Tree Mode" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "today.md" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "plan.md" })).not.toBeInTheDocument();

    const treeWritesBeforeDirectSelection = mocks.invoke.mock.calls.filter(
      ([, { request }]) => request.domain === "workspace" && request.action === "remember-tree-state",
    ).length;
    await user.click(screen.getByRole("button", { name: "today.md" }));
    expect(
      mocks.invoke.mock.calls.filter(
        ([, { request }]) => request.domain === "workspace" && request.action === "remember-tree-state",
      ),
    ).toHaveLength(treeWritesBeforeDirectSelection);

    await user.click(screen.getByRole("button", { name: "Workspace Tree Mode" }));
    await user.keyboard("{Control>}k{/Control}");
    await user.click(
      within(screen.getByRole("dialog", { name: "Command Palette" })).getByRole("button", {
        name: "Open note: ideas/plan.md",
      }),
    );

    expect(await screen.findByRole("button", { name: "plan.md" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "today.md" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Focus Active Note" }));
    expect(screen.queryByRole("button", { name: "today.md" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "plan.md" })).toBeInTheDocument();

    expect(mocks.invoke).toHaveBeenCalledWith("native_command", {
      request: {
        domain: "workspace",
        action: "remember-tree-state",
        payload: { workspacePath: "/tmp/notes", openFolderPaths: ["daily"], treeMode: "free" },
      },
    });
  });

  it("shows the Sync status returned by the Git service after opening a Workspace", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      if (request.domain === "workspace" && request.action === "open") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "open",
          data: {
            name: "notes",
            path: "/tmp/notes",
            tree: [],
            metadata: { lastNotePath: null },
          },
          error: null,
        });
      }

      if (request.domain === "git" && request.action === "status") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "status",
          data: { isRepository: true, hasRemote: false, syncStatus: "sin-remoto" },
          error: null,
        });
      }

      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));

    expect(screen.getByRole("contentinfo", { name: "Workspace status" })).toHaveTextContent("Sin remoto");
  });

  it("keeps an opened Workspace usable when Git status fails", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      if (request.domain === "workspace" && request.action === "open") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "open",
          data: {
            name: "notes",
            path: "/tmp/notes",
            tree: [{ name: "today.md", path: "today.md", kind: "note", children: [] }],
            metadata: { lastNotePath: null },
          },
          error: null,
        });
      }

      if (request.domain === "git" && request.action === "status") {
        return Promise.resolve({
          ok: false,
          domain: "git",
          action: "status",
          data: null,
          error: "failed to run git",
        });
      }

      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));

    expect(screen.getByRole("contentinfo", { name: "Workspace status" })).toHaveTextContent("Error");
    expect(screen.getByRole("button", { name: "today.md" })).toBeInTheDocument();
    expect(screen.getByText("failed to run git")).toBeInTheDocument();
  });

  it("marks a synced Workspace as having local changes after Local Save", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      if (request.domain === "workspace" && request.action === "open") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "open",
          data: {
            name: "notes",
            path: "/tmp/notes",
            tree: [{ name: "today.md", path: "today.md", kind: "note", children: [] }],
            metadata: { lastNotePath: "today.md" },
          },
          error: null,
        });
      }

      if (request.domain === "filesystem" && request.action === "read-note") {
        return Promise.resolve({
          ok: true,
          domain: "filesystem",
          action: "read-note",
          data: { content: "# Today" },
          error: null,
        });
      }

      if (request.domain === "filesystem" && request.action === "write-note") {
        return Promise.resolve({
          ok: true,
          domain: "filesystem",
          action: "write-note",
          data: { content: request.payload.content },
          error: null,
        });
      }

      if (request.domain === "workspace" && request.action === "remember-note") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "remember-note",
          data: { lastNotePath: request.payload.notePath },
          error: null,
        });
      }

      if (request.domain === "git" && request.action === "status") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "status",
          data: { isRepository: true, hasRemote: true, syncStatus: "sincronizado" },
          error: null,
        });
      }

      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    const editable = await findEditableElement();
    editable.focus();
    await user.type(editable, "{End}\nChanged");

    // Local Save is debounced, so the status only flips once the pending
    // edit actually flushes to disk — not synchronously on each keystroke.
    await waitFor(
      () =>
        expect(screen.getByRole("contentinfo", { name: "Workspace status" })).toHaveTextContent("Cambios locales"),
      { timeout: 2000 },
    );
  });

  it("does not touch the sidebar's Workspace Tree DOM while typing, only once a save flushes", async () => {
    const user = userEvent.setup();
    const writes: string[] = [];
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      if (request.domain === "workspace" && request.action === "open") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "open",
          data: {
            name: "notes",
            path: "/tmp/notes",
            tree: [{ name: "today.md", path: "today.md", kind: "note", children: [] }],
            metadata: { lastNotePath: "today.md" },
          },
          error: null,
        });
      }

      if (request.domain === "filesystem" && request.action === "read-note") {
        return Promise.resolve({
          ok: true,
          domain: "filesystem",
          action: "read-note",
          data: { content: "# Today" },
          error: null,
        });
      }

      if (request.domain === "filesystem" && request.action === "write-note") {
        writes.push(request.payload.content);
        return Promise.resolve({
          ok: true,
          domain: "filesystem",
          action: "write-note",
          data: { content: request.payload.content },
          error: null,
        });
      }

      if (request.domain === "workspace" && request.action === "remember-note") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "remember-note",
          data: { lastNotePath: request.payload.notePath },
          error: null,
        });
      }

      if (request.domain === "git" && request.action === "status") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "status",
          data: { isRepository: true, hasRemote: true, syncStatus: "sincronizado" },
          error: null,
        });
      }

      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    const editable = await findEditableElement();

    const sidebarTree = document.querySelector(".note-tree");
    expect(sidebarTree).not.toBeNull();
    const mutations: MutationRecord[] = [];
    const observer = new MutationObserver((records) => mutations.push(...records));
    observer.observe(sidebarTree!, { childList: true, subtree: true, attributes: true, characterData: true });

    editable.focus();
    await user.type(editable, "{End}\nMore typing here");

    // The debounced write hasn't flushed yet, so AppState (and therefore the
    // sidebar) must not have been touched — only the editor's own DOM changed.
    expect(mutations).toHaveLength(0);
    expect(screen.getByTestId("markdown-editor").textContent).toContain("More typing here");
    expect(writes).toHaveLength(0);

    // Once the debounce flushes, the content reaches disk (and AppState).
    await waitFor(() => expect(writes).toEqual(["# Today\nMore typing here"]));

    observer.disconnect();
  });

  it("previews note history and restores a version through Local Save before normal Sync", async () => {
    const user = userEvent.setup();
    const writes: string[] = [];
    let syncCalls = 0;
    let resolveStalePreview!: (response: unknown) => void;
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      if (request.domain === "workspace" && request.action === "open") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "open",
          data: {
            name: "notes",
            path: "/tmp/notes",
            tree: [{ name: "today.md", path: "today.md", kind: "note", children: [] }],
            metadata: { lastNotePath: "today.md", githubWizardPostponed: true },
          },
          error: null,
        });
      }
      if (request.domain === "filesystem" && request.action === "read-note") {
        return Promise.resolve({ ok: true, domain: "filesystem", action: "read-note", data: { content: "# Current" }, error: null });
      }
      if (request.domain === "workspace" && request.action === "remember-note") {
        return Promise.resolve({ ok: true, domain: "workspace", action: "remember-note", data: { lastNotePath: "today.md" }, error: null });
      }
      if (request.domain === "git" && request.action === "status") {
        return Promise.resolve({ ok: true, domain: "git", action: "status", data: { isRepository: true, hasRemote: true, syncStatus: "sincronizado", conflictedFiles: [] }, error: null });
      }
      if (request.domain === "git" && request.action === "github-remote") {
        return Promise.resolve({ ok: true, domain: "git", action: "github-remote", data: { remote: { name: "origin", url: "git@example.test:notes.git" } }, error: null });
      }
      if (request.domain === "git" && request.action === "advanced-status") {
        return Promise.resolve({ ok: true, domain: "git", action: "advanced-status", data: { isRepository: true, repository: "git@example.test:notes.git", branch: "main", latestCommit: null, pendingChanges: [] }, error: null });
      }
      if (request.domain === "git" && request.action === "note-history") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "note-history",
          data: [
            { commitId: "abc123", date: "2026-08-07T09:30:00Z", summary: "Earlier words" },
            { commitId: "def456", date: "2026-08-06T09:30:00Z", summary: "Chosen words" },
          ],
          error: null,
        });
      }
      if (request.domain === "git" && request.action === "note-content-at-commit") {
        if (request.payload.commitId === "abc123") {
          return new Promise((resolve) => {
            resolveStalePreview = resolve;
          });
        }
        return Promise.resolve({ ok: true, domain: "git", action: "note-content-at-commit", data: { content: "# Chosen\n\nChosen words." }, error: null });
      }
      if (request.domain === "filesystem" && request.action === "write-note") {
        writes.push(request.payload.content);
        return Promise.resolve({ ok: true, domain: "filesystem", action: "write-note", data: { content: request.payload.content }, error: null });
      }
      if (request.domain === "git" && request.action === "sync") {
        syncCalls += 1;
        return Promise.resolve({ ok: true, domain: "git", action: "sync", data: { status: "synced", message: "Sync completed", conflictedFiles: [] }, error: null });
      }
      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));

    await user.click(await screen.findByRole("button", { name: "Open note history" }));
    await user.click(await screen.findByRole("button", { name: /Earlier words/ }));
    await user.click(await screen.findByRole("button", { name: /Chosen words/ }));
    expect(await screen.findByRole("region", { name: "Historical note preview" })).toHaveTextContent("Chosen words.");
    resolveStalePreview({ ok: true, domain: "git", action: "note-content-at-commit", data: { content: "# Stale\n\nWrong words." }, error: null });
    await waitFor(() => expect(screen.getByRole("region", { name: "Historical note preview" })).not.toHaveTextContent("Wrong words."));

    await user.click(screen.getByRole("button", { name: "Restore this version" }));
    await waitFor(() => expect(writes).toEqual(["# Chosen\n\nChosen words."]));
    expect(screen.getByTestId("markdown-editor").textContent).toContain("Chosen words.");

    await user.keyboard("{Control>}2{/Control}");
    await user.click(screen.getByRole("button", { name: "Sync now" }));
    await waitFor(() => expect(syncCalls).toBe(1));
  });

  it("lets the user manually Sync an opened Git-backed Workspace", async () => {
    const user = userEvent.setup();
    let gitStatusCalls = 0;
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      if (request.domain === "workspace" && request.action === "open") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "open",
          data: {
            name: "notes",
            path: "/tmp/notes",
            tree: [],
            metadata: { lastNotePath: null },
          },
          error: null,
        });
      }

      if (request.domain === "git" && request.action === "status") {
        gitStatusCalls += 1;
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "status",
          data: {
            isRepository: true,
            hasRemote: true,
            syncStatus: gitStatusCalls === 1 ? "cambios-locales" : "sincronizado",
          },
          error: null,
        });
      }

      if (request.domain === "git" && request.action === "sync") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "sync",
          data: { status: "synced", message: "Sync completed" },
          error: null,
        });
      }

      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    await user.keyboard("{Control>}2{/Control}");
    await user.click(screen.getByRole("button", { name: "Sync now" }));

    expect(mocks.invoke).toHaveBeenCalledWith("native_command", {
      request: {
        domain: "git",
        action: "sync",
        payload: { workspacePath: "/tmp/notes" },
      },
    });
    expect(screen.getByRole("contentinfo", { name: "Workspace status" })).toHaveTextContent("Sincronizado");
  });

  it("keeps Local Save content visible when manual Sync fails", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      if (request.domain === "workspace" && request.action === "open") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "open",
          data: {
            name: "notes",
            path: "/tmp/notes",
            tree: [{ name: "today.md", path: "today.md", kind: "note", children: [] }],
            metadata: { lastNotePath: "today.md" },
          },
          error: null,
        });
      }

      if (request.domain === "filesystem" && request.action === "read-note") {
        return Promise.resolve({
          ok: true,
          domain: "filesystem",
          action: "read-note",
          data: { content: "# Today\n\nUnsynced body" },
          error: null,
        });
      }

      if (request.domain === "workspace" && request.action === "remember-note") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "remember-note",
          data: { lastNotePath: request.payload.notePath },
          error: null,
        });
      }

      if (request.domain === "git" && request.action === "status") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "status",
          data: { isRepository: true, hasRemote: true, syncStatus: "cambios-locales" },
          error: null,
        });
      }

      if (request.domain === "git" && request.action === "sync") {
        return Promise.resolve({
          ok: false,
          domain: "git",
          action: "sync",
          data: null,
          error: "failed to pull remote changes before Sync push",
        });
      }

      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    await user.keyboard("{Control>}2{/Control}");
    await user.click(screen.getByRole("button", { name: "Sync now" }));
    await user.keyboard("{Control>}1{/Control}");

    expect(screen.getByText("failed to pull remote changes before Sync push")).toBeInTheDocument();
    expect(screen.getByTestId("markdown-editor").textContent).toContain("Unsynced body");
  });

  it("pauses Sync for a conflict and submits the user's local resolution", async () => {
    const user = userEvent.setup();
    let gitStatusCalls = 0;
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      if (request.domain === "workspace" && request.action === "open") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "open",
          data: { name: "notes", path: "/tmp/notes", tree: [{ name: "today.md", path: "today.md", kind: "note", children: [] }], metadata: { lastNotePath: null } },
          error: null,
        });
      }
      if (request.domain === "git" && request.action === "status") {
        gitStatusCalls += 1;
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "status",
          data: { isRepository: true, hasRemote: true, syncStatus: gitStatusCalls === 1 ? "cambios-locales" : "sincronizado", conflictedFiles: [] },
          error: null,
        });
      }
      if (request.domain === "git" && request.action === "sync") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "sync",
          data: { status: "conflict", message: "Sync needs conflict resolution", conflictedFiles: ["today.md"] },
          error: null,
        });
      }
      if (request.domain === "git" && request.action === "resolve-conflict") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "resolve-conflict",
          data: { status: "synced", message: "Sync completed", conflictedFiles: [] },
          error: null,
        });
      }
      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    await user.keyboard("{Control>}2{/Control}");
    await user.click(screen.getByRole("button", { name: "Sync now" }));

    expect(await screen.findByRole("region", { name: "Sync conflicts" })).toHaveTextContent("today.md");
    expect(screen.getByRole("button", { name: "Sync now" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Use local" }));
    expect(mocks.invoke).toHaveBeenCalledWith("native_command", {
      request: {
        domain: "git",
        action: "resolve-conflict",
        payload: { workspacePath: "/tmp/notes", notePath: "today.md", resolution: "local" },
      },
    });
    expect(await screen.findByRole("contentinfo", { name: "Workspace status" })).toHaveTextContent("Sincronizado");
  });

  it("resolves shared order in mixed Sync conflicts without treating metadata as a note", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue("/tmp/notes");
    const metadataPath = ".simpler/workspace.json";
    let unresolved = [metadataPath, "today.md"];
    let orderResolved = false;
    let invalidChoice = true;
    let finishInvalidChoice!: () => void;
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      const reply = (data: unknown) => Promise.resolve({ ok: true, domain: request.domain, action: request.action, data, error: null });
      if (request.domain === "workspace" && request.action === "open") return reply({ name: "notes", path: "/tmp/notes", tree: (orderResolved ? ["other.md", "today.md"] : ["today.md", "other.md"]).map((path) => ({ name: path, path, kind: "note", children: [] })), metadata: { lastNotePath: "today.md", githubWizardPostponed: true } });
      if (request.action === "status") return reply({ isRepository: true, hasRemote: true, syncStatus: unresolved.length ? "conflicto" : "sincronizado", conflictedFiles: unresolved });
      if (request.action === "github-remote") return reply({ remote: null });
      if (request.action === "read-note") {
        if (request.payload.notePath === metadataPath) throw new Error("Shared metadata must never open as a note");
        return reply({ content: "Current writing" });
      }
      if (request.action === "write-note") return reply({ content: request.payload.content });
      if (request.action === "resolve-conflict") {
        if (request.payload.notePath === metadataPath && invalidChoice) {
          invalidChoice = false;
          return new Promise((resolve) => { finishInvalidChoice = () => resolve({ ok: false, domain: "git", action: "resolve-conflict", data: null, error: "Invalid shared Workspace metadata" }); });
        }
        if (request.payload.notePath === metadataPath) orderResolved = true;
        unresolved = unresolved.filter((path) => path !== request.payload.notePath);
        return reply({ status: unresolved.length ? "conflict" : "synced", message: "Sync resolution", conflictedFiles: unresolved });
      }
      return reply({});
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    const editable = await findEditableElement();
    editable.focus();
    await user.keyboard("X");
    const currentText = editable.textContent;
    await user.click(screen.getByRole("button", { name: "Resolver conflictos" }));
    const region = screen.getByRole("region", { name: "Sync conflicts" });
    const metadataRow = within(region).getAllByRole("listitem").find((row) => row.textContent?.includes(metadataPath))!;
    expect(within(metadataRow).queryByRole("button", { name: "Edit manually" })).not.toBeInTheDocument();
    expect(within(metadataRow).queryByRole("button", { name: "Mark manual resolution" })).not.toBeInTheDocument();
    expect(within(region).getAllByRole("button", { name: "Edit manually" })).toHaveLength(1);
    await user.click(within(metadataRow).getByRole("button", { name: "Use local" }));
    await user.click(within(metadataRow).getByRole("button", { name: "Use remote" }));
    expect(mocks.invoke.mock.calls.filter(([, { request }]) => request.action === "resolve-conflict")).toHaveLength(1);
    finishInvalidChoice();
    expect(await screen.findByText("Invalid shared Workspace metadata")).toBeInTheDocument();
    await user.click(within(metadataRow).getByRole("button", { name: "Use remote" }));
    await waitFor(() => expect(within(region).queryByText(metadataPath)).not.toBeInTheDocument());
    expect(screen.queryByText("Invalid shared Workspace metadata")).not.toBeInTheDocument();
    await user.keyboard("{Control>}1{/Control}");
    const other = screen.getByRole("button", { name: "other.md" });
    const today = screen.getByRole("button", { name: "today.md" });
    expect(other.compareDocumentPosition(today) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("markdown-editor").querySelector("[contenteditable=true]")).toBe(editable);
    expect(editable.textContent).toBe(currentText);
    await user.click(screen.getByRole("button", { name: "Resolver conflictos" }));
    await user.click(screen.getByRole("button", { name: "Use local" }));
    await waitFor(() => expect(screen.getByRole("contentinfo", { name: "Workspace status" })).toHaveTextContent("Sincronizado"));
    expect(mocks.invoke.mock.calls.filter(([, { request }]) => request.action === "read-note").map(([, { request }]) => request.payload.notePath)).toEqual(["today.md"]);
  });

  it("automatically Syncs on Workspace open when Git reports protected local changes", async () => {
    const user = userEvent.setup();
    let gitStatusCalls = 0;
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      if (request.domain === "workspace" && request.action === "open") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "open",
          data: {
            name: "notes",
            path: "/tmp/notes",
            tree: [],
            metadata: { lastNotePath: null },
          },
          error: null,
        });
      }

      if (request.domain === "git" && request.action === "status") {
        gitStatusCalls += 1;
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "status",
          data: {
            isRepository: true,
            hasRemote: true,
            syncStatus: gitStatusCalls === 1 ? "cambios-locales" : "sincronizado",
          },
          error: null,
        });
      }

      if (request.domain === "git" && request.action === "sync") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "sync",
          data: { status: "synced", message: "Sync completed" },
          error: null,
        });
      }

      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));

    await waitFor(() => {
      expect(mocks.invoke).toHaveBeenCalledWith("native_command", {
        request: {
          domain: "git",
          action: "sync",
          payload: { workspacePath: "/tmp/notes" },
        },
      });
    });
    expect(screen.getByRole("contentinfo", { name: "Workspace status" })).toHaveTextContent("Sincronizado");
  });

  it("preserves writing after automatic Sync failure", async () => {
    const user = userEvent.setup();
    let gitStatusCalls = 0;
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      if (request.domain === "workspace" && request.action === "open") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "open",
          data: {
            name: "notes",
            path: "/tmp/notes",
            tree: [{ name: "today.md", path: "today.md", kind: "note", children: [] }],
            metadata: { lastNotePath: "today.md" },
          },
          error: null,
        });
      }

      if (request.domain === "filesystem" && request.action === "read-note") {
        return Promise.resolve({
          ok: true,
          domain: "filesystem",
          action: "read-note",
          data: { content: "# Today\n\nStill local" },
          error: null,
        });
      }

      if (request.domain === "workspace" && request.action === "remember-note") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "remember-note",
          data: { lastNotePath: request.payload.notePath },
          error: null,
        });
      }

      if (request.domain === "git" && request.action === "status") {
        gitStatusCalls += 1;
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "status",
          data: {
            isRepository: true,
            hasRemote: true,
            syncStatus: gitStatusCalls === 1 ? "cambios-locales" : "sincronizado",
          },
          error: null,
        });
      }

      if (request.domain === "git" && request.action === "sync") {
        return Promise.resolve({
          ok: false,
          domain: "git",
          action: "sync",
          data: null,
          error: "remote is unavailable",
        });
      }

      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));

    expect(await screen.findByText("remote is unavailable")).toBeInTheDocument();
    expect(screen.getByTestId("markdown-editor").textContent).toContain("Still local");
  });

  it("attempts Sync on app close after Local Save leaves pending changes", async () => {
    const user = userEvent.setup();
    let gitSyncCalls = 0;
    mocks.open.mockResolvedValue("/tmp/notes");
    mocks.invoke.mockImplementation((_command: string, { request }) => {
      if (request.domain === "workspace" && request.action === "open") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "open",
          data: {
            name: "notes",
            path: "/tmp/notes",
            tree: [{ name: "today.md", path: "today.md", kind: "note", children: [] }],
            metadata: { lastNotePath: "today.md" },
          },
          error: null,
        });
      }

      if (request.domain === "filesystem" && request.action === "read-note") {
        return Promise.resolve({
          ok: true,
          domain: "filesystem",
          action: "read-note",
          data: { content: "# Today" },
          error: null,
        });
      }

      if (request.domain === "filesystem" && request.action === "write-note") {
        return Promise.resolve({
          ok: true,
          domain: "filesystem",
          action: "write-note",
          data: { content: request.payload.content },
          error: null,
        });
      }

      if (request.domain === "workspace" && request.action === "remember-note") {
        return Promise.resolve({
          ok: true,
          domain: "workspace",
          action: "remember-note",
          data: { lastNotePath: request.payload.notePath },
          error: null,
        });
      }

      if (request.domain === "git" && request.action === "status") {
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "status",
          data: { isRepository: true, hasRemote: true, syncStatus: "sincronizado" },
          error: null,
        });
      }

      if (request.domain === "git" && request.action === "sync") {
        gitSyncCalls += 1;
        return Promise.resolve({
          ok: true,
          domain: "git",
          action: "sync",
          data: { status: "synced", message: "Sync completed" },
          error: null,
        });
      }

      throw new Error(`unexpected native command ${request.domain}/${request.action}`);
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
    const editable = await findEditableElement();
    editable.focus();
    await user.type(editable, "{End}\nClose me");
    window.dispatchEvent(new Event("beforeunload"));

    await waitFor(() => expect(gitSyncCalls).toBe(1));
  });

  it("closes the window promptly on a normal close request", async () => {
    mocks.invoke.mockImplementation(() => {
      throw new Error("no native calls expected");
    });

    render(<App />);
    await waitFor(() => expect(mocks.closeRequestedHandler).not.toBeNull());

    const preventDefault = vi.fn();
    await mocks.closeRequestedHandler!({ preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(mocks.destroy).toHaveBeenCalledTimes(1);
  });

  it("still lets the close proceed when the app-closing sync throws", async () => {
    mocks.appClosingOverride = () => {
      throw new Error("boom");
    };
    mocks.invoke.mockImplementation(() => {
      throw new Error("no native calls expected");
    });

    render(<App />);
    await waitFor(() => expect(mocks.closeRequestedHandler).not.toBeNull());

    await expect(mocks.closeRequestedHandler!({ preventDefault: vi.fn() })).resolves.toBeUndefined();
    expect(mocks.destroy).toHaveBeenCalledTimes(1);
  });

  it("force-closes within the bounded fallback when app-closing sync never settles", async () => {
    vi.useFakeTimers();
    mocks.appClosingOverride = () => new Promise<void>(() => undefined) as unknown as void;
    mocks.invoke.mockImplementation(() => {
      throw new Error("no native calls expected");
    });

    render(<App />);
    await vi.waitFor(() => expect(mocks.closeRequestedHandler).not.toBeNull());

    const closed = mocks.closeRequestedHandler!({ preventDefault: vi.fn() });
    let settled = false;
    void (closed as Promise<unknown>).then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(2999);
    expect(settled).toBe(false);
    expect(mocks.destroy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(50);
    expect(settled).toBe(true);
    expect(mocks.destroy).toHaveBeenCalledTimes(1);
  });

  describe("Close Sync Prompt", () => {
    function mockWorkspaceWithGitSync(syncHandler: () => { status: string; message: string; conflictedFiles?: string[] } | null) {
      mocks.invoke.mockImplementation((_command: string, { request }) => {
        if (request.domain === "workspace" && request.action === "open") {
          return Promise.resolve({
            ok: true,
            domain: "workspace",
            action: "open",
            data: {
              name: "notes",
              path: "/tmp/notes",
              tree: [{ name: "today.md", path: "today.md", kind: "note", children: [] }],
              metadata: { lastNotePath: "today.md" },
            },
            error: null,
          });
        }
        if (request.domain === "filesystem" && request.action === "read-note") {
          return Promise.resolve({ ok: true, domain: "filesystem", action: "read-note", data: { content: "# Today" }, error: null });
        }
        if (request.domain === "filesystem" && request.action === "write-note") {
          return Promise.resolve({
            ok: true,
            domain: "filesystem",
            action: "write-note",
            data: { content: request.payload.content },
            error: null,
          });
        }
        if (request.domain === "workspace" && request.action === "remember-note") {
          return Promise.resolve({
            ok: true,
            domain: "workspace",
            action: "remember-note",
            data: { lastNotePath: request.payload.notePath },
            error: null,
          });
        }
        if (request.domain === "git" && request.action === "status") {
          return Promise.resolve({
            ok: true,
            domain: "git",
            action: "status",
            data: { isRepository: true, hasRemote: true, syncStatus: "sincronizado", conflictedFiles: [] },
            error: null,
          });
        }
        if (request.domain === "git" && request.action === "sync") {
          const result = syncHandler();
          if (result === null) {
            return Promise.resolve({ ok: false, domain: "git", action: "sync", data: null, error: "No se pudo sincronizar el Workspace" });
          }
          return Promise.resolve({ ok: true, domain: "git", action: "sync", data: result, error: null });
        }
        throw new Error(`unexpected native command ${request.domain}/${request.action}`);
      });
    }

    async function openWorkspaceAndMakePending(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
      await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));
      const editable = await findEditableElement();
      editable.focus();
      await user.type(editable, "{End}\nmore text");
    }

    it("closes immediately with no prompt when there are no pending changes", async () => {
      const user = userEvent.setup();
      mocks.open.mockResolvedValue("/tmp/notes");
      mockWorkspaceWithGitSync(() => ({ status: "synced", message: "Sync completed", conflictedFiles: [] }));

      render(<App />);
      await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
      await user.click(screen.getByRole("menuitem", { name: "Abrir carpeta" }));

      await user.click(screen.getByRole("button", { name: "Cerrar" }));

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      await waitFor(() => expect(mocks.destroy).toHaveBeenCalledTimes(1));
    });

    it("shows the prompt with pending changes; waiting for sync closes automatically on success", async () => {
      const user = userEvent.setup();
      mocks.open.mockResolvedValue("/tmp/notes");
      mockWorkspaceWithGitSync(() => ({ status: "synced", message: "Sync completed", conflictedFiles: [] }));

      render(<App />);
      await openWorkspaceAndMakePending(user);

      await user.click(screen.getByRole("button", { name: "Cerrar" }));
      expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Esperar a Sync" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Esperar a Sync" }));

      await waitFor(() => expect(mocks.destroy).toHaveBeenCalledTimes(1));
    });

    it("closing without sync closes immediately without waiting for Sync", async () => {
      const user = userEvent.setup();
      mocks.open.mockResolvedValue("/tmp/notes");
      let syncCalled = false;
      mockWorkspaceWithGitSync(() => {
        syncCalled = true;
        return { status: "synced", message: "Sync completed", conflictedFiles: [] };
      });

      render(<App />);
      await openWorkspaceAndMakePending(user);

      await user.click(screen.getByRole("button", { name: "Cerrar" }));
      await user.click(screen.getByRole("button", { name: "Cerrar sin sincronizar" }));

      await waitFor(() => expect(mocks.destroy).toHaveBeenCalledTimes(1));
      expect(syncCalled).toBe(false);
    });

    it("does not re-run Sync when close() re-triggers the onCloseRequested listener after 'close without sync'", async () => {
      // In real Tauri, currentWindow.close() re-emits close-requested, which the
      // app's own onCloseRequested listener (App.tsx) intercepts and would call
      // appClosing() from — this must be suppressed once the Close Sync Prompt
      // has already decided to skip Sync, or the user's choice is silently overridden.
      const user = userEvent.setup();
      mocks.open.mockResolvedValue("/tmp/notes");
      let syncCalled = false;
      mockWorkspaceWithGitSync(() => {
        syncCalled = true;
        return { status: "synced", message: "Sync completed", conflictedFiles: [] };
      });

      render(<App />);
      await openWorkspaceAndMakePending(user);
      await waitFor(() => expect(mocks.closeRequestedHandler).not.toBeNull());

      await user.click(screen.getByRole("button", { name: "Cerrar" }));
      await user.click(screen.getByRole("button", { name: "Cerrar sin sincronizar" }));

      // Simulate close() re-emitting close-requested, as it does in real Tauri.
      await mocks.closeRequestedHandler!({ preventDefault: vi.fn() });

      expect(syncCalled).toBe(false);
    });

    it("does not force-close via the bounded fallback timers while the prompt is open and undecided", async () => {
      const user = userEvent.setup();
      mocks.open.mockResolvedValue("/tmp/notes");
      mockWorkspaceWithGitSync(() => ({ status: "synced", message: "Sync completed", conflictedFiles: [] }));

      render(<App />);
      await openWorkspaceAndMakePending(user);

      await user.click(screen.getByRole("button", { name: "Cerrar" }));
      expect(await screen.findByRole("alertdialog")).toBeInTheDocument();

      vi.useFakeTimers();
      await vi.advanceTimersByTimeAsync(10_000);
      expect(mocks.destroy).not.toHaveBeenCalled();
    });

    it("shows the error state and offers close-without-sync when Sync fails while waiting", async () => {
      const user = userEvent.setup();
      mocks.open.mockResolvedValue("/tmp/notes");
      mockWorkspaceWithGitSync(() => null);

      render(<App />);
      await openWorkspaceAndMakePending(user);

      await user.click(screen.getByRole("button", { name: "Cerrar" }));
      await user.click(screen.getByRole("button", { name: "Esperar a Sync" }));

      const dialog = await screen.findByRole("alertdialog");
      expect(within(dialog).getByText("No se pudo sincronizar el Workspace")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Esperar a Sync" })).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cerrar sin sincronizar" }));
      await waitFor(() => expect(mocks.destroy).toHaveBeenCalledTimes(1));
    });

    it("shows the error state when Sync conflicts while waiting", async () => {
      const user = userEvent.setup();
      mocks.open.mockResolvedValue("/tmp/notes");
      mockWorkspaceWithGitSync(() => ({ status: "conflict", message: "Sync needs conflict resolution", conflictedFiles: ["today.md"] }));

      render(<App />);
      await openWorkspaceAndMakePending(user);

      await user.click(screen.getByRole("button", { name: "Cerrar" }));
      await user.click(screen.getByRole("button", { name: "Esperar a Sync" }));

      expect(await screen.findByText("Sync needs conflict resolution")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Esperar a Sync" })).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cerrar sin sincronizar" }));
      await waitFor(() => expect(mocks.destroy).toHaveBeenCalledTimes(1));
    });

    it("skips the wait option and shows the error state immediately when a conflict is already paused", async () => {
      const user = userEvent.setup();
      mocks.open.mockResolvedValue("/tmp/notes");
      mockWorkspaceWithGitSync(() => ({ status: "conflict", message: "Sync needs conflict resolution", conflictedFiles: ["today.md"] }));

      render(<App />);
      await openWorkspaceAndMakePending(user);

      await user.keyboard("{Control>}2{/Control}");
      await user.click(screen.getByRole("button", { name: "Sync now" }));
      expect(await screen.findByRole("region", { name: "Sync conflicts" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cerrar" }));

      expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Esperar a Sync" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cerrar sin sincronizar" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cerrar sin sincronizar" }));
      await waitFor(() => expect(mocks.destroy).toHaveBeenCalledTimes(1));
    });
  });

  it("persists the selected Appearance Mode and restores it on the next launch", async () => {
    const user = userEvent.setup();

    const { unmount } = render(<App />);

    expect(document.querySelector(".app-shell")).toHaveAttribute("data-mode", "light");

    await user.click(screen.getByRole("button", { name: "Switch to dark appearance" }));

    expect(document.querySelector(".app-shell")).toHaveAttribute("data-mode", "dark");
    expect(localStorage.getItem("simpler.themeMode")).toBe("dark");

    unmount();
    render(<App />);

    expect(document.querySelector(".app-shell")).toHaveAttribute("data-mode", "dark");
  });

  it("persists the selected Theme and restores it on the next launch", async () => {
    const user = userEvent.setup();

    const { unmount } = render(<App />);

    expect(document.querySelector(".app-shell")).toHaveAttribute("data-theme", "warm");

    await user.keyboard("{Control>}k{/Control}");
    await user.click(screen.getByRole("button", { name: "Switch Theme to Mate Cerámico" }));

    expect(document.querySelector(".app-shell")).toHaveAttribute("data-theme", "ceramic");
    expect(localStorage.getItem("simpler.theme")).toBe("ceramic");

    unmount();
    render(<App />);

    expect(document.querySelector(".app-shell")).toHaveAttribute("data-theme", "ceramic");
  });

  it("changes UI zoom via keyboard shortcuts, clamps it, and persists it across restarts", async () => {
    const { unmount } = render(<App />);

    const appShell = () => document.querySelector(".app-shell") as HTMLElement;
    expect(appShell().style.getPropertyValue("--ui-zoom")).toBe("1");

    fireEvent.keyDown(window, { key: "=", ctrlKey: true });
    expect(appShell().style.getPropertyValue("--ui-zoom")).toBe("1.1");
    expect(localStorage.getItem("simpler.uiZoom")).toBe("110");

    fireEvent.keyDown(window, { key: "=", ctrlKey: true });
    expect(appShell().style.getPropertyValue("--ui-zoom")).toBe("1.2");

    fireEvent.keyDown(window, { key: "0", ctrlKey: true });
    expect(appShell().style.getPropertyValue("--ui-zoom")).toBe("1");
    expect(localStorage.getItem("simpler.uiZoom")).toBe("100");

    for (let i = 0; i < 5; i += 1) {
      fireEvent.keyDown(window, { key: "-", ctrlKey: true });
    }
    expect(appShell().style.getPropertyValue("--ui-zoom")).toBe("0.7");
    expect(localStorage.getItem("simpler.uiZoom")).toBe("70");

    // Below the floor, another decrease is a no-op (the "zoom-out" command becomes unavailable).
    fireEvent.keyDown(window, { key: "-", ctrlKey: true });
    expect(appShell().style.getPropertyValue("--ui-zoom")).toBe("0.7");

    unmount();
    render(<App />);

    expect(appShell().style.getPropertyValue("--ui-zoom")).toBe("0.7");
  });

  it("changes editor font size via Ctrl/Cmd+Shift shortcuts, independently of UI zoom, and persists it across restarts", async () => {
    const { unmount } = render(<App />);

    const appShell = () => document.querySelector(".app-shell") as HTMLElement;
    expect(appShell().style.getPropertyValue("--ui-zoom")).toBe("1");
    expect(localStorage.getItem("simpler.editorFontSize")).toBeNull();

    fireEvent.keyDown(window, { key: "=", ctrlKey: true, shiftKey: true });
    expect(localStorage.getItem("simpler.editorFontSize")).toBe("14.5");
    // Editor font size shortcuts must not touch the independent UI zoom state.
    expect(localStorage.getItem("simpler.uiZoom")).toBeNull();
    expect(appShell().style.getPropertyValue("--ui-zoom")).toBe("1");

    fireEvent.keyDown(window, { key: "0", ctrlKey: true, shiftKey: true });
    expect(localStorage.getItem("simpler.editorFontSize")).toBe("13.5");

    for (let i = 0; i < 8; i += 1) {
      fireEvent.keyDown(window, { key: "-", ctrlKey: true, shiftKey: true });
    }
    expect(localStorage.getItem("simpler.editorFontSize")).toBe("11");

    // Below the floor, another decrease is a no-op (the command becomes unavailable).
    fireEvent.keyDown(window, { key: "-", ctrlKey: true, shiftKey: true });
    expect(localStorage.getItem("simpler.editorFontSize")).toBe("11");

    unmount();
    render(<App />);

    expect(localStorage.getItem("simpler.editorFontSize")).toBe("11");
  });

  describe("macOS window lifecycle", () => {
    function mockMacOSPlatform() {
      mocks.invoke.mockImplementation((_command: string, { request }) => {
        if (request.domain === "update" && request.action === "get-platform") {
          return Promise.resolve({ ok: true, domain: "update", action: "get-platform", data: { platform: "macos" }, error: null });
        }
        return Promise.resolve({ ok: false, domain: request.domain, action: request.action, data: null, error: "not mocked" });
      });
    }

    it("hides rather than syncs-and-destroys when the red traffic light triggers close-requested with no prior decision", async () => {
      mockMacOSPlatform();
      const { container } = render(<App />);

      await waitFor(() => expect(mocks.closeRequestedHandler).not.toBeNull());
      // getPlatform() resolving is a separate async effect from onCloseRequested
      // registration — wait for it to actually land before relying on it below,
      // or this races (and did, once, in CI).
      await waitFor(() => expect(container.querySelector(".titlebar")).toHaveAttribute("data-platform", "macos"));

      await mocks.closeRequestedHandler!({ preventDefault: vi.fn() });

      await waitFor(() => expect(mocks.hide).toHaveBeenCalledTimes(1));
      expect(mocks.destroy).not.toHaveBeenCalled();
    });

    it("routes the Cmd+Q menu event through the same close pipeline as the in-app close button", async () => {
      mockMacOSPlatform();
      render(<App />);

      await waitFor(() => expect(mocks.quitRequestedHandler).not.toBeNull());

      mocks.quitRequestedHandler!();

      // No pending changes and no open Workspace: closeWindow() goes straight
      // to performClose(), which destroys rather than hides.
      await waitFor(() => expect(mocks.destroy).toHaveBeenCalledTimes(1));
      expect(mocks.hide).not.toHaveBeenCalled();
    });
  });
});
