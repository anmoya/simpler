import { useEffect, useMemo, useState, type DragEvent, type MouseEvent } from "react";
import type { AppRoute } from "../app/routes";
import type { EditorError, FileSearchJump, GitHubConnectionWizardState, SyncEvent, ThemeMode, WorkspaceTreeItem } from "../app/appState";
import type { AdvancedGitStatus, ConflictResolution, DeviceFlowInstructions, GitHubAuthStatus, GitHubRemote, GlobalSearchResult } from "../native/commands";
import type { DialogRequest } from "../app/appState";
import { MarkdownEditor } from "./MarkdownEditor";
import { Icon } from "./icons";
import { GitHubConnectionWizard } from "./GitHubConnectionWizard";

type CommandAction = () => void;

interface ShellCommand {
  id: string;
  label: string;
  shortcut: string;
  available: boolean;
  run: CommandAction;
}

export interface ClassicShellProps {
  activeRoute: AppRoute;
  workspaceTree: WorkspaceTreeItem[];
  statusLabel: string;
  workspaceError: string | null;
  workspaceName: string;
  workspacePath: string | null;
  recentWorkspaces: Array<{ name: string; path: string }>;
  activeNotePath: string | null;
  activeFolderPath: string;
  noteContent: string;
  themeMode: ThemeMode;
  editorError: EditorError | null;
  canManageWorkspace: boolean;
  onOpenWorkspace: () => void;
  onCloneGitHubRepository: () => void;
  onOpenRecentWorkspace: (workspacePath: string) => void;
  onRouteChange: (route: AppRoute) => void;
  onThemeChange: (themeMode: ThemeMode) => void;
  onSelectFolder: (folderPath: string) => void;
  onSelectNote: (notePath: string) => void;
  onNoteChange: (content: string) => void;
  onCreateFolder: () => void;
  onCreateNote: () => void;
  onRenameSelection: () => void;
  onMoveActiveNote: () => void;
  onDeleteSelection: () => void;
  onMoveItem: (itemPath: string, targetFolderPath: string) => void;
  onSyncWorkspace: () => void;
  githubRemote: GitHubRemote | null;
  advancedGit: AdvancedGitStatus | null;
  syncEvents: SyncEvent[];
  onRefreshAdvancedGit: () => void;
  onConnectGitHubRemote: () => void;
  conflictedFiles: string[];
  onResolveConflict: (notePath: string, resolution: ConflictResolution) => void;
  onEditConflictManually: (notePath: string) => void;
  fileSearchJump: FileSearchJump | null;
  globalSearchQuery: string;
  globalSearchResults: GlobalSearchResult[];
  onGlobalSearchChange: (query: string) => void;
  onSelectGlobalSearchResult: (result: GlobalSearchResult) => void;
  githubAuth: GitHubAuthStatus;
  onBeginGitHubDeviceFlow: () => Promise<DeviceFlowInstructions | undefined>;
  onCheckGitHubDeviceFlow: () => void;
  onStoreGitHubPersonalAccessToken: (token: string) => void;
  onDisconnectGitHub: () => void;
  dialog: DialogRequest | null;
  onDialogSubmit: (value: string) => void;
  onDialogCancel: () => void;
  githubConnectionWizard: GitHubConnectionWizardState;
  isWorkspaceGitBacked: boolean;
  onGitHubWizardUrlChange: (url: string) => void;
  onGitHubWizardSubmit: () => void;
  onGitHubWizardCancel: () => void;
  isWindowMaximized: boolean;
  onMinimizeWindow: () => void;
  onToggleMaximizeWindow: () => void;
  onCloseWindow: () => void;
}

