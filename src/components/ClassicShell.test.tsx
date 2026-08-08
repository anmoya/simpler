import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ClassicShell } from "./ClassicShell";
import type { ClassicShellProps } from "./ClassicShell";

const noop = () => undefined;
const defaultProps: ClassicShellProps = {
  activeRoute: "workspace",
  workspaceTree: [],
  openFolderPaths: new Set(),
  treeMode: "free",
  statusLabel: "Sin workspace",
  workspaceError: null,
  workspaceName: "Abrir carpeta",
  workspacePath: null,
  recentWorkspaces: [],
  activeNotePath: null,
  activeFolderPath: "",
  noteContent: "",
  themeMode: "light",
  editorError: null,
  canManageWorkspace: false,
  onOpenWorkspace: noop,
  onCloneGitHubRepository: noop,
  onOpenRecentWorkspace: noop,
  onRouteChange: noop,
  onThemeChange: noop,
  onSelectFolder: noop,
  onSelectNote: noop,
  onToggleFolder: noop,
  onTreeModeChange: noop,
  onFocusActiveNote: noop,
  onNavigateToNote: noop,
  onNoteChange: noop,
  onCreateFolder: noop,
  onCreateNote: noop,
  onRenameSelection: noop,
  onMoveActiveNote: noop,
  onDeleteSelection: noop,
  onMoveItem: noop,
  onSyncWorkspace: noop,
  githubRemote: null,
  advancedGit: null,
  syncEvents: [],
  onRefreshAdvancedGit: noop,
  onConnectGitHubRemote: noop,
  conflictedFiles: [],
  onResolveConflict: noop,
  onEditConflictManually: noop,
  fileSearchJump: null,
  globalSearchQuery: "",
  globalSearchResults: [],
  onGlobalSearchChange: noop,
  onSelectGlobalSearchResult: noop,
  githubAuth: { state: "disconnected", message: null },
  onBeginGitHubDeviceFlow: async () => undefined,
  onCheckGitHubDeviceFlow: noop,
  onStoreGitHubPersonalAccessToken: noop,
  onDisconnectGitHub: noop,
  dialog: null,
  onDialogSubmit: noop,
  onDialogCancel: noop,
  githubConnectionWizard: {
    isOpen: false,
    urlInput: "",
    validationError: null,
    isSubmitting: false,
    submitError: null,
  },
  isWorkspaceGitBacked: true,
  onGitHubWizardUrlChange: noop,
  onGitHubWizardSubmit: noop,
  onGitHubWizardCancel: noop,
  isWindowMaximized: false,
  onMinimizeWindow: noop,
  onToggleMaximizeWindow: noop,
  onCloseWindow: noop,
  closeSyncPrompt: null,
  onWaitForSyncBeforeClose: noop,
  onCloseWithoutSync: noop,
  updateNotice: null,
  onInstallAndRestart: noop,
};

function renderShell(props: Partial<ClassicShellProps> = {}) {
  return render(<ClassicShell {...defaultProps} {...props} />);
}

