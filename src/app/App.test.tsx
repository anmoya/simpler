import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  open: vi.fn(),
  destroy: vi.fn(async () => undefined),
  closeRequestedHandler: null as null | ((event: { preventDefault: () => void }) => unknown),
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
  }),
}));

describe("App", () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
    mocks.open.mockReset();
    mocks.destroy.mockClear();
    mocks.closeRequestedHandler = null;
    mocks.appClosingOverride = null;
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps Abrir carpeta separate while cloning a GitHub repository opens the cloned Workspace", async () => {
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
    await user.click(screen.getByRole("button", { name: "Clonar desde GitHub" }));

    expect(mocks.invoke).toHaveBeenCalledWith("native_command", {
      request: {
        domain: "git",
        action: "clone-github-repository",
        payload: { repositoryUrl: "https://github.com/simpler/notes.git", destinationPath: "/tmp/cloned-notes" },
      },
    });
    await waitFor(() => expect(screen.getByText("/tmp/cloned-notes")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "Sync" }));
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
    await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));
    await user.click(screen.getByRole("tab", { name: "Sync" }));
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
    await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));
    await user.click(screen.getByRole("tab", { name: "Sync" }));
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
    await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));
    await user.click(screen.getByRole("tab", { name: "Sync" }));
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
    await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));
    await user.click(screen.getByRole("tab", { name: "Sync" }));
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
      await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));

      expect(await screen.findByRole("dialog", { name: "GitHub Connection Wizard" })).toBeInTheDocument();
    });

    it("auto-opens the wizard when Workspace status is sin-remoto", async () => {
      const user = userEvent.setup();
      mocks.open.mockResolvedValue("/tmp/notes");
      mockOpenedWorkspace("sin-remoto");

      render(<App />);
      await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
      await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));

      expect(await screen.findByRole("dialog", { name: "GitHub Connection Wizard" })).toBeInTheDocument();
    });

    it("never auto-opens the wizard when a remote is already configured", async () => {
      const user = userEvent.setup();
      mocks.open.mockResolvedValue("/tmp/notes");
      mockOpenedWorkspace("sincronizado");

      render(<App />);
      await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
      await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));
      await user.click(screen.getByRole("tab", { name: "Sync" }));

      await waitFor(() => expect(screen.getByText("https://github.com/simpler/notes.git")).toBeInTheDocument());
      expect(screen.queryByRole("dialog", { name: "GitHub Connection Wizard" })).not.toBeInTheDocument();
    });

    it("does not auto-open the wizard when it was previously postponed for this Workspace", async () => {
      const user = userEvent.setup();
      mocks.open.mockResolvedValue("/tmp/notes");
      mockOpenedWorkspace("sin-remoto", true);

      render(<App />);
      await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
      await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));
      await user.click(screen.getByRole("tab", { name: "Sync" }));

      await waitFor(() => expect(screen.getByRole("button", { name: "Conectar remoto GitHub" })).toBeInTheDocument());
      expect(screen.queryByRole("dialog", { name: "GitHub Connection Wizard" })).not.toBeInTheDocument();
    });

    it("postponing closes the wizard, persists the choice, and calls no Git/connect native command", async () => {
      const user = userEvent.setup();
      mocks.open.mockResolvedValue("/tmp/notes");
      mockOpenedWorkspace("sin-remoto");

      render(<App />);
      await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
      await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));

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
      await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));

      expect(await screen.findByRole("dialog", { name: "GitHub Connection Wizard" })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(screen.queryByRole("dialog", { name: "GitHub Connection Wizard" })).not.toBeInTheDocument());

      await user.click(screen.getByRole("tab", { name: "Sync" }));
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
            tree: [{ name: "today.md", path: "daily/today.md", kind: "note", children: [] }],
            metadata: { lastNotePath: null },
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
    await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));
    await user.type(screen.getByRole("searchbox", { name: "Global Search" }), "needle");
    await user.click(screen.getByRole("button", { name: "daily/today.md line 2: needle line" }));

    const breadcrumb = screen.getByRole("navigation", { name: "Note location" });
    expect(within(breadcrumb).getByText("daily")).toBeInTheDocument();
    expect(within(breadcrumb).getByText("today.md")).toBeInTheDocument();
    expect(screen.getByTestId("markdown-editor").textContent).toContain("needle line");
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
            tree: [{ name: "today.md", path: "daily/today.md", kind: "note", children: [] }],
            metadata: { lastNotePath: "daily/today.md" },
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
    await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));

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
    expect(screen.getByTestId("markdown-editor").textContent).toContain("Restored body");
    expect(screen.getByText("/tmp/notes")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("simpler.recentWorkspaces") ?? "[]")).toEqual([
      { name: "notes", path: "/tmp/notes" },
    ]);
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
    await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));

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
    await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));

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
    await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));
    const editable = screen.getByTestId("markdown-editor").querySelector("[contenteditable=true]") as HTMLElement;
    editable.focus();
    await user.type(editable, "{End}\nChanged");

    expect(screen.getByRole("contentinfo", { name: "Workspace status" })).toHaveTextContent("Cambios locales");
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
    await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));
    await user.click(screen.getByRole("tab", { name: "Sync" }));
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
    await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));
    await user.click(screen.getByRole("tab", { name: "Sync" }));
    await user.click(screen.getByRole("button", { name: "Sync now" }));
    await user.click(screen.getByRole("tab", { name: "Sync" }));

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
    await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));
    await user.click(screen.getByRole("tab", { name: "Sync" }));
    await user.click(screen.getByRole("button", { name: "Sync now" }));

    expect(await screen.findByRole("region", { name: "Conflicted Markdown files" })).toHaveTextContent("today.md");
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
    await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));

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
    await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));

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
    await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));
    const editable = screen.getByTestId("markdown-editor").querySelector("[contenteditable=true]") as HTMLElement;
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
      await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));
      const editable = screen.getByTestId("markdown-editor").querySelector("[contenteditable=true]") as HTMLElement;
      editable.focus();
      await user.type(editable, "{End}\nmore text");
    }

    it("closes immediately with no prompt when there are no pending changes", async () => {
      const user = userEvent.setup();
      mocks.open.mockResolvedValue("/tmp/notes");
      mockWorkspaceWithGitSync(() => ({ status: "synced", message: "Sync completed", conflictedFiles: [] }));

      render(<App />);
      await user.click(screen.getByRole("button", { name: "Abrir carpeta" }));
      await user.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));

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

      await user.click(screen.getByRole("tab", { name: "Sync" }));
      await user.click(screen.getByRole("button", { name: "Sync now" }));
      expect(await screen.findByRole("region", { name: "Conflicted Markdown files" })).toBeInTheDocument();

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

    await user.click(screen.getByRole("button", { name: "Switch to dark theme" }));

    expect(document.querySelector(".app-shell")).toHaveAttribute("data-mode", "dark");
    expect(localStorage.getItem("simpler.themeMode")).toBe("dark");

    unmount();
    render(<App />);

    expect(document.querySelector(".app-shell")).toHaveAttribute("data-mode", "dark");
  });
});