export function ClassicShell({
  activeRoute,
  workspaceTree,
  statusLabel,
  workspaceError,
  workspaceName,
  workspacePath,
  recentWorkspaces,
  activeNotePath,
  activeFolderPath,
  noteContent,
  themeMode,
  editorError,
  canManageWorkspace,
  onOpenWorkspace,
  onCloneGitHubRepository,
  onOpenRecentWorkspace,
  onRouteChange,
  onThemeChange,
  onSelectFolder,
  onSelectNote,
  onNoteChange,
  onCreateFolder,
  onCreateNote,
  onRenameSelection,
  onMoveActiveNote,
  onDeleteSelection,
  onMoveItem,
  onSyncWorkspace,
  githubRemote,
  advancedGit,
  syncEvents,
  onRefreshAdvancedGit,
  onConnectGitHubRemote,
  conflictedFiles,
  onResolveConflict,
  onEditConflictManually,
  fileSearchJump,
  globalSearchQuery,
  globalSearchResults,
  onGlobalSearchChange,
  onSelectGlobalSearchResult,
  githubAuth,
  onBeginGitHubDeviceFlow,
  onCheckGitHubDeviceFlow,
  onStoreGitHubPersonalAccessToken,
  onDisconnectGitHub,
  dialog,
  onDialogSubmit,
  onDialogCancel,
  githubConnectionWizard,
  isWorkspaceGitBacked,
  onGitHubWizardUrlChange,
  onGitHubWizardSubmit,
  onGitHubWizardCancel,
  isWindowMaximized,
  onMinimizeWindow,
  onToggleMaximizeWindow,
  onCloseWindow,
}: ClassicShellProps) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isCommandHelpOpen, setIsCommandHelpOpen] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [activeFileMatchIndex, setActiveFileMatchIndex] = useState(0);
  const [treeContextMenu, setTreeContextMenu] = useState<{ x: number; y: number; kind: "folder" | "note" } | null>(
    null,
  );
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const hasSelection = activeNotePath !== null || activeFolderPath !== "";
  const hasOpenWorkspace = canManageWorkspace;
  const hasNotes = workspaceTreeHasNotes(workspaceTree);
  const nextTheme = themeMode === "light" ? "dark" : "light";
  const fileSearchMatches = useMemo(
    () => findPlainTextMatches(noteContent, fileSearchQuery),
    [fileSearchQuery, noteContent],
  );
  const currentFileSearchJump =
    fileSearchMatches.length > 0
      ? {
          notePath: activeNotePath ?? "",
          lineNumber: fileSearchMatches[activeFileMatchIndex]?.lineNumber ?? 1,
          matchStart: fileSearchMatches[activeFileMatchIndex]?.matchStart ?? 0,
          matchEnd: fileSearchMatches[activeFileMatchIndex]?.matchEnd ?? 0,
        }
      : fileSearchJump;
  const commands = useMemo<ShellCommand[]>(
    () => [
      {
        id: "open-workspace",
        label: "Open Workspace",
        shortcut: "Ctrl/Cmd+O",
        available: true,
        run: onOpenWorkspace,
      },
      {
        id: "new-folder",
        label: "New folder",
        shortcut: "Ctrl/Cmd+Shift+N",
        available: canManageWorkspace,
        run: onCreateFolder,
      },
      {
        id: "new-note",
        label: "New note",
        shortcut: "Ctrl/Cmd+N",
        available: canManageWorkspace,
        run: onCreateNote,
      },
      {
        id: "rename",
        label: "Rename",
        shortcut: "F2",
        available: canManageWorkspace && hasSelection,
        run: onRenameSelection,
      },
      {
        id: "move-note",
        label: "Move note",
        shortcut: "Ctrl/Cmd+M",
        available: canManageWorkspace && activeNotePath !== null,
        run: onMoveActiveNote,
      },
      {
        id: "sync-workspace",
        label: "Sync now",
        shortcut: "Ctrl/Cmd+Shift+S",
        available: canManageWorkspace,
        run: onSyncWorkspace,
      },
      {
        id: "workspace",
        label: "Back to notes",
        shortcut: "Ctrl/Cmd+1",
        available: activeRoute !== "workspace",
        run: () => onRouteChange("workspace"),
      },
      {
        id: "sync",
        label: "Sync",
        shortcut: "Ctrl/Cmd+2",
        available: activeRoute !== "sync",
        run: () => onRouteChange("sync"),
      },
      {
        id: "settings",
        label: "Settings",
        shortcut: "Ctrl/Cmd+3",
        available: activeRoute !== "settings",
        run: () => onRouteChange("settings"),
      },
      {
        id: "theme",
        label: `Switch to ${nextTheme} theme`,
        shortcut: "Ctrl/Cmd+Shift+T",
        available: true,
        run: () => onThemeChange(nextTheme),
      },
      {
        id: "command-help",
        label: "Command Help",
        shortcut: "Ctrl/Cmd+/",
        available: true,
        run: () => setIsCommandHelpOpen(true),
      },
    ],
    [
      activeNotePath,
      activeRoute,
      canManageWorkspace,
      hasSelection,
      nextTheme,
      onCreateFolder,
      onCreateNote,
      onMoveActiveNote,
      onOpenWorkspace,
      onRenameSelection,
      onRouteChange,
      onSyncWorkspace,
      onThemeChange,
    ],
  );
  const availableCommands = commands.filter((command) => command.available);

  useEffect(() => {
    setActiveFileMatchIndex(0);
  }, [activeNotePath, fileSearchQuery]);

  useEffect(() => {
    if (!treeContextMenu) {
      return;
    }

    const closeMenu = () => setTreeContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [treeContextMenu]);

  useEffect(() => {
    const runAvailableCommand = (commandId: string) => {
      const command = availableCommands.find((availableCommand) => availableCommand.id === commandId);

      if (!command) {
        return false;
      }

      command.run();
      setIsCommandPaletteOpen(false);
      return true;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const hasCommandModifier = event.ctrlKey || event.metaKey;

      if (hasCommandModifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsCommandPaletteOpen((current) => !current);
        return;
      }

      if (hasCommandModifier && event.key === "/") {
        event.preventDefault();
        setIsCommandHelpOpen(true);
        return;
      }

      if (hasCommandModifier && event.shiftKey && event.key.toLowerCase() === "n") {
        if (runAvailableCommand("new-folder")) {
          event.preventDefault();
        }
        return;
      }

      if (hasCommandModifier && event.key.toLowerCase() === "n") {
        if (runAvailableCommand("new-note")) {
          event.preventDefault();
        }
        return;
      }

      if (hasCommandModifier && event.key.toLowerCase() === "o") {
        if (runAvailableCommand("open-workspace")) {
          event.preventDefault();
        }
        return;
      }

      if (hasCommandModifier && event.key.toLowerCase() === "m") {
        if (runAvailableCommand("move-note")) {
          event.preventDefault();
        }
        return;
      }

      if (hasCommandModifier && event.shiftKey && event.key.toLowerCase() === "t") {
        if (runAvailableCommand("theme")) {
          event.preventDefault();
        }
        return;
      }

      if (hasCommandModifier && event.shiftKey && event.key.toLowerCase() === "s") {
        if (runAvailableCommand("sync-workspace")) {
          event.preventDefault();
        }
        return;
      }

      if (hasCommandModifier && event.key === "1") {
        if (runAvailableCommand("workspace")) {
          event.preventDefault();
        }
        return;
      }

      if (hasCommandModifier && event.key === "2") {
        if (runAvailableCommand("sync")) {
          event.preventDefault();
        }
        return;
      }

      if (hasCommandModifier && event.key === "3") {
        if (runAvailableCommand("settings")) {
          event.preventDefault();
        }
        return;
      }

      if (event.key === "F2") {
        if (runAvailableCommand("rename")) {
          event.preventDefault();
        }
        return;
      }

      if (event.key === "Escape") {
        setIsCommandPaletteOpen(false);
        setIsCommandHelpOpen(false);
        setIsWorkspaceMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [availableCommands]);

  const runCommand = (command: ShellCommand) => {
    command.run();
    setIsCommandPaletteOpen(false);
  };

  const goToPreviousFileMatch = () => {
    setActiveFileMatchIndex((current) =>
      fileSearchMatches.length === 0 ? 0 : (current - 1 + fileSearchMatches.length) % fileSearchMatches.length,
    );
  };

  const goToNextFileMatch = () => {
    setActiveFileMatchIndex((current) =>
      fileSearchMatches.length === 0 ? 0 : (current + 1) % fileSearchMatches.length,
    );
  };

  return (
    <div className="app-shell" data-theme="warm" data-mode={themeMode}>
      <TitleBar
        isMaximized={isWindowMaximized}
        onMinimize={onMinimizeWindow}
        onToggleMaximize={onToggleMaximizeWindow}
        onClose={onCloseWindow}
      />
      <aside className="sidebar" aria-label="Workspace tree">
        <header className="sidebar__header">
          <div className="workspace-summary">
            <button
              type="button"
              className="workspace-trigger"
              aria-haspopup="menu"
              aria-expanded={isWorkspaceMenuOpen}
              onClick={() => setIsWorkspaceMenuOpen((current) => !current)}
            >
              <span className="workspace-trigger__text">
                <strong>{workspaceName}</strong>
                {workspacePath ? <small>{workspacePath}</small> : null}
              </span>
              <Icon name="chevron-down" />
            </button>
            {isWorkspaceMenuOpen ? (
              <WorkspaceMenu
                recentWorkspaces={recentWorkspaces}
                onSelectRecent={(workspacePath) => {
                  onOpenRecentWorkspace(workspacePath);
                  setIsWorkspaceMenuOpen(false);
                }}
                onOpenWorkspace={() => {
                  onOpenWorkspace();
                  setIsWorkspaceMenuOpen(false);
                }}
                onClose={() => setIsWorkspaceMenuOpen(false)}
              />
            ) : null}
          </div>
          <div className="sidebar__header-actions">
            <button type="button" className="workspace-clone-link" onClick={onCloneGitHubRepository}>
              <Icon name="git-branch" />
              Clonar desde GitHub
            </button>
            <div className="sidebar-tabs" role="tablist" aria-label="Sidebar panels">
              <button
                type="button"
                role="tab"
                aria-selected={activeRoute === "sync"}
                aria-label="Sync"
                title="Sync"
                className={activeRoute === "sync" ? "sidebar-tab sidebar-tab--active" : "sidebar-tab"}
                onClick={() => onRouteChange(activeRoute === "sync" ? "workspace" : "sync")}
              >
                <Icon name="sync" />
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeRoute === "settings"}
                aria-label="Settings"
                title="Settings"
                className={activeRoute === "settings" ? "sidebar-tab sidebar-tab--active" : "sidebar-tab"}
                onClick={() => onRouteChange(activeRoute === "settings" ? "workspace" : "settings")}
              >
                <Icon name="settings" />
              </button>
            </div>
          </div>
        </header>

        {workspaceError ? <p className="workspace-error">{workspaceError}</p> : null}

        {activeRoute === "sync" ? (
          <section className="sidebar-panel" aria-label="Sync workspace">
            <SyncWorkspacePanel
              canManageWorkspace={canManageWorkspace}
              statusLabel={statusLabel}
              workspaceName={workspaceName}
              onSyncWorkspace={onSyncWorkspace}
              githubRemote={githubRemote}
              advancedGit={advancedGit}
              syncEvents={syncEvents}
              githubAuth={githubAuth}
              onRefreshAdvancedGit={onRefreshAdvancedGit}
              onConnectGitHubRemote={onConnectGitHubRemote}
              conflictedFiles={conflictedFiles}
              onResolveConflict={onResolveConflict}
              onEditConflictManually={onEditConflictManually}
            />
          </section>
        ) : activeRoute === "settings" ? (
          <GitHubAuthenticationPanel
            githubAuth={githubAuth}
            onBeginDeviceFlow={onBeginGitHubDeviceFlow}
            onCheckDeviceFlow={onCheckGitHubDeviceFlow}
            onStorePersonalAccessToken={onStoreGitHubPersonalAccessToken}
            onDisconnect={onDisconnectGitHub}
          />
        ) : (
          <>
            <div className="global-search" role="search" aria-label="Global Search">
              <label className="global-search__field">
                <Icon name="search" />
                <input
                  type="search"
                  aria-label="Global Search"
                  placeholder="Buscar en todos los archivos..."
                  value={globalSearchQuery}
                  onChange={(event) => onGlobalSearchChange(event.target.value)}
                  disabled={!canManageWorkspace}
                />
              </label>
              {globalSearchResults.length > 0 ? (
                <ol className="global-search__results" aria-label="Global Search results">
                  {globalSearchResults.map((result) => (
                    <li key={`${result.notePath}:${result.lineNumber}:${result.matchStart}`}>
                      <button
                        type="button"
                        aria-label={`${result.notePath} line ${result.lineNumber}: ${result.lineText}`}
                        onClick={() => onSelectGlobalSearchResult(result)}
                      >
                        <span>{result.notePath}</span>
                        <small>
                          Line {result.lineNumber}: {result.lineText}
                        </small>
                      </button>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
            {workspaceTree.length > 0 ? (
              <WorkspaceTree
                items={workspaceTree}
                activeNotePath={activeNotePath}
                activeFolderPath={activeFolderPath}
                onSelectFolder={onSelectFolder}
                onSelectNote={onSelectNote}
                onItemContextMenu={(event, kind, path) => {
                  event.preventDefault();
                  if (kind === "folder") {
                    onSelectFolder(path);
                  } else {
                    onSelectNote(path);
                  }
                  setTreeContextMenu({ x: event.clientX, y: event.clientY, kind });
                }}
                onMoveItem={onMoveItem}
                dragOverFolder={dragOverFolder}
                onDragOverFolder={setDragOverFolder}
                isRoot
              />
            ) : (
              <p className="empty-tree">
                {hasOpenWorkspace ? "This Workspace has no Markdown notes yet." : "Open a Workspace to show Markdown notes."}
              </p>
            )}

            <div className="tree-actions" aria-label="Workspace actions">
              <button type="button" title="New folder" aria-label="New folder" onClick={onCreateFolder} disabled={!canManageWorkspace}>
                <Icon name="folder-plus" />
              </button>
              <button type="button" title="New note" aria-label="New note" onClick={onCreateNote} disabled={!canManageWorkspace}>
                <Icon name="note-plus" />
              </button>
              <button
                type="button"
                title="Rename"
                aria-label="Rename"
                onClick={onRenameSelection}
                disabled={!canManageWorkspace || !hasSelection}
              >
                <Icon name="rename" />
              </button>
              <button
                type="button"
                title="Move"
                aria-label="Move"
                onClick={onMoveActiveNote}
                disabled={!canManageWorkspace || activeNotePath === null}
              >
                <Icon name="move" />
              </button>
              <button
                type="button"
                title="Delete"
                aria-label="Delete"
                onClick={onDeleteSelection}
                disabled={!canManageWorkspace || !hasSelection}
              >
                <Icon name="trash" />
              </button>
            </div>
          </>
        )}
      </aside>

      <main className="editor-pane" aria-label="Markdown editor area">
        <div className="editor-toolbar">
          <Breadcrumb folderPath={activeFolderPath} notePath={activeNotePath} />
          <div className="file-search" role="search" aria-label="Current note search">
            <input
              type="search"
              aria-label="Search current note"
              value={fileSearchQuery}
              onChange={(event) => setFileSearchQuery(event.target.value)}
              disabled={!activeNotePath}
            />
            <span aria-live="polite">
              {fileSearchQuery.trim() === ""
                ? "0 of 0"
                : `${fileSearchMatches.length === 0 ? 0 : activeFileMatchIndex + 1} of ${fileSearchMatches.length}`}
            </span>
            <button
              type="button"
              title="Previous match"
              aria-label="Previous current-note match"
              onClick={goToPreviousFileMatch}
              disabled={fileSearchMatches.length === 0}
            >
              <Icon name="chevron-up" />
            </button>
            <button
              type="button"
              title="Next match"
              aria-label="Next current-note match"
              onClick={goToNextFileMatch}
              disabled={fileSearchMatches.length === 0}
            >
              <Icon name="chevron-down" />
            </button>
          </div>
          <div className="editor-toolbar__actions">
            <button
              type="button"
              title={`Switch to ${nextTheme} theme`}
              aria-label={`Switch to ${nextTheme} theme`}
              onClick={() => onThemeChange(nextTheme)}
            >
              <Icon name={themeMode === "light" ? "moon" : "sun"} />
            </button>
            <button
              type="button"
              title="Command Palette"
              aria-label="Open Command Palette"
              onClick={() => setIsCommandPaletteOpen(true)}
            >
              <Icon name="commands" />
            </button>
          </div>
        </div>

        <section className="editor-surface" aria-label="Raw Markdown editor">
          {editorError ? (
            <EditorErrorState error={editorError} notePath={activeNotePath} />
          ) : activeNotePath ? (
            <MarkdownEditor
              notePath={activeNotePath}
              value={noteContent}
              onChange={onNoteChange}
              searchJump={currentFileSearchJump}
            />
          ) : hasOpenWorkspace && !hasNotes ? (
            <p className="empty-editor">Create a note to start writing in {workspaceName}.</p>
          ) : (
            <p className="empty-editor">Select a Markdown note to start writing.</p>
          )}
        </section>
      </main>

      <footer className="status-bar" aria-label="Workspace status">
        <span>{statusLabel}</span>
        <span>Escritorio</span>
      </footer>
      {isCommandPaletteOpen ? (
        <CommandPalette commands={availableCommands} onRunCommand={runCommand} onClose={() => setIsCommandPaletteOpen(false)} />
      ) : null}
      {isCommandHelpOpen ? (
        <CommandHelp commands={availableCommands} onClose={() => setIsCommandHelpOpen(false)} />
      ) : null}
      {dialog ? <AppDialog dialog={dialog} onSubmit={onDialogSubmit} onCancel={onDialogCancel} /> : null}
      {githubConnectionWizard.isOpen ? (
        <GitHubConnectionWizard
          state={githubConnectionWizard}
          isGitBacked={isWorkspaceGitBacked}
          onUrlChange={onGitHubWizardUrlChange}
          onSubmit={onGitHubWizardSubmit}
          onCancel={onGitHubWizardCancel}
        />
      ) : null}
      {treeContextMenu ? (
        <TreeContextMenu
          x={treeContextMenu.x}
          y={treeContextMenu.y}
          kind={treeContextMenu.kind}
          onCreateFolder={onCreateFolder}
          onCreateNote={onCreateNote}
          onRenameSelection={onRenameSelection}
          onMoveActiveNote={onMoveActiveNote}
          onDeleteSelection={onDeleteSelection}
        />
      ) : null}
    </div>
  );
}

function AppDialog({
  dialog,
  onSubmit,
  onCancel,
}: {
  dialog: DialogRequest;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(dialog.kind === "prompt" ? dialog.defaultValue : "");

  return (
    <div className="dialog-overlay" role="presentation" onClick={onCancel}>
      <form
        className="command-popover app-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={dialog.title}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(value);
        }}
      >
        <p className="app-dialog__title">{dialog.title}</p>
        {dialog.kind === "prompt" ? (
          <input
            type="text"
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                onCancel();
              }
            }}
          />
        ) : null}
        <div className="app-dialog__actions">
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="app-dialog__confirm">
            {dialog.kind === "confirm" ? "Eliminar" : "Aceptar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TreeContextMenu({
  x,
  y,
  kind,
  onCreateFolder,
  onCreateNote,
  onRenameSelection,
  onMoveActiveNote,
  onDeleteSelection,
}: {
  x: number;
  y: number;
  kind: "folder" | "note";
  onCreateFolder: () => void;
  onCreateNote: () => void;
  onRenameSelection: () => void;
  onMoveActiveNote: () => void;
  onDeleteSelection: () => void;
}) {
  return (
    <div className="context-menu" role="menu" style={{ left: x, top: y }}>
      {kind === "folder" ? (
        <>
          <button type="button" role="menuitem" onClick={onCreateNote}>
            <Icon name="note-plus" size={14} />
            Nueva nota
          </button>
          <button type="button" role="menuitem" onClick={onCreateFolder}>
            <Icon name="folder-plus" size={14} />
            Nueva carpeta
          </button>
        </>
      ) : (
        <button type="button" role="menuitem" onClick={onMoveActiveNote}>
          <Icon name="move" size={14} />
          Mover
        </button>
      )}
      <button type="button" role="menuitem" onClick={onRenameSelection}>
        <Icon name="rename" size={14} />
        Renombrar
      </button>
      <button type="button" role="menuitem" className="context-menu__danger" onClick={onDeleteSelection}>
        <Icon name="trash" size={14} />
        Eliminar
      </button>
    </div>
  );
}

function GitHubAuthenticationPanel({
  githubAuth,
  onBeginDeviceFlow,
  onCheckDeviceFlow,
  onStorePersonalAccessToken,
  onDisconnect,
}: {
  githubAuth: GitHubAuthStatus;
  onBeginDeviceFlow: () => Promise<DeviceFlowInstructions | undefined>;
  onCheckDeviceFlow: () => void;
  onStorePersonalAccessToken: (token: string) => void;
  onDisconnect: () => void;
}) {
  const [instructions, setInstructions] = useState<DeviceFlowInstructions | null>(null);
  const [personalAccessToken, setPersonalAccessToken] = useState("");

  const beginDeviceFlow = async () => {
    setInstructions((await onBeginDeviceFlow()) ?? null);
  };

  return (
    <section className="sync-panel" aria-label="GitHub authentication">
      <div>
        <span>GitHub authentication</span>
        <strong>{githubAuth.state}</strong>
      </div>
      {githubAuth.message ? <p role="status">{githubAuth.message}</p> : null}
      {githubAuth.state === "connected" ? (
        <button type="button" onClick={onDisconnect}>Disconnect GitHub</button>
      ) : (
        <button type="button" onClick={() => void beginDeviceFlow()}>Connect with GitHub</button>
      )}
      {instructions ? (
        <div>
          <span>Open {instructions.verificationUri} and enter:</span>
          <strong>{instructions.userCode}</strong>
          <button type="button" onClick={onCheckDeviceFlow}>I completed GitHub sign-in</button>
        </div>
      ) : null}
      <details>
        <summary>Advanced: Personal Access Token</summary>
        <label>
          Token
          <input
            type="password"
            value={personalAccessToken}
            onChange={(event) => setPersonalAccessToken(event.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={personalAccessToken.trim() === ""}
          onClick={() => onStorePersonalAccessToken(personalAccessToken)}
        >
          Store Personal Access Token
        </button>
      </details>
    </section>
  );
}

function WorkspaceMenu({
  recentWorkspaces,
  onSelectRecent,
  onOpenWorkspace,
  onClose,
}: {
  recentWorkspaces: Array<{ name: string; path: string }>;
  onSelectRecent: (workspacePath: string) => void;
  onOpenWorkspace: () => void;
  onClose: () => void;
}) {
  return (
    <div className="command-popover workspace-menu" role="menu" aria-label="Workspace menu">
      <div className="command-popover__header">
        <h2>Workspaces</h2>
        <button type="button" aria-label="Close Workspace menu" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      {recentWorkspaces.length > 0 ? (
        <div className="recent-workspaces" aria-label="Recent Workspaces">
          {recentWorkspaces.map((workspace) => (
            <button
              key={workspace.path}
              type="button"
              aria-label={workspace.path}
              title={workspace.path}
              onClick={() => onSelectRecent(workspace.path)}
            >
              <span>{workspace.name}</span>
              <small>{workspace.path}</small>
            </button>
          ))}
        </div>
      ) : null}
      <button type="button" className="workspace-menu__open" onClick={onOpenWorkspace}>
        <Icon name="folder" />
        Abrir otra carpeta...
      </button>
    </div>
  );
}

function CommandPalette({
  commands,
  onRunCommand,
  onClose,
}: {
  commands: ShellCommand[];
  onRunCommand: (command: ShellCommand) => void;
  onClose: () => void;
}) {
  return (
    <div className="command-popover command-palette" role="dialog" aria-modal="false" aria-labelledby="command-palette-title">
      <div className="command-popover__header">
        <h2 id="command-palette-title">Command Palette</h2>
        <button type="button" aria-label="Close Command Palette" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="command-list">
        {commands.map((command) => (
          <button key={command.id} type="button" aria-label={command.label} onClick={() => onRunCommand(command)}>
            <span>{command.label}</span>
            <kbd>{command.shortcut}</kbd>
          </button>
        ))}
      </div>
    </div>
  );
}

function CommandHelp({ commands, onClose }: { commands: ShellCommand[]; onClose: () => void }) {
  return (
    <aside className="command-popover command-help" role="dialog" aria-modal="false" aria-labelledby="command-help-title">
      <div className="command-popover__header">
        <h2 id="command-help-title">Command Help</h2>
        <button type="button" aria-label="Close Command Help" onClick={onClose}>
          Close
        </button>
      </div>
      <dl className="command-help__list">
        {commands.map((command) => (
          <div key={command.id}>
            <dt>{command.label}</dt>
            <dd>{command.shortcut}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

function Breadcrumb({ folderPath, notePath }: { folderPath: string; notePath: string | null }) {
  if (!notePath) {
    return <nav className="breadcrumb" aria-label="Note location" />;
  }

  const fileName = notePath.split("/").pop() ?? notePath;

  return (
    <nav className="breadcrumb" aria-label="Note location">
      {folderPath ? (
        <>
          <span className="breadcrumb__segment">{folderPath}</span>
          <span className="breadcrumb__separator" aria-hidden="true">
            /
          </span>
        </>
      ) : null}
      <span className="breadcrumb__segment breadcrumb__segment--current" title={notePath}>
        {fileName}
      </span>
    </nav>
  );
}

function EditorErrorState({ error, notePath }: { error: EditorError; notePath: string | null }) {
  return (
    <div className="editor-state editor-state--error" role="status">
      <h2>{error.kind === "missing-note" ? "The selected note is missing." : "The note could not be opened."}</h2>
      {notePath ? <p>{notePath}</p> : null}
      <p>{error.message}</p>
    </div>
  );
}

function SyncWorkspacePanel({
  canManageWorkspace,
  statusLabel,
  workspaceName,
  onSyncWorkspace,
  githubRemote,
  advancedGit,
  syncEvents,
  githubAuth,
  onRefreshAdvancedGit,
  onConnectGitHubRemote,
  conflictedFiles,
  onResolveConflict,
  onEditConflictManually,
}: {
  canManageWorkspace: boolean;
  statusLabel: string;
  workspaceName: string;
  onSyncWorkspace: () => void;
  githubRemote: GitHubRemote | null;
  advancedGit: AdvancedGitStatus | null;
  syncEvents: SyncEvent[];
  githubAuth: GitHubAuthStatus;
  onRefreshAdvancedGit: () => void;
  onConnectGitHubRemote: () => void;
  conflictedFiles: string[];
  onResolveConflict: (notePath: string, resolution: ConflictResolution) => void;
  onEditConflictManually: (notePath: string) => void;
}) {
  const [isAdvancedGitOpen, setIsAdvancedGitOpen] = useState(false);

  return (
    <div className="sync-panel">
      <div>
        <span>Workspace</span>
        <strong>{workspaceName}</strong>
      </div>
      <div>
        <span>Sync status</span>
        <strong>{statusLabel}</strong>
      </div>
      {githubRemote ? (
        <div>
          <span>GitHub remote</span>
          <strong>{githubRemote.url}</strong>
        </div>
      ) : (
        <button type="button" onClick={onConnectGitHubRemote} disabled={!canManageWorkspace}>
          Conectar remoto GitHub
        </button>
      )}
      <button
        type="button"
        onClick={onSyncWorkspace}
        disabled={!canManageWorkspace || statusLabel === "Sincronizando" || statusLabel === "Necesita resolver conflicto"}
      >
        Sync now
      </button>
      {conflictedFiles.length > 0 ? (
        <div className="sync-conflicts" role="region" aria-label="Conflicted Markdown files">
          <span>Conflicted Markdown files</span>
          <ul>
            {conflictedFiles.map((notePath) => (
              <li key={notePath}>
                <strong>{notePath}</strong>
                <div>
                  <button type="button" onClick={() => onResolveConflict(notePath, "local")}>Use local</button>
                  <button type="button" onClick={() => onResolveConflict(notePath, "remote")}>Use remote</button>
                  <button type="button" onClick={() => onEditConflictManually(notePath)}>Edit manually</button>
                  <button type="button" onClick={() => onResolveConflict(notePath, "manual")}>Mark manual resolution</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <details
        className="advanced-git"
        open={isAdvancedGitOpen}
        onToggle={(event) => {
          const isOpen = event.currentTarget.open;
          setIsAdvancedGitOpen(isOpen);
          if (isOpen) {
            onRefreshAdvancedGit();
          }
        }}
      >
        <summary>Advanced Git</summary>
        {isAdvancedGitOpen ? <section aria-label="Advanced Git details">
          <div>
            <span>Repository</span>
            <strong>{advancedGit?.repository ?? githubRemote?.url ?? "No remote configured"}</strong>
          </div>
          <div>
            <span>Branch</span>
            <strong>{advancedGit?.branch ?? "Not available"}</strong>
          </div>
          <div>
            <span>Latest commit</span>
            <strong>
              {advancedGit?.latestCommit
                ? `${advancedGit.latestCommit.id} ${advancedGit.latestCommit.subject}`
                : "No commits yet"}
            </strong>
          </div>
          <div>
            <span>Pending changes</span>
            {advancedGit?.pendingChanges.length ? (
              <ul>{advancedGit.pendingChanges.map((path) => <li key={path}>{path}</li>)}</ul>
            ) : (
              <strong>None</strong>
            )}
          </div>
          <div>
            <span>GitHub authentication</span>
            <strong>{githubAuth.state}</strong>
            {githubAuth.message ? <p role="status">{githubAuth.message}</p> : null}
          </div>
          <div>
            <span>Recent Sync events</span>
            {syncEvents.length ? (
              <ol>{syncEvents.map((event) => <li key={`${event.at}-${event.message}`}>{event.outcome}: {event.message}</li>)}</ol>
            ) : (
              <p>No Sync events yet.</p>
            )}
          </div>
          <button type="button" onClick={onRefreshAdvancedGit} disabled={!canManageWorkspace}>Refresh Git details</button>
        </section> : null}
      </details>
    </div>
  );
}

function TitleBar({
  isMaximized,
  onMinimize,
  onToggleMaximize,
  onClose,
}: {
  isMaximized: boolean;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
}) {
  return (
    <header className="titlebar" data-tauri-drag-region>
      <span className="titlebar__title" data-tauri-drag-region>
        Simpler
      </span>
      <div className="titlebar__controls">
        <button type="button" title="Minimizar" aria-label="Minimizar" onClick={onMinimize}>
          <Icon name="window-minimize" size={12} />
        </button>
        <button
          type="button"
          title={isMaximized ? "Restaurar" : "Maximizar"}
          aria-label={isMaximized ? "Restaurar" : "Maximizar"}
          onClick={onToggleMaximize}
        >
          <Icon name={isMaximized ? "window-restore" : "window-maximize"} size={12} />
        </button>
        <button
          type="button"
          title="Cerrar"
          aria-label="Cerrar"
          className="titlebar__close"
          onClick={onClose}
        >
          <Icon name="close" size={12} />
        </button>
      </div>
    </header>
  );
}

function WorkspaceTree({
  items,
  activeNotePath,
  activeFolderPath,
  onSelectFolder,
  onSelectNote,
  onItemContextMenu,
  onMoveItem,
  dragOverFolder,
  onDragOverFolder,
  isRoot = false,
}: {
  items: WorkspaceTreeItem[];
  activeNotePath: string | null;
  activeFolderPath: string;
  onSelectFolder: (folderPath: string) => void;
  onSelectNote: (notePath: string) => void;
  onItemContextMenu: (event: MouseEvent, kind: "folder" | "note", path: string) => void;
  onMoveItem: (itemPath: string, targetFolderPath: string) => void;
  dragOverFolder: string | null;
  onDragOverFolder: (folderPath: string | null) => void;
  isRoot?: boolean;
}) {
  const readDraggedPath = (event: DragEvent) => event.dataTransfer.getData("text/plain");

  const rootDropProps = isRoot
    ? {
        onDragOver: (event: DragEvent) => {
          event.preventDefault();
          onDragOverFolder("");
        },
        onDragLeave: () => onDragOverFolder(null),
        onDrop: (event: DragEvent) => {
          event.preventDefault();
          const draggedPath = readDraggedPath(event);
          onDragOverFolder(null);
          if (draggedPath) {
            onMoveItem(draggedPath, "");
          }
        },
      }
    : {};

  return (
    <ul className={isRoot && dragOverFolder === "" ? "note-tree note-tree--drop-target" : "note-tree"} {...rootDropProps}>
      {items.map((item) => (
        <li key={item.path}>
          {item.kind === "folder" ? (
            <button
              type="button"
              className={
                dragOverFolder === item.path ? "note-tree__folder note-tree__folder--drop-target" : "note-tree__folder"
              }
              title={item.path}
              draggable
              onClick={() => onSelectFolder(item.path)}
              onContextMenu={(event) => onItemContextMenu(event, "folder", item.path)}
              onDragStart={(event) => {
                event.stopPropagation();
                event.dataTransfer.setData("text/plain", item.path);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDragOverFolder(item.path);
              }}
              onDragLeave={(event) => {
                event.stopPropagation();
                onDragOverFolder(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const draggedPath = readDraggedPath(event);
                onDragOverFolder(null);
                if (draggedPath) {
                  onMoveItem(draggedPath, item.path);
                }
              }}
            >
              <span className="note-tree__label">
                <Icon name="folder" />
                {item.name}
              </span>
            </button>
          ) : (
            <button
              type="button"
              className={
                item.path === activeNotePath ? "note-tree__item note-tree__item--active" : "note-tree__item"
              }
              title={item.path}
              draggable
              onClick={() => onSelectNote(item.path)}
              onContextMenu={(event) => onItemContextMenu(event, "note", item.path)}
              onDragStart={(event) => {
                event.stopPropagation();
                event.dataTransfer.setData("text/plain", item.path);
                event.dataTransfer.effectAllowed = "move";
              }}
            >
              <span className="note-tree__label">
                <Icon name="note" size={14} />
                {item.name}
              </span>
            </button>
          )}
          {item.kind === "folder" && item.children.length > 0 ? (
            <WorkspaceTree
              items={item.children}
              activeNotePath={activeNotePath}
              activeFolderPath={activeFolderPath}
              onSelectFolder={onSelectFolder}
              onSelectNote={onSelectNote}
              onItemContextMenu={onItemContextMenu}
              onMoveItem={onMoveItem}
              dragOverFolder={dragOverFolder}
              onDragOverFolder={onDragOverFolder}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function workspaceTreeHasNotes(items: WorkspaceTreeItem[]): boolean {
  return items.some((item) => item.kind === "note" || workspaceTreeHasNotes(item.children));
}

function findPlainTextMatches(content: string, query: string): FileSearchJump[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery === "") {
    return [];
  }

  return content.split("\n").flatMap((lineText, lineIndex) => {
    const matches: FileSearchJump[] = [];
    const normalizedLine = lineText.toLowerCase();
    let fromIndex = 0;

    while (fromIndex <= normalizedLine.length) {
      const matchStart = normalizedLine.indexOf(normalizedQuery, fromIndex);

      if (matchStart === -1) {
        break;
      }

      matches.push({
        notePath: "",
        lineNumber: lineIndex + 1,
        matchStart,
        matchEnd: matchStart + normalizedQuery.length,
      });
      fromIndex = matchStart + normalizedQuery.length;
    }

    return matches;
  });
}