describe("ClassicShell", () => {
  it("reserves space for the sidebar, editor, and status area", () => {
    renderShell({
      workspaceTree: [{ name: "today.md", path: "daily/today.md", kind: "note", children: [] }],
    });

    expect(screen.getByRole("complementary", { name: "Workspace tree" })).toBeInTheDocument();
    expect(screen.getByRole("main", { name: "Markdown editor area" })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo", { name: "Workspace status" })).toBeInTheDocument();
    expect(screen.getByText("Sin workspace")).toBeInTheDocument();
  });

  it("shows no update notice when updateNotice is null", () => {
    renderShell({ updateNotice: null });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows a non-blocking downloading notice with no action", () => {
    renderShell({ updateNotice: { kind: "downloading" } });

    expect(screen.getByRole("status")).toHaveTextContent("Downloading update");
    expect(screen.queryByRole("button", { name: /install/i })).not.toBeInTheDocument();
  });

  it("shows Install & Restart for an AppImage update that's ready, and triggers it on click", async () => {
    const onInstallAndRestart = vi.fn();
    renderShell({ updateNotice: { kind: "update-ready", version: "1.2.0" }, onInstallAndRestart });

    expect(screen.getByRole("status")).toHaveTextContent("v1.2.0");
    await userEvent.click(screen.getByRole("button", { name: /install.*restart/i }));

    expect(onInstallAndRestart).toHaveBeenCalledTimes(1);
  });

  it("shows a View Release link (not an install action) for a packaged install update", () => {
    renderShell({ updateNotice: { kind: "update-available", version: "1.2.0" } });

    expect(screen.getByRole("status")).toHaveTextContent("v1.2.0");
    expect(screen.getByRole("link", { name: "View Release" })).toHaveAttribute(
      "href",
      "https://github.com/anmoya/simpler/releases/latest",
    );
    expect(screen.queryByRole("button", { name: /install/i })).not.toBeInTheDocument();
  });

  it("toggles the Sync and Settings sidebar panels through typed route ids", async () => {
    const onRouteChange = vi.fn();

    renderShell({ onRouteChange });

    await userEvent.click(screen.getByRole("tab", { name: "Sync" }));

    expect(onRouteChange).toHaveBeenCalledWith("sync");
  });

  it("toggles a sidebar panel back to the note tree when its tab is active", async () => {
    const onRouteChange = vi.fn();

    renderShell({ activeRoute: "sync", onRouteChange });

    await userEvent.click(screen.getByRole("tab", { name: "Sync" }));

    expect(onRouteChange).toHaveBeenCalledWith("workspace");
  });

  it("offers Device Flow first and keeps PAT storage in advanced settings", async () => {
    const onBeginGitHubDeviceFlow = vi.fn().mockResolvedValue({
      userCode: "ABCD-EFGH",
      verificationUri: "https://github.com/login/device",
      expiresIn: 900,
      interval: 5,
    });

    renderShell({ activeRoute: "settings", onBeginGitHubDeviceFlow });

    await userEvent.click(screen.getByRole("button", { name: "Connect with GitHub" }));

    expect(onBeginGitHubDeviceFlow).toHaveBeenCalledOnce();
    expect(screen.getByText("ABCD-EFGH")).toBeInTheDocument();
    expect(screen.getByText("Advanced: Personal Access Token")).toBeInTheDocument();
  });

  it("shows manual Sync controls in the Sync route", async () => {
    const onSyncWorkspace = vi.fn();

    renderShell({
      activeRoute: "sync",
      canManageWorkspace: true,
      workspaceName: "notes",
      statusLabel: "Cambios locales",
      onSyncWorkspace,
    });

    expect(screen.getByRole("region", { name: "Sync workspace" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Sync now" }));

    expect(onSyncWorkspace).toHaveBeenCalledOnce();
  });

  it("disables manual Sync while Sync is already running", () => {
    renderShell({
      activeRoute: "sync",
      canManageWorkspace: true,
      workspaceName: "notes",
      statusLabel: "Sincronizando",
    });

    expect(screen.getByRole("button", { name: "Sync now" })).toBeDisabled();
  });

  it("lists conflicted Markdown notes and exposes each resolution choice", async () => {
    const onResolveConflict = vi.fn();
    const onEditConflictManually = vi.fn();

    renderShell({
      activeRoute: "sync",
      canManageWorkspace: true,
      statusLabel: "Necesita resolver conflicto",
      conflictedFiles: ["daily/today.md"],
      onResolveConflict,
      onEditConflictManually,
    });

    expect(screen.getByRole("region", { name: "Conflicted Markdown files" })).toHaveTextContent("daily/today.md");
    await userEvent.click(screen.getByRole("button", { name: "Use local" }));
    await userEvent.click(screen.getByRole("button", { name: "Use remote" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit manually" }));
    await userEvent.click(screen.getByRole("button", { name: "Mark manual resolution" }));

    expect(onResolveConflict).toHaveBeenNthCalledWith(1, "daily/today.md", "local");
    expect(onResolveConflict).toHaveBeenNthCalledWith(2, "daily/today.md", "remote");
    expect(onEditConflictManually).toHaveBeenCalledWith("daily/today.md");
    expect(onResolveConflict).toHaveBeenNthCalledWith(3, "daily/today.md", "manual");
  });

  it("renders folders and Markdown notes from the Workspace Tree", () => {
    renderShell({
      workspaceTree: [
        {
          name: "daily",
          path: "daily",
          kind: "folder",
          children: [{ name: "today.md", path: "daily/today.md", kind: "note", children: [] }],
        },
        { name: "ideas.md", path: "ideas.md", kind: "note", children: [] },
      ],
      openFolderPaths: new Set(["daily"]),
      statusLabel: "Cambios locales",
      workspaceName: "notes",
    });

    expect(screen.getAllByText("daily")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /today.md/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ideas.md/ })).toBeInTheDocument();
  });

  it("hides and shows a folder's children through its expand toggle", async () => {
    const onToggleFolder = vi.fn();
    const workspaceTree = [
      {
        name: "daily",
        path: "daily",
        kind: "folder" as const,
        children: [{ name: "today.md", path: "daily/today.md", kind: "note" as const, children: [] }],
      },
    ];
    const { rerender } = renderShell({ workspaceTree, openFolderPaths: new Set(["daily"]), onToggleFolder });

    await userEvent.click(screen.getByRole("button", { name: "Collapse daily" }));
    expect(onToggleFolder).toHaveBeenCalledWith("daily");

    rerender(<ClassicShell {...defaultProps} workspaceTree={workspaceTree} openFolderPaths={new Set()} />);
    expect(screen.queryByRole("button", { name: /today.md/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand daily" })).toBeInTheDocument();
  });

  it("switches Tree Mode and focuses the active note from the sidebar header", async () => {
    const onTreeModeChange = vi.fn();
    const onFocusActiveNote = vi.fn();
    renderShell({
      canManageWorkspace: true,
      activeNotePath: "daily/today.md",
      treeMode: "free",
      onTreeModeChange,
      onFocusActiveNote,
    });

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Workspace Tree Mode" }), "accordion");
    await userEvent.click(screen.getByRole("button", { name: "Focus Active Note" }));

    expect(onTreeModeChange).toHaveBeenCalledWith("accordion");
    expect(onFocusActiveNote).toHaveBeenCalledOnce();
  });

  it("offers Workspace notes as Command Palette jumps", async () => {
    const user = userEvent.setup();
    const onNavigateToNote = vi.fn();
    renderShell({
      canManageWorkspace: true,
      workspaceTree: [
        {
          name: "daily",
          path: "daily",
          kind: "folder",
          children: [{ name: "today.md", path: "daily/today.md", kind: "note", children: [] }],
        },
      ],
      onNavigateToNote,
    });

    await user.keyboard("{Control>}k{/Control}");
    await user.click(
      within(screen.getByRole("dialog", { name: "Command Palette" })).getByRole("button", {
        name: "Open note: daily/today.md",
      }),
    );

    expect(onNavigateToNote).toHaveBeenCalledWith("daily/today.md");
  });

  it("opens the Workspace menu and calls the open Workspace handler", async () => {
    const onOpenWorkspace = vi.fn();

    renderShell({ onOpenWorkspace });

    await userEvent.click(screen.getByRole("button", { name: "Abrir carpeta" }));
    await userEvent.click(screen.getByRole("button", { name: "Abrir otra carpeta..." }));

    expect(onOpenWorkspace).toHaveBeenCalledOnce();
  });

  it("selects a note from the Workspace Tree", async () => {
    const onSelectNote = vi.fn();

    renderShell({
      workspaceTree: [{ name: "today.md", path: "daily/today.md", kind: "note", children: [] }],
      statusLabel: "Workspace abierto",
      workspaceName: "notes",
      onSelectNote,
    });

    await userEvent.click(screen.getByRole("button", { name: /today.md/ }));

    expect(onSelectNote).toHaveBeenCalledWith("daily/today.md");
  });

  it("selects a folder as the target for new notes and folders", async () => {
    const onSelectFolder = vi.fn();

    renderShell({
      workspaceTree: [{ name: "daily", path: "daily", kind: "folder", children: [] }],
      workspaceName: "notes",
      activeFolderPath: "daily",
      onSelectFolder,
    });

    const folder = screen.getByRole("button", { name: "daily" });
    expect(folder).not.toHaveClass("note-tree__folder--active");

    await userEvent.click(folder);

    expect(onSelectFolder).toHaveBeenCalledWith("daily");
  });

  it("exposes sidebar management actions only when they can run", async () => {
    const onCreateFolder = vi.fn();
    const onCreateNote = vi.fn();
    const onRenameSelection = vi.fn();
    const onMoveActiveNote = vi.fn();

    renderShell({
      canManageWorkspace: true,
      activeNotePath: "daily/today.md",
      activeFolderPath: "daily",
      onCreateFolder,
      onCreateNote,
      onRenameSelection,
      onMoveActiveNote,
    });

    await userEvent.click(screen.getByRole("button", { name: "New folder" }));
    await userEvent.click(screen.getByRole("button", { name: "New note" }));
    await userEvent.click(screen.getByRole("button", { name: "Rename" }));
    await userEvent.click(screen.getByRole("button", { name: "Move" }));

    expect(onCreateFolder).toHaveBeenCalledOnce();
    expect(onCreateNote).toHaveBeenCalledOnce();
    expect(onRenameSelection).toHaveBeenCalledOnce();
    expect(onMoveActiveNote).toHaveBeenCalledOnce();
  });

  it("disables management actions when no Workspace is open", () => {
    renderShell();

    expect(screen.getByRole("button", { name: "New folder" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "New note" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rename" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move" })).toBeDisabled();
  });

  it("shows the raw Markdown editor with the active note's content", () => {
    renderShell({
      workspaceTree: [{ name: "today.md", path: "daily/today.md", kind: "note", children: [] }],
      statusLabel: "Workspace abierto",
      workspaceName: "notes",
      activeNotePath: "daily/today.md",
      activeFolderPath: "daily",
      noteContent: "# Today\n\nBody",
    });

    expect(screen.getByTestId("markdown-editor")).toBeInTheDocument();
    const breadcrumb = screen.getByRole("navigation", { name: "Note location" });
    expect(within(breadcrumb).getByText("daily")).toBeInTheDocument();
    expect(within(breadcrumb).getByText("today.md")).toBeInTheDocument();
  });

  it("shows a breadcrumb with the active folder and note file name", () => {
    renderShell({
      workspaceTree: [{ name: "today.md", path: "daily/today.md", kind: "note", children: [] }],
      workspaceName: "notes",
      activeNotePath: "daily/today.md",
      activeFolderPath: "daily",
      noteContent: "# Morning pages\n\nBody",
    });

    const breadcrumb = screen.getByRole("navigation", { name: "Note location" });
    expect(within(breadcrumb).getByText("daily")).toBeInTheDocument();
    expect(within(breadcrumb).getByText("today.md")).toBeInTheDocument();
  });

  it("omits the folder segment for notes at the Workspace root", () => {
    renderShell({
      workspaceTree: [{ name: "today.md", path: "today.md", kind: "note", children: [] }],
      workspaceName: "notes",
      activeNotePath: "today.md",
      activeFolderPath: "",
    });

    const breadcrumb = screen.getByRole("navigation", { name: "Note location" });
    expect(within(breadcrumb).getByText("today.md")).toBeInTheDocument();
    expect(within(breadcrumb).queryByText("/")).not.toBeInTheDocument();
  });

  it("switches between light and dark themes", async () => {
    const onThemeChange = vi.fn();

    const { rerender, container } = renderShell({ onThemeChange });

    expect(container.firstChild).toHaveAttribute("data-mode", "light");
    expect(container.firstChild).toHaveAttribute("data-theme", "warm");

    await userEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));

    expect(onThemeChange).toHaveBeenCalledWith("dark");

    rerender(<ClassicShell {...defaultProps} themeMode="dark" onThemeChange={onThemeChange} />);

    expect(container.firstChild).toHaveAttribute("data-mode", "dark");
    await userEvent.click(screen.getByRole("button", { name: "Switch to light theme" }));

    expect(onThemeChange).toHaveBeenCalledWith("light");
  });

  it("opens the Command Palette with Ctrl+K and runs available commands", async () => {
    const user = userEvent.setup();
    const onCreateNote = vi.fn();
    const onRouteChange = vi.fn();
    const onThemeChange = vi.fn();

    renderShell({
      canManageWorkspace: true,
      activeNotePath: "daily/today.md",
      activeFolderPath: "daily",
      onCreateNote,
      onRouteChange,
      onThemeChange,
    });

    await user.keyboard("{Control>}k{/Control}");

    const palette = screen.getByRole("dialog", { name: "Command Palette" });
    expect(palette).toBeInTheDocument();
    expect(within(palette).getByRole("button", { name: "New note" })).toBeEnabled();

    await user.click(within(palette).getByRole("button", { name: "New note" }));

    expect(onCreateNote).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog", { name: "Command Palette" })).not.toBeInTheDocument();

    await user.keyboard("{Control>}k{/Control}");
    await user.click(within(screen.getByRole("dialog", { name: "Command Palette" })).getByRole("button", { name: "Sync" }));

    expect(onRouteChange).toHaveBeenCalledWith("sync");

    await user.keyboard("{Control>}k{/Control}");
    await user.click(
      within(screen.getByRole("dialog", { name: "Command Palette" })).getByRole("button", {
        name: "Switch to dark theme",
      }),
    );

    expect(onThemeChange).toHaveBeenCalledWith("dark");
  });

  it("opens contextual Command Help from the palette and a keyboard shortcut", async () => {
    const user = userEvent.setup();

    renderShell({
      canManageWorkspace: true,
      activeFolderPath: "daily",
      activeNotePath: null,
    });

    await user.keyboard("{Control>}k{/Control}");
    await user.click(
      within(screen.getByRole("dialog", { name: "Command Palette" })).getByRole("button", {
        name: "Command Help",
      }),
    );

    const help = screen.getByRole("dialog", { name: "Command Help" });
    expect(help).toBeInTheDocument();
    expect(within(help).getByText("New note")).toBeInTheDocument();
    expect(within(help).queryByText("Move note")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close Command Help" }));
    await user.keyboard("{Control>}/{/Control}");

    expect(screen.getByRole("dialog", { name: "Command Help" })).toBeInTheDocument();
  });

  it("keeps Command Help visible while the user writes", async () => {
    const user = userEvent.setup();
    const onNoteChange = vi.fn();

    renderShell({
      canManageWorkspace: true,
      activeFolderPath: "daily",
      activeNotePath: "daily/today.md",
      noteContent: "# Today",
      onNoteChange,
    });

    await user.keyboard("{Control>}/{/Control}");
    expect(screen.getByRole("dialog", { name: "Command Help" })).toBeInTheDocument();

    await user.click(screen.getByTestId("markdown-editor"));
    await user.keyboard(" writing");

    expect(screen.getByRole("dialog", { name: "Command Help" })).toBeInTheDocument();
  });

  it("handles empty Workspace and no selected note states distinctly", () => {
    const { rerender } = renderShell({
      canManageWorkspace: true,
      workspaceName: "empty-notes",
      statusLabel: "Workspace abierto",
      workspaceTree: [],
    });

    expect(screen.getByText("This Workspace has no Markdown notes yet.")).toBeInTheDocument();
    expect(screen.getByText("Create a note to start writing in empty-notes.")).toBeInTheDocument();

    rerender(
      <ClassicShell
        {...defaultProps}
        canManageWorkspace
        workspaceName="notes"
        statusLabel="Workspace abierto"
        workspaceTree={[{ name: "today.md", path: "today.md", kind: "note", children: [] }]}
      />,
    );

    expect(screen.getByText("Select a Markdown note to start writing.")).toBeInTheDocument();
  });

  it("shows missing file and file error editor states clearly", () => {
    const { rerender } = renderShell({
      canManageWorkspace: true,
      workspaceName: "notes",
      activeNotePath: "daily/missing.md",
      activeFolderPath: "daily",
      editorError: { kind: "missing-note", message: "The note file is missing." },
    });

    expect(screen.getByText("The selected note is missing.")).toBeInTheDocument();
    expect(screen.getAllByText("daily/missing.md").length).toBeGreaterThan(0);

    rerender(
      <ClassicShell
        {...defaultProps}
        canManageWorkspace
        workspaceName="notes"
        activeNotePath="daily/private.md"
        activeFolderPath="daily"
        editorError={{ kind: "file-error", message: "failed to read note: permission denied" }}
      />,
    );

    expect(screen.getByText("The note could not be opened.")).toBeInTheDocument();
    expect(screen.getByText("failed to read note: permission denied")).toBeInTheDocument();
  });

  it("keeps deeply nested folders and long note names reachable", () => {
    renderShell({
      workspaceName: "notes",
      openFolderPaths: new Set(["research", "research/archive"]),
      workspaceTree: [
        {
          name: "research",
          path: "research",
          kind: "folder",
          children: [
            {
              name: "archive",
              path: "research/archive",
              kind: "folder",
              children: [
                {
                  name: "very-long-note-name-that-should-not-break-the-sidebar-layout.md",
                  path: "research/archive/very-long-note-name-that-should-not-break-the-sidebar-layout.md",
                  kind: "note",
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(
      screen.getByRole("button", { name: /very-long-note-name-that-should-not-break-the-sidebar-layout.md/ }),
    ).toHaveAttribute(
      "title",
      "research/archive/very-long-note-name-that-should-not-break-the-sidebar-layout.md",
    );
  });

  it("searches within the active note and jumps between matches", async () => {
    const user = userEvent.setup();

    renderShell({
      activeNotePath: "daily/today.md",
      activeFolderPath: "daily",
      noteContent: "alpha\nneedle one\nbeta\nneedle two",
      canManageWorkspace: true,
    });

    await user.type(screen.getByRole("searchbox", { name: "Search current note" }), "needle");

    expect(screen.getByText("1 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next current-note match" }));

    expect(screen.getByText("2 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous current-note match" }));

    expect(screen.getByText("1 of 2")).toBeInTheDocument();
  });

  it("shows Global Search results with file and line references", async () => {
    const user = userEvent.setup();
    const onGlobalSearchChange = vi.fn();
    const onSelectGlobalSearchResult = vi.fn();

    renderShell({
      canManageWorkspace: true,
      globalSearchQuery: "needle",
      globalSearchResults: [
        {
          notePath: "daily/today.md",
          lineNumber: 3,
          lineText: "needle one",
          matchStart: 0,
          matchEnd: 6,
        },
      ],
      onGlobalSearchChange,
      onSelectGlobalSearchResult,
    });

    await user.type(screen.getByRole("searchbox", { name: "Global Search" }), "s");

    expect(onGlobalSearchChange).toHaveBeenLastCalledWith("needles");
    expect(screen.getByRole("button", { name: "daily/today.md line 3: needle one" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "daily/today.md line 3: needle one" }));

    expect(onSelectGlobalSearchResult).toHaveBeenCalledWith({
      notePath: "daily/today.md",
      lineNumber: 3,
      lineText: "needle one",
      matchStart: 0,
      matchEnd: 6,
    });
  });
});
