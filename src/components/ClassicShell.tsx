import { useEffect, useLayoutEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode, type DragEvent, type MouseEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactElement, cloneElement } from "react";
import type { AppRoute } from "../app/routes";
import type {
  CloseSyncPromptState,
  EditorError,
  FileSearchJump,
  GitHubConnectionWizardState,
  SyncEvent,
  ThemeMode,
  TreeMode,
  UiZoom,
  EditorFontSize,
  UpdateNoticeState,
  WorkspaceTreeItem,
} from "../app/appState";
import { uiZoomSteps, defaultUiZoom, editorFontSizeSteps, defaultEditorFontSize, themes, themeLabels } from "../app/appState";
import type { Theme } from "../app/appState";
import type { RemoteAwareness, AdvancedGitStatus, ConflictResolution, DeviceFlowInstructions, GitHubAuthStatus, GitHubRemote, GlobalSearchResult, NoteHistoryEntry, Platform, TrashEntry } from "../native/commands";
import type { DialogRequest } from "../app/appState";
import { WelcomeScreen } from "./WelcomeScreen";
import type { RecentNote } from "../app/recentNotes";
import { SettingsDialog } from "./SettingsDialog";
import { ImagePreviewDialog } from "./ImagePreviewDialog";
import { sharedWorkspaceMetadataPath } from "../native/commands";
import { MarkdownEditor } from "./MarkdownEditor";
import { NoteHistoryPanel } from "./NoteHistoryPanel";
import { Icon } from "./icons";
import { GitHubConnectionWizard } from "./GitHubConnectionWizard";

type CommandAction = () => void;
export type TreeActionTarget = Pick<WorkspaceTreeItem, "path" | "kind">;

// Below this width the sidebar auto-collapses to the icon rail. It sits
// under the 720px breakpoint in styles.css (which already switches to a
// stacked layout) and above a bare-minimum rail width — 520px is roughly
// where a full sidebar next to an editor starts feeling cramped but a
// tiling-WM column or narrowed window still has enough room for the rail
// plus a usable editor pane.
const narrowViewportThreshold = 520;

interface ShellCommand {
  id: string;
  label: string;
  shortcut: string;
  available: boolean;
  run: CommandAction;
}

export interface ClassicShellProps {
  platform: Platform;
  activeRoute: AppRoute;
  workspaceTree: WorkspaceTreeItem[];
  openFolderPaths: ReadonlySet<string>;
  treeMode: TreeMode;
  statusLabel: string;
  remoteAwareness?: RemoteAwareness;
  onCheckRemote?: () => void;
  workspaceError: string | null;
  workspaceName: string;
  workspacePath: string | null;
  recentWorkspaces: Array<{ name: string; path: string }>;
  recentNotes?: RecentNote[];
  isWelcomeOpen?: boolean;
  showWelcome?: boolean;
  onShowWelcomeChange?: (show: boolean) => void;
  onOpenRecentNotes?: () => void;
  onCloseRecentNotes?: () => void;
  onSelectRecentNote?: (note: RecentNote) => void;
  onRemoveRecentNote?: (note: RecentNote) => void;
  onWelcomeCreateNote?: () => void;
  onWelcomeOpenFolder?: () => void;
  welcomeNotice?: ReactNode;
  activeNotePath: string | null;
  activeFolderPath: string;
  noteContent: string;
  editorFocusRequest?: number;
  workspaceNotice?: string | null;
  noteHistoryOpen: boolean;
  noteHistoryEntries: NoteHistoryEntry[];
  selectedNoteHistoryCommitId: string | null;
  noteHistoryPreview: string | null;
  noteHistoryLoading: boolean;
  noteHistoryError: string | null;
  themeMode: ThemeMode;
  theme: Theme;
  uiZoom: UiZoom;
  editorFontSize: EditorFontSize;
  sidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  editorError: EditorError | null;
  attachmentError: string | null;
  onAttachmentError: (message: string | null) => void;
  canManageWorkspace: boolean;
  onOpenWorkspace: () => void;
  onCloneGitHubRepository: () => void;
  onOpenRecentWorkspace: (workspacePath: string) => void;
  onRouteChange: (route: AppRoute) => void;
  onThemeChange: (themeMode: ThemeMode) => void;
  onAppThemeChange: (theme: Theme) => void;
  onUiZoomChange: (uiZoom: UiZoom) => void;
  onEditorFontSizeChange: (editorFontSize: EditorFontSize) => void;
  onSelectFolder: (folderPath: string) => void;
  onSelectNote: (notePath: string) => void;
  onToggleFolder: (folderPath: string) => void;
  onTreeModeChange: (treeMode: TreeMode) => void;
  onFocusActiveNote: () => void;
  onNavigateToNote: (notePath: string) => void;
  onNoteChange: (content: string) => void;
  onOpenNoteHistory: () => void;
  onCloseNoteHistory: () => void;
  onSelectNoteHistoryEntry: (entry: NoteHistoryEntry) => void;
  onRestoreNoteHistoryEntry: () => void;
  onCreateFolder: (folderPath?: string) => void;
  onCreateNote: (folderPath?: string) => void;
  onRenameSelection: (target?: TreeActionTarget) => void;
  onSetTreeOrder?: (parentPath: string, orderedPaths: string[] | null) => void;
  treeOrderPending?: boolean;
  onMoveActiveNote: (target?: TreeActionTarget) => void;
  onDeleteSelection: (target?: TreeActionTarget) => void;
  trashEntries: TrashEntry[];
  onRestoreTrashItem: (id: string) => void;
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
  closeSyncPrompt: CloseSyncPromptState | null;
  onWaitForSyncBeforeClose: () => void;
  onCloseWithoutSync: () => void;
  updateNotice: UpdateNoticeState | null;
  onInstallAndRestart: () => void;
}

const releasePageUrl = "https://github.com/anmoya/simpler/releases/latest";

export function ClassicShell({
  editorFocusRequest,
  workspaceNotice,
  platform,
  activeRoute,
  workspaceTree,
  openFolderPaths,
  treeMode,
  statusLabel,
  remoteAwareness,
  onCheckRemote,
  workspaceError,
  workspaceName,
  workspacePath,
  recentWorkspaces,
  recentNotes = [], isWelcomeOpen = false, showWelcome = true,
  onShowWelcomeChange = () => undefined, onOpenRecentNotes = () => undefined,
  onCloseRecentNotes = () => undefined, onSelectRecentNote = () => undefined,
  onRemoveRecentNote = () => undefined, onWelcomeCreateNote = () => undefined,
  onWelcomeOpenFolder = () => undefined, welcomeNotice,
  activeNotePath,
  activeFolderPath,
  noteContent,
  noteHistoryOpen,
  noteHistoryEntries,
  selectedNoteHistoryCommitId,
  noteHistoryPreview,
  noteHistoryLoading,
  noteHistoryError,
  themeMode,
  theme,
  uiZoom,
  editorFontSize,
  sidebarCollapsed,
  onToggleSidebarCollapse,
  editorError,
  attachmentError,
  onAttachmentError,
  canManageWorkspace,
  onOpenWorkspace,
  onCloneGitHubRepository,
  onOpenRecentWorkspace,
  onRouteChange,
  onThemeChange,
  onAppThemeChange,
  onUiZoomChange,
  onEditorFontSizeChange,
  onSelectFolder,
  onSelectNote,
  onToggleFolder,
  onTreeModeChange,
  onFocusActiveNote,
  onNavigateToNote,
  onNoteChange,
  onOpenNoteHistory,
  onCloseNoteHistory,
  onSelectNoteHistoryEntry,
  onRestoreNoteHistoryEntry,
  onCreateFolder,
  onCreateNote,
  onRenameSelection,
  onSetTreeOrder,
  treeOrderPending = false,
  onMoveActiveNote,
  onDeleteSelection,
  trashEntries,
  onRestoreTrashItem,
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
  closeSyncPrompt,
  onWaitForSyncBeforeClose,
  onCloseWithoutSync,
  updateNotice,
  onInstallAndRestart,
}: ClassicShellProps) {
  const [imagePreview, setImagePreview] = useState<{ workspacePath: string; imagePath: string } | null>(null);
  const imagePreviewPath = imagePreview?.workspacePath === workspacePath ? imagePreview.imagePath : null;
  const setImagePreviewPath = (imagePath: string | null) => {
    setImagePreview(imagePath && workspacePath ? { workspacePath, imagePath } : null);
  };
  useEffect(() => { setImagePreview(null); }, [workspacePath]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"appearance" | "editor" | "workspace" | "sync">("appearance");
  const [isCommandHelpOpen, setIsCommandHelpOpen] = useState(false);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const settingsOriginRef = useRef<HTMLElement | null>(null);
  const settingsReturnRouteRef = useRef<AppRoute>("workspace");
  const openSettings = () => {
    if (activeRoute === "settings") return;
    settingsReturnRouteRef.current = activeRoute;
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    settingsOriginRef.current = origin?.closest(".command-palette") ? settingsTriggerRef.current : origin;
    onRouteChange("settings");
  };
  const closeSettings = () => onRouteChange(settingsReturnRouteRef.current);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const workspaceTriggerRef = useRef<HTMLButtonElement>(null);
  const closeWorkspaceMenu = () => {
    setIsWorkspaceMenuOpen(false);
    workspaceTriggerRef.current?.focus();
  };
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [activeFileMatchIndex, setActiveFileMatchIndex] = useState(0);
  const [isFileSearchOpen, setIsFileSearchOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const fileSearchInputRef = useRef<HTMLInputElement | null>(null);
  const editorContainerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const surface = editorContainerRef.current;
    const reducedMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!surface || !activeNotePath || editorError || isWelcomeOpen || reducedMotion || typeof surface.animate !== "function") return;
    // Only navigation starts this effect. Local Save keeps the view, selection,
    // focus and scroll position intact; animation never gates editor input.
    const animation = surface.animate([{ opacity: 0.86 }, { opacity: 1 }], { duration: 120, easing: "ease-out" });
    return () => animation.cancel();
  }, [workspacePath, activeNotePath, isWelcomeOpen]);
  const [treeContextMenu, setTreeContextMenu] = useState<{ x: number; y: number; target: TreeActionTarget; trigger: HTMLElement } | null>(
    null,
  );
  const treeDragSourceRef = useRef<{ path: string; workspace: string | null } | null>(null);
  const [treeInsertion, setTreeInsertion] = useState<{ path: string; name: string; side: "before" | "after" } | null>(null);
  const finishTreeDrag = () => { treeDragSourceRef.current = null; setTreeInsertion(null); };
  useEffect(finishTreeDrag, [workspacePath]);
  const siblingDrag = (targetPath: string) => {
    const source = treeDragSourceRef.current;
    if (!source || source.workspace !== workspacePath || treeOrderPending || !onSetTreeOrder) return null;
    const siblings = treeSiblings(workspaceTree, targetPath);
    return siblings.some((item) => item.path === source.path) ? { source, siblings } : null;
  };
  const insertionSide = (event: DragEvent): "before" | "after" => {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  };
  const startTreeDrag = (event: DragEvent, path: string) => {
    if (!onSetTreeOrder || treeOrderPending) { event.preventDefault(); return; }
    event.stopPropagation();
    event.dataTransfer.setData("application/x-simpler-tree-item", path);
    event.dataTransfer.effectAllowed = "move";
    treeDragSourceRef.current = { path, workspace: workspacePath };
    setTreeInsertion(null);
  };
  const hoverTreeItem = (event: DragEvent, item: WorkspaceTreeItem) => {
    if (!treeDragSourceRef.current) return;
    event.stopPropagation();
    const drag = siblingDrag(item.path);
    if (!drag || drag.source.path === item.path || !Array.from(event.dataTransfer.types).includes("application/x-simpler-tree-item")) {
      event.dataTransfer.dropEffect = "none";
      setTreeInsertion(null);
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const side = insertionSide(event);
    setTreeInsertion((current) => current?.path === item.path && current.side === side ? current : { path: item.path, name: item.name, side });
  };
  const dropTreeItem = (event: DragEvent, item: WorkspaceTreeItem) => {
    if (!treeDragSourceRef.current) return;
    event.preventDefault(); event.stopPropagation();
    const drag = siblingDrag(item.path);
    if (drag && event.dataTransfer.getData("application/x-simpler-tree-item") === drag.source.path && drag.source.path !== item.path) {
      const paths = drag.siblings.map((sibling) => sibling.path);
      const reordered = paths.filter((path) => path !== drag.source.path);
      const destination = reordered.indexOf(item.path) + (insertionSide(event) === "after" ? 1 : 0);
      reordered.splice(destination, 0, drag.source.path);
      if (paths.some((path, index) => path !== reordered[index])) {
        onSetTreeOrder?.(item.path.split("/").slice(0, -1).join("/"), reordered);
      }
    }
    finishTreeDrag();
  };
  const openTreeItemMenu = (event: MouseEvent | ReactKeyboardEvent, kind: WorkspaceTreeItem["kind"], path: string) => {
    event.preventDefault();
    event.stopPropagation();
    const trigger = event.currentTarget as HTMLElement;
    const rect = trigger.getBoundingClientRect();
    setTreeContextMenu({
      x: "clientX" in event ? event.clientX : rect.left,
      y: "clientY" in event ? event.clientY : rect.bottom,
      target: { path, kind },
      trigger,
    });
  };
  const closeTreeItemMenu = (restoreFocus = false) => {
    if (restoreFocus) treeContextMenu?.trigger.focus();
    setTreeContextMenu(null);
  };
  const [focusSearchOnExpand, setFocusSearchOnExpand] = useState(false);
  const globalSearchInputRef = useRef<HTMLInputElement>(null);
  // Auto-collapse tracks the window narrowing below `narrowViewportThreshold`
  // separately from the manual `sidebarCollapsed` preference (issue 01), so
  // width-driven collapsing never overwrites the user's persisted choice.
  // `narrowOverride` remembers that the user manually re-expanded the
  // sidebar during the current narrow session; it resets the moment the
  // viewport crosses back into "narrow" from "wide" so the next narrow
  // crossing auto-collapses again.
  const [isNarrowViewport, setIsNarrowViewport] = useState(
    () => typeof window !== "undefined" && window.innerWidth < narrowViewportThreshold,
  );
  const [narrowOverride, setNarrowOverride] = useState(false);
  const wasNarrowViewportRef = useRef(isNarrowViewport);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleResize = () => {
      const nowNarrow = window.innerWidth < narrowViewportThreshold;
      if (nowNarrow && !wasNarrowViewportRef.current) {
        setNarrowOverride(false);
      }
      wasNarrowViewportRef.current = nowNarrow;
      setIsNarrowViewport(nowNarrow);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const effectiveSidebarCollapsed = sidebarCollapsed || (isNarrowViewport && !narrowOverride);
  const handleToggleSidebarCollapse = () => {
    if (effectiveSidebarCollapsed) {
      // Expanding: keep it expanded for the rest of this narrow session.
      if (isNarrowViewport) {
        setNarrowOverride(true);
      }
      if (sidebarCollapsed) {
        onToggleSidebarCollapse();
      }
    } else {
      // Collapsing: start a fresh (non-overridden) session and flip the
      // manual preference only if it wasn't already the reason we're expanded.
      setNarrowOverride(false);
      if (!sidebarCollapsed) {
        onToggleSidebarCollapse();
      }
    }
  };
  const hasSelection = activeNotePath !== null || activeFolderPath !== "";
  const hasOpenWorkspace = canManageWorkspace;
  const hasNotes = workspaceTreeHasNotes(workspaceTree);
  const nextTheme = themeMode === "light" ? "dark" : "light";
  // Themes cycle in declaration order so one command/shortcut reaches every
  // Theme without needing a submenu; the Settings pane still offers direct picks.
  const nextAppTheme = themes[(themes.indexOf(theme) + 1) % themes.length] ?? theme;
  const uiZoomIndex = uiZoomSteps.indexOf(uiZoom);
  const nextUiZoomIn = uiZoomSteps[Math.min(uiZoomSteps.length - 1, uiZoomIndex + 1)] ?? uiZoom;
  const nextUiZoomOut = uiZoomSteps[Math.max(0, uiZoomIndex - 1)] ?? uiZoom;
  const editorFontSizeIndex = editorFontSizeSteps.indexOf(editorFontSize);
  const nextEditorFontSizeIn =
    editorFontSizeSteps[Math.min(editorFontSizeSteps.length - 1, editorFontSizeIndex + 1)] ?? editorFontSize;
  const nextEditorFontSizeOut = editorFontSizeSteps[Math.max(0, editorFontSizeIndex - 1)] ?? editorFontSize;
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
        id: "recent-notes", label: "Recientes", shortcut: "", available: true, run: onOpenRecentNotes,
      },
      {
        id: "settings",
        label: "Settings",
        shortcut: "Ctrl/Cmd+3",
        available: activeRoute !== "settings",
        run: openSettings,
      },
      {
        id: "theme",
        label: `Switch to ${nextTheme} appearance`,
        shortcut: "Ctrl/Cmd+Shift+T",
        available: true,
        run: () => onThemeChange(nextTheme),
      },
      {
        id: "app-theme",
        label: `Switch Theme to ${themeLabels[nextAppTheme]}`,
        shortcut: "",
        available: themes.length > 1,
        run: () => onAppThemeChange(nextAppTheme),
      },
      {
        id: "zoom-in",
        label: `Zoom in (${nextUiZoomIn}%)`,
        shortcut: "Ctrl/Cmd++",
        available: uiZoom < uiZoomSteps[uiZoomSteps.length - 1],
        run: () => onUiZoomChange(nextUiZoomIn),
      },
      {
        id: "zoom-out",
        label: `Zoom out (${nextUiZoomOut}%)`,
        shortcut: "Ctrl/Cmd+-",
        available: uiZoom > uiZoomSteps[0],
        run: () => onUiZoomChange(nextUiZoomOut),
      },
      {
        id: "zoom-reset",
        label: "Reset zoom to 100%",
        shortcut: "Ctrl/Cmd+0",
        available: uiZoom !== defaultUiZoom,
        run: () => onUiZoomChange(defaultUiZoom),
      },
      {
        id: "editor-font-size-in",
        label: `Increase editor font size (${nextEditorFontSizeIn}px)`,
        shortcut: "Ctrl/Cmd+Shift++",
        available: editorFontSize < editorFontSizeSteps[editorFontSizeSteps.length - 1],
        run: () => onEditorFontSizeChange(nextEditorFontSizeIn),
      },
      {
        id: "editor-font-size-out",
        label: `Decrease editor font size (${nextEditorFontSizeOut}px)`,
        shortcut: "Ctrl/Cmd+Shift+-",
        available: editorFontSize > editorFontSizeSteps[0],
        run: () => onEditorFontSizeChange(nextEditorFontSizeOut),
      },
      {
        id: "editor-font-size-reset",
        label: `Reset editor font size to ${defaultEditorFontSize}px`,
        shortcut: "Ctrl/Cmd+Shift+0",
        available: editorFontSize !== defaultEditorFontSize,
        run: () => onEditorFontSizeChange(defaultEditorFontSize),
      },
      {
        id: "command-help",
        label: "Command Help",
        shortcut: "Ctrl/Cmd+/",
        available: true,
        run: () => setIsCommandHelpOpen(true),
      },
      {
        id: "toggle-sidebar",
        label: effectiveSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar",
        shortcut: "Ctrl/Cmd+B",
        available: true,
        run: handleToggleSidebarCollapse,
      },
      ...workspaceNotePaths(workspaceTree).map((notePath) => ({
        id: `open-note:${notePath}`,
        label: `Open note: ${notePath}`,
        shortcut: "",
        available: true,
        run: () => onNavigateToNote(notePath),
      })),
    ],
    [
      activeNotePath,
      activeRoute,
      canManageWorkspace,
      hasSelection,
      nextTheme,
      nextAppTheme,
      nextUiZoomIn,
      nextUiZoomOut,
      nextEditorFontSizeIn,
      nextEditorFontSizeOut,
      onCreateFolder,
      onCreateNote,
      onMoveActiveNote,
      onOpenWorkspace,
      onOpenRecentNotes,
      onNavigateToNote,
      onRenameSelection,
      onRouteChange,
      onSyncWorkspace,
      onThemeChange,
      onAppThemeChange,
      onUiZoomChange,
      onEditorFontSizeChange,
      uiZoom,
      editorFontSize,
      handleToggleSidebarCollapse,
      effectiveSidebarCollapsed,
      onToggleSidebarCollapse,
      sidebarCollapsed,
      workspaceTree,
    ],
  );
  const availableCommands = commands.filter((command) => command.available);

  useEffect(() => {
    setActiveFileMatchIndex(0);
  }, [activeNotePath, fileSearchQuery]);

  useEffect(() => {
    if (!effectiveSidebarCollapsed && focusSearchOnExpand) {
      globalSearchInputRef.current?.focus();
      setFocusSearchOnExpand(false);
    }
  }, [effectiveSidebarCollapsed, focusSearchOnExpand]);

  useEffect(() => {
    if (isFileSearchOpen) {
      const input = fileSearchInputRef.current;
      input?.focus();
      input?.select();
    }
  }, [isFileSearchOpen]);

  useEffect(() => {
    if (isGlobalSearchOpen) {
      const input = globalSearchInputRef.current;
      input?.focus();
      input?.select();
    }
  }, [isGlobalSearchOpen]);

  useEffect(() => {
    if (!activeNotePath) {
      setIsFileSearchOpen(false);
    }
  }, [activeNotePath]);

  useEffect(() => {
    if (!treeContextMenu) {
      return;
    }

    const closeMenu = () => setTreeContextMenu(null);
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeTreeItemMenu(true);
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
      if (event.key === "Escape" && treeDragSourceRef.current) finishTreeDrag();
      if (activeRoute === "settings") return;
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

      if (hasCommandModifier && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        if (sidebarCollapsed) {
          setFocusSearchOnExpand(true);
          onToggleSidebarCollapse();
        }
        setIsGlobalSearchOpen(true);
        return;
      }

      if (hasCommandModifier && event.key.toLowerCase() === "f") {
        if (activeNotePath) {
          event.preventDefault();
          setIsFileSearchOpen(true);
        }
        return;
      }

      if (hasCommandModifier && event.key.toLowerCase() === "m") {
        if (runAvailableCommand("move-note")) {
          event.preventDefault();
        }
        return;
      }

      if (hasCommandModifier && event.key.toLowerCase() === "b") {
        if (runAvailableCommand("toggle-sidebar")) {
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

      // Editor font size shortcuts add Shift to UI zoom's combo, so they must
      // be checked before the plain zoom branches below: Shift+= also
      // produces event.key === "+", which the plain zoom-in check would
      // otherwise swallow.
      if (hasCommandModifier && event.shiftKey && (event.key === "=" || event.key === "+")) {
        if (runAvailableCommand("editor-font-size-in")) {
          event.preventDefault();
        }
        return;
      }

      if (hasCommandModifier && event.shiftKey && event.key === "-") {
        if (runAvailableCommand("editor-font-size-out")) {
          event.preventDefault();
        }
        return;
      }

      if (hasCommandModifier && event.shiftKey && event.key === "0") {
        if (runAvailableCommand("editor-font-size-reset")) {
          event.preventDefault();
        }
        return;
      }

      if (hasCommandModifier && (event.key === "=" || event.key === "+")) {
        if (runAvailableCommand("zoom-in")) {
          event.preventDefault();
        }
        return;
      }

      if (hasCommandModifier && event.key === "-") {
        if (runAvailableCommand("zoom-out")) {
          event.preventDefault();
        }
        return;
      }

      if (hasCommandModifier && event.key === "0") {
        if (runAvailableCommand("zoom-reset")) {
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
        if (isFileSearchOpen) {
          setIsFileSearchOpen(false);
          const editorElement = editorContainerRef.current?.querySelector<HTMLElement>(".cm-content");
          editorElement?.focus();
        }
        if (isGlobalSearchOpen) {
          setIsGlobalSearchOpen(false);
          const editorElement = editorContainerRef.current?.querySelector<HTMLElement>(".cm-content");
          editorElement?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [availableCommands, isFileSearchOpen, isGlobalSearchOpen, sidebarCollapsed, onToggleSidebarCollapse]);

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
    <div
      className="app-shell"
      data-theme={theme}
      data-mode={themeMode}
      data-sidebar={effectiveSidebarCollapsed ? "collapsed" : "expanded"}
      style={{ "--ui-zoom": uiZoom / 100 } as CSSProperties}
    >
      <TitleBar
        platform={platform}
        isMaximized={isWindowMaximized}
        onMinimize={onMinimizeWindow}
        onToggleMaximize={onToggleMaximizeWindow}
        onClose={onCloseWindow}
      />
      <aside
        className={effectiveSidebarCollapsed ? "sidebar sidebar--collapsed" : "sidebar"}
        aria-label="Workspace tree"
      >
        {effectiveSidebarCollapsed ? (
          <div className="sidebar-rail" aria-label="Collapsed sidebar">
            <button type="button" title="Open Workspace" aria-label="Open Workspace" onClick={onOpenWorkspace}>
              <Icon name="folder" size={18} />
            </button>
            <button
              type="button"
              title="Global Search"
              aria-label="Focus Global Search"
              onClick={() => {
                setFocusSearchOnExpand(true);
                setIsGlobalSearchOpen(true);
                handleToggleSidebarCollapse();
              }}
            >
              <Icon name="search" size={18} />
            </button>
            <button type="button" ref={settingsTriggerRef} aria-label="Settings" title="Settings" aria-haspopup="dialog" onClick={openSettings}><Icon name="settings" size={18} /></button>
            <button
              type="button"
              title="Expand sidebar"
              aria-label="Expand sidebar"
              className="sidebar-rail__expand"
              onClick={handleToggleSidebarCollapse}
            >
              <Icon name="chevron-right" size={18} />
            </button>
          </div>
        ) : (
          <>
            <header className="sidebar__header">
              <div className="workspace-summary">
                <button
                  type="button"
                  className="workspace-trigger"
                  ref={workspaceTriggerRef}
                  aria-label={workspaceName === "Abrir carpeta" ? "Abrir carpeta" : `${workspaceName} — Abrir o cambiar…`}
                  aria-haspopup="menu"
                  aria-expanded={isWorkspaceMenuOpen}
                  onClick={() => isWorkspaceMenuOpen ? closeWorkspaceMenu() : setIsWorkspaceMenuOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                      event.preventDefault();
                      setIsWorkspaceMenuOpen(true);
                    }
                  }}
                >
                  <span className="workspace-trigger__text">
                    <strong>{workspaceName}</strong>
                    {workspacePath ? <small title={workspacePath}>{workspacePath}</small> : null}
                    <span className="workspace-trigger__action">Abrir o cambiar…</span>
                  </span>
                  <Icon name="chevron-down" />
                </button>
                {isWorkspaceMenuOpen ? (
                  <WorkspaceMenu
                    recentWorkspaces={recentWorkspaces}
                    onSelectRecent={(workspacePath) => {
                      closeWorkspaceMenu();
                      onOpenRecentWorkspace(workspacePath);
                    }}
                    onOpenWorkspace={() => {
                      closeWorkspaceMenu();
                      onOpenWorkspace();
                    }}
                    onClone={() => {
                      closeWorkspaceMenu();
                      onCloneGitHubRepository();
                    }}
                    onClose={closeWorkspaceMenu}
                    onRecentNotes={() => { closeWorkspaceMenu(); onOpenRecentNotes(); }}
                  />
                ) : null}
              </div>
              <div className="tree-controls">
                <div className="tree-controls__creation" aria-label="Workspace actions">
                  <TreeTooltip text="Nueva nota"><button type="button" className="tree-controls__icon-button" aria-label="New note" onClick={() => onCreateNote()} disabled={!canManageWorkspace}><Icon name="note-plus" /></button></TreeTooltip>
                  <TreeTooltip text="Nueva carpeta"><button type="button" className="tree-controls__icon-button" aria-label="New folder" onClick={() => onCreateFolder()} disabled={!canManageWorkspace}><Icon name="folder-plus" /></button></TreeTooltip>
                  <TreeTooltip text="Papelera"><button type="button" role="tab" aria-selected={activeRoute === "trash"} aria-label="Trash" className={activeRoute === "trash" ? "sidebar-tab sidebar-tab--active" : "sidebar-tab"} onClick={() => onRouteChange(activeRoute === "trash" ? "workspace" : "trash")} disabled={!canManageWorkspace}><Icon name="trash" /></button></TreeTooltip>
                </div>
                <div className="tree-controls__view">
                  <TreeTooltip text={treeMode === "accordion" ? "Modo acordeón: abrir una carpeta cierra sus hermanas. Cambiar a modo libre." : "Modo libre: abrir una carpeta conserva las demás abiertas. Cambiar a acordeón."}><button type="button" className="tree-controls__icon-button" aria-label="Workspace Tree Mode" aria-pressed={treeMode === "accordion"} onClick={() => onTreeModeChange(treeMode === "accordion" ? "free" : "accordion")} disabled={!canManageWorkspace}><Icon name="tree-mode" size={16} /></button></TreeTooltip>
                  <TreeTooltip text="Enfocar nota activa: cerrar otras carpetas y mostrar la ruta de la nota activa."><button type="button" className="tree-controls__icon-button" aria-label="Focus Active Note" onClick={onFocusActiveNote} disabled={activeNotePath === null}><Icon name="target" size={16} /></button></TreeTooltip>
                  <TreeTooltip text="Configuración"><button type="button" ref={settingsTriggerRef} aria-haspopup="dialog" aria-expanded={activeRoute === "settings"} aria-label="Settings" className="sidebar-tab" onClick={openSettings}><Icon name="settings" /></button></TreeTooltip>
                  <TreeTooltip text="Cerrar barra lateral"><button type="button" className="sidebar-tab" aria-label="Collapse sidebar" onClick={handleToggleSidebarCollapse}><Icon name="chevron-left" size={16} /></button></TreeTooltip>
                </div>
              </div>
            </header>

            {workspaceError ? <p className="workspace-error">{workspaceError}</p> : null}

            {activeRoute === "trash" ? (
              <section key="trash" className="sidebar-panel trash-panel" aria-label="Trash items">
                <h2>Trash</h2>
                {trashEntries.length === 0 ? <p>Trash is empty.</p> : (
                  <ol>
                    {trashEntries.map((entry) => (
                      <li key={entry.id}>
                        <span>{entry.originalRelativePath}</span>
                        <small>{new Date(entry.deletedAt).toLocaleString()}</small>
                        <button type="button" onClick={() => onRestoreTrashItem(entry.id)}>
                          Restore
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ) : activeRoute === "sync" ? (
              <section key="sync" className="sidebar-panel" aria-label="Sync workspace">
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
                  onOpenSettings={openSettings}
                />
              </section>
            ) : (
              <>
                {isGlobalSearchOpen ? (
                  <div className="global-search" role="search" aria-label="Global Search">
                    <label className="global-search__field">
                      <Icon name="search" />
                      <input
                        ref={globalSearchInputRef}
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
                ) : null}
                {workspaceNotice ? <p className="workspace-action-notice" role="status" aria-label="Workspace action">{workspaceNotice}</p> : null}
                {treeInsertion ? <p className="tree-order-status" role="status" aria-label="Destino de orden">Soltar {treeInsertion.side === "before" ? "antes" : "después"} de {treeInsertion.name}</p> : null}
                {workspaceTree.length > 0 ? (
                  <WorkspaceTree
                    items={workspaceTree}
                    activeNotePath={activeNotePath}
                    activeFolderPath={activeFolderPath}
                    openFolderPaths={openFolderPaths}
                    onToggleFolder={onToggleFolder}
                    onSelectFolder={onSelectFolder}
                    onSelectNote={onSelectNote}
                    onSelectImage={setImagePreviewPath}
                    onItemContextMenu={openTreeItemMenu}
                    onTreeDragStart={startTreeDrag}
                    onTreeDragOver={hoverTreeItem}
                    onTreeDrop={dropTreeItem}
                    onTreeDragEnd={finishTreeDrag}
                    onTreeDragLeave={() => setTreeInsertion(null)}
                    insertion={treeInsertion}
                    dragEnabled={!!onSetTreeOrder && !treeOrderPending}
                  />
                ) : (
                  <p className="empty-tree">
                    {hasOpenWorkspace ? "This Workspace has no Markdown notes yet." : "Open a Workspace to show Markdown notes."}
                  </p>
                )}


              </>
            )}
          </>
        )}
      </aside>

      <main className="editor-pane" aria-label="Markdown editor area">
        {isWelcomeOpen ? <WelcomeScreen notes={recentNotes} canCreate={canManageWorkspace} onOpen={onSelectRecentNote}
          onRemove={onRemoveRecentNote} onContinue={onCloseRecentNotes} onCreate={onWelcomeCreateNote} onOpenFolder={onWelcomeOpenFolder} notice={<>{welcomeNotice}<RemoteNotice awareness={remoteAwareness} localChanges={statusLabel === "Cambios locales"} onSync={onSyncWorkspace} /></>} /> : null}
        {!isWelcomeOpen ? <RemoteNotice awareness={remoteAwareness} localChanges={statusLabel === "Cambios locales"} onSync={onSyncWorkspace} /> : null}
        <div className="editor-toolbar" inert={isWelcomeOpen || undefined} style={isWelcomeOpen ? { visibility: "hidden" } : undefined}>
          <Breadcrumb folderPath={activeFolderPath} notePath={activeNotePath} />
          {isFileSearchOpen ? (
          <div className="file-search" role="search" aria-label="Current note search">
            <input
              ref={fileSearchInputRef}
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
          ) : null}
          <div className="editor-toolbar__actions">
            <button
              type="button"
              title="Note history"
              aria-label="Open note history"
              aria-expanded={noteHistoryOpen}
              onClick={noteHistoryOpen ? onCloseNoteHistory : onOpenNoteHistory}
              disabled={!activeNotePath || !isWorkspaceGitBacked}
            >
              <Icon name="history" />
            </button>
            <button
              type="button"
              title={`Switch to ${nextTheme} appearance`}
              aria-label={`Switch to ${nextTheme} appearance`}
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

        <div className={noteHistoryOpen ? "editor-body editor-body--history" : "editor-body"} inert={isWelcomeOpen || undefined} style={isWelcomeOpen ? { visibility: "hidden" } : undefined}>
        <section className="editor-surface" aria-label="Raw Markdown editor" ref={editorContainerRef}>
          {editorError ? (
            <EditorErrorState error={editorError} notePath={activeNotePath} />
          ) : activeNotePath ? (
            <>
              {attachmentError ? (
                <p className="attachment-error" role="alert">
                  {attachmentError}
                </p>
              ) : null}
              <MarkdownEditor
                platform={platform}
                notePath={activeNotePath}
                workspacePath={workspacePath}
                value={noteContent}
                focusRequest={editorFocusRequest}
                onChange={onNoteChange}
                searchJump={currentFileSearchJump}
                onAttachmentError={onAttachmentError}
                onPreviewImage={setImagePreviewPath}
                fontSize={editorFontSize}
              />
            </>
          ) : hasOpenWorkspace && !hasNotes ? (
            <p className="empty-editor">Create a note to start writing in {workspaceName}.</p>
          ) : (
            <p className="empty-editor">Select a Markdown note to start writing.</p>
          )}
        </section>
          <NoteHistoryPanel
            noteHistoryOpen={noteHistoryOpen}
            noteHistoryEntries={noteHistoryEntries}
            selectedNoteHistoryCommitId={selectedNoteHistoryCommitId}
            noteHistoryPreview={noteHistoryPreview}
            noteHistoryLoading={noteHistoryLoading}
            noteHistoryError={noteHistoryError}
            currentContent={noteContent}
            onSelectNoteHistoryEntry={onSelectNoteHistoryEntry}
            onCloseNoteHistory={onCloseNoteHistory}
            onRestoreNoteHistoryEntry={onRestoreNoteHistoryEntry}
          />
        </div>
      </main>

      {activeRoute === "settings" ? <SettingsDialog onClose={closeSettings} returnFocusTo={settingsOriginRef.current ?? settingsTriggerRef.current}>
        <div className="settings-dialog__tabs" role="tablist" aria-label="Secciones de configuración">
          {([ ["appearance", "Apariencia"], ["editor", "Editor"], ["workspace", "Workspace"], ["sync", "Sync"] ] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={settingsTab === id} aria-controls={`settings-panel-${id}`} id={`settings-tab-${id}`} onClick={() => setSettingsTab(id)}>{label}</button>)}
        </div>
        {settingsTab === "appearance" ? <section role="tabpanel" id="settings-panel-appearance" aria-labelledby="settings-tab-appearance"><h3>Apariencia</h3>
          <label>Tema<select value={theme} onChange={(event) => onAppThemeChange(event.target.value as Theme)}>{themes.map((option) => <option key={option} value={option}>{themeLabels[option]}</option>)}</select></label>
          <p>Warm conserva sus colores y formas en claro y oscuro.</p>
          <label>Modo de apariencia<select value={themeMode} onChange={(event) => onThemeChange(event.target.value as ThemeMode)}><option value="light">Claro</option><option value="dark">Oscuro</option></select></label>
          <p>Elige la apariencia de este computador.</p>
          <label>Escala de interfaz<select value={uiZoom} onChange={(event) => onUiZoomChange(Number(event.target.value) as UiZoom)}>{uiZoomSteps.map((value) => <option key={value} value={value}>{value}%</option>)}</select></label>
          <p>Cambia el tamaño de toda la interfaz sin modificar las notas.</p>
        </section> : null}
        {settingsTab === "editor" ? <section role="tabpanel" id="settings-panel-editor" aria-labelledby="settings-tab-editor"><h3>Editor</h3>
          <label>Tamaño de letra<select value={editorFontSize} onChange={(event) => onEditorFontSizeChange(Number(event.target.value) as EditorFontSize)}>{editorFontSizeSteps.map((value) => <option key={value} value={value}>{value} px</option>)}</select></label>
          <p>Ajusta solo el texto del editor de Raw Markdown.</p>
        </section> : null}
        {settingsTab === "workspace" ? <section role="tabpanel" id="settings-panel-workspace" aria-labelledby="settings-tab-workspace"><h3>Workspace</h3>
          <label className="settings-dialog__checkbox"><input type="checkbox" checked={showWelcome} onChange={(event) => onShowWelcomeChange(event.target.checked)} />Mostrar bienvenida al iniciar</label>
          <p>La bienvenida y Recientes se guardan solo en este computador.</p>
          <p className="settings-dialog__path">{workspacePath ?? "Abre una carpeta para configurar su árbol."}</p>
          <label>Workspace Tree Mode<select value={treeMode} disabled={!canManageWorkspace} onChange={(event) => onTreeModeChange(event.target.value as TreeMode)}><option value="free">Free Tree Mode</option><option value="accordion">Accordion Tree Mode</option></select></label>
          <p>Free mantiene abiertas otras carpetas; Accordion cierra las carpetas hermanas al abrir una.</p>
        </section> : null}
        {settingsTab === "sync" ? <section role="tabpanel" id="settings-panel-sync" aria-labelledby="settings-tab-sync"><h3>Sync</h3>
          <p>Sync usa las credenciales Git del sistema. La conexión GitHub de abajo es opcional.</p>
          <SyncWorkspacePanel canManageWorkspace={canManageWorkspace} statusLabel={statusLabel} workspaceName={workspaceName}
            onSyncWorkspace={onSyncWorkspace} githubRemote={githubRemote} advancedGit={advancedGit} syncEvents={syncEvents}
            githubAuth={githubAuth} onRefreshAdvancedGit={onRefreshAdvancedGit}
            onConnectGitHubRemote={() => { closeSettings(); onConnectGitHubRemote(); }}
            conflictedFiles={[]} onResolveConflict={onResolveConflict} onEditConflictManually={onEditConflictManually}
            showConfiguration />
          <GitHubAuthenticationPanel githubAuth={githubAuth} onBeginDeviceFlow={onBeginGitHubDeviceFlow}
            onCheckDeviceFlow={onCheckGitHubDeviceFlow} onStorePersonalAccessToken={onStoreGitHubPersonalAccessToken} onDisconnect={onDisconnectGitHub} />
        </section> : null}
      </SettingsDialog> : null}

      <footer className="status-bar" aria-label="Workspace status">
        <span>{statusLabel}</span>
        {conflictedFiles.length > 0 ? <button type="button" className="remote-sync-control" onClick={() => onRouteChange("sync")}>Resolver conflictos</button> : null}
        {remoteAwareness ? (
          <RemoteSyncControl awareness={remoteAwareness} localChanges={statusLabel === "Cambios locales"} syncing={statusLabel === "Sincronizando"} onSync={onSyncWorkspace} onRetry={onCheckRemote} />
        ) : null}
        {updateNotice ? (
          <span className="update-notice" role="status">
            {updateNotice.kind === "downloading" ? (
              "Downloading update…"
            ) : updateNotice.kind === "update-ready" ? (
              <>
                Update ready{updateNotice.version ? ` (v${updateNotice.version})` : ""} — restart to install.{" "}
                <button type="button" onClick={onInstallAndRestart}>
                  Install &amp; Restart
                </button>
              </>
            ) : (
              <>
                Update available{updateNotice.version ? ` (v${updateNotice.version})` : ""}.{" "}
                <a href={releasePageUrl} target="_blank" rel="noreferrer">
                  View Release
                </a>
              </>
            )}
          </span>
        ) : null}
        <span>Escritorio</span>
      </footer>
      {isCommandPaletteOpen ? (
        <CommandPalette commands={availableCommands} onRunCommand={runCommand} onClose={() => setIsCommandPaletteOpen(false)} />
      ) : null}
      {isCommandHelpOpen ? (
        <CommandHelp commands={availableCommands} onClose={() => setIsCommandHelpOpen(false)} />
      ) : null}
      {workspacePath && imagePreviewPath ? <ImagePreviewDialog key={`${workspacePath}:${imagePreviewPath}`} workspacePath={workspacePath} imagePath={imagePreviewPath} onClose={() => setImagePreviewPath(null)} /> : null}
      {dialog ? <AppDialog dialog={dialog} onSubmit={onDialogSubmit} onCancel={onDialogCancel} /> : null}
      {closeSyncPrompt ? (
        <CloseSyncPromptDialog
          state={closeSyncPrompt}
          onWaitForSync={onWaitForSyncBeforeClose}
          onCloseWithoutSync={onCloseWithoutSync}
        />
      ) : null}
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
          onClose={() => closeTreeItemMenu(true)}
          onCreateNote={treeContextMenu.target.kind === "folder" ? () => { onCreateNote(treeContextMenu.target.path); closeTreeItemMenu(); } : undefined}
          onCreateFolder={treeContextMenu.target.kind === "folder" ? () => { onCreateFolder(treeContextMenu.target.path); closeTreeItemMenu(); } : undefined}
          onRenameSelection={() => { onRenameSelection(treeContextMenu.target); closeTreeItemMenu(); }}
          onMoveActiveNote={() => { onMoveActiveNote(treeContextMenu.target); closeTreeItemMenu(); }}
          onDeleteSelection={() => { onDeleteSelection(treeContextMenu.target); closeTreeItemMenu(); }}
          siblings={treeSiblings(workspaceTree, treeContextMenu.target.path)}
          targetPath={treeContextMenu.target.path}
          orderPending={treeOrderPending}
          onSetOrder={onSetTreeOrder ? (orderedPaths) => {
            const parentPath = treeContextMenu.target.path.split("/").slice(0, -1).join("/");
            onSetTreeOrder(parentPath, orderedPaths);
            closeTreeItemMenu(true);
          } : undefined}
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

function CloseSyncPromptDialog({
  state,
  onWaitForSync,
  onCloseWithoutSync,
}: {
  state: CloseSyncPromptState;
  onWaitForSync: () => void;
  onCloseWithoutSync: () => void;
}) {
  return (
    <div className="dialog-overlay" role="presentation">
      <div
        className="command-popover app-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label="Cerrar con Sync pendiente"
      >
        {state.kind === "choice" ? (
          <>
            <p className="app-dialog__title">Hay cambios sin sincronizar. ¿Esperar a que termine Sync antes de cerrar?</p>
            <div className="app-dialog__actions">
              <button type="button" onClick={onCloseWithoutSync}>
                Cerrar sin sincronizar
              </button>
              <button type="button" className="app-dialog__confirm" onClick={onWaitForSync}>
                Esperar a Sync
              </button>
            </div>
          </>
        ) : null}
        {state.kind === "waiting" ? (
          <>
            <p className="app-dialog__title">Sincronizando antes de cerrar…</p>
            <div className="app-dialog__actions">
              <button type="button" onClick={onCloseWithoutSync}>
                Cerrar sin sincronizar
              </button>
            </div>
          </>
        ) : null}
        {state.kind === "error" ? (
          <>
            <p className="app-dialog__title">{state.message}</p>
            <div className="app-dialog__actions">
              <button type="button" className="app-dialog__confirm" onClick={onCloseWithoutSync}>
                Cerrar sin sincronizar
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function treeSiblings(items: WorkspaceTreeItem[], path: string): WorkspaceTreeItem[] {
  if (items.some((item) => item.path === path)) return items;
  for (const item of items) {
    if (item.kind === "folder") {
      const siblings = treeSiblings(item.children, path);
      if (siblings.length) return siblings;
    }
  }
  return [];
}

function TreeContextMenu({ x, y, onClose, onCreateNote, onCreateFolder, onRenameSelection, onMoveActiveNote, onDeleteSelection, siblings, targetPath, onSetOrder, orderPending }: {
  x: number;
  y: number;
  onClose: () => void;
  onCreateNote?: () => void;
  onCreateFolder?: () => void;
  onRenameSelection: () => void;
  onMoveActiveNote: () => void;
  onDeleteSelection: () => void;
  siblings: WorkspaceTreeItem[];
  targetPath: string;
  onSetOrder?: (orderedPaths: string[] | null) => void;
  orderPending: boolean;
}) {
  const index = siblings.findIndex((item) => item.path === targetPath);
  const move = (direction: -1 | 1) => {
    const paths = siblings.map((item) => item.path);
    [paths[index], paths[index + direction]] = [paths[index + direction], paths[index]];
    onSetOrder?.(paths);
  };
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => { menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus(); }, []);
  return (
    <div ref={menuRef} className="context-menu" role="menu" aria-label="Acciones del elemento"
      style={{ left: `min(${x}px, calc(100vw - 14rem))`, top: `min(${y}px, calc(100vh - 10rem))` }}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 :
            (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
          buttons[next]?.focus();
        } else if (event.key === "Escape" || event.key === "Tab") {
          event.preventDefault(); event.stopPropagation(); onClose();
        }
      }}>
      {onCreateNote ? <button type="button" role="menuitem" onClick={onCreateNote}><Icon name="note-plus" size={14} />Nueva nota</button> : null}
      {onCreateFolder ? <button type="button" role="menuitem" onClick={onCreateFolder}><Icon name="folder-plus" size={14} />Nueva carpeta</button> : null}
      <button type="button" role="menuitem" onClick={onRenameSelection}><Icon name="rename" size={14} />Renombrar</button>
      <button type="button" role="menuitem" onClick={onMoveActiveNote}><Icon name="move" size={14} />Mover</button>
      <button type="button" role="menuitem" className="context-menu__danger" onClick={onDeleteSelection}><Icon name="trash" size={14} />Eliminar</button>
      {onSetOrder ? <>
        <button type="button" role="menuitem" disabled={orderPending || index <= 0} onClick={() => move(-1)}><Icon name="arrow-up" size={14} />Subir</button>
        <button type="button" role="menuitem" disabled={orderPending || index < 0 || index >= siblings.length - 1} onClick={() => move(1)}><Icon name="arrow-down" size={14} />Bajar</button>
        <button type="button" role="menuitem" disabled={orderPending} onClick={() => onSetOrder(null)}><Icon name="tree-mode" size={14} />Restablecer orden alfabético</button>
      </> : null}
    </div>
  );
}

function TreeTooltip({ text, children }: { text: string; children: ReactElement<{ "aria-describedby"?: string }> }) {
  const id = useId();
  return <span className="tree-tooltip">
    {cloneElement(children, { "aria-describedby": id })}<span id={id} role="tooltip" className="tree-tooltip__content">{text}</span>
  </span>;
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

function WorkspaceMenu({ recentWorkspaces, onSelectRecent, onOpenWorkspace, onClone, onClose, onRecentNotes }: {
  recentWorkspaces: Array<{ name: string; path: string }>;
  onSelectRecent: (workspacePath: string) => void;
  onOpenWorkspace: () => void;
  onClone: () => void;
  onClose: () => void;
  onRecentNotes: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => { menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus(); }, []);
  return (
    <div ref={menuRef} className="command-popover workspace-menu" role="menu" aria-label="Workspace menu"
      onKeyDown={(event) => {
        if (event.key === "Escape" || event.key === "Tab") {
          if (event.key === "Escape") event.preventDefault();
          event.stopPropagation();
          onClose();
          return;
        }
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
        const index = items.indexOf(document.activeElement as HTMLElement);
        let next: number;
        if (event.key === "ArrowDown") next = (index + 1) % items.length;
        else if (event.key === "ArrowUp") next = (index - 1 + items.length) % items.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = items.length - 1;
        else return;
        event.preventDefault();
        items[next]?.focus();
      }}>
      <div className="command-popover__header">
        <h2>Workspaces</h2>
        <button type="button" className="command-popover__close" aria-label="Close Workspace menu" onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
      </div>
      <button type="button" role="menuitem" className="workspace-menu__open" onClick={onOpenWorkspace}>
        <Icon name="folder" />Abrir carpeta
      </button>
      <button type="button" role="menuitem" className="workspace-menu__open" onClick={onRecentNotes}>Recientes</button>
      {recentWorkspaces.length > 0 ? (
        <div className="recent-workspaces" aria-label="Recent Workspaces">
          {recentWorkspaces.map((workspace) => (
            <button key={workspace.path} type="button" role="menuitem" aria-label={workspace.path}
              title={workspace.path} onClick={() => onSelectRecent(workspace.path)}>
              <span>{workspace.name}</span><small>{workspace.path}</small>
            </button>
          ))}
        </div>
      ) : null}
      <button type="button" role="menuitem" className="workspace-clone-link" onClick={onClone}>
        <Icon name="git-branch" />Clonar desde GitHub
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
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const aliases: Record<string, string> = {
    "open-workspace": "abrir carpeta espacio trabajo", "new-folder": "nueva carpeta", "new-note": "nueva nota",
    rename: "renombrar cambiar nombre", "move-note": "mover nota", "sync-workspace": "sincronizar ahora",
    workspace: "volver notas", sync: "sincronización sincronizar", settings: "configuración ajustes",
    theme: "tema apariencia claro oscuro", "zoom-in": "aumentar escala", "zoom-out": "reducir escala",
    "zoom-reset": "restablecer escala", "editor-font-size-in": "aumentar tamaño letra editor",
    "editor-font-size-out": "reducir tamaño letra editor", "editor-font-size-reset": "restablecer tamaño letra editor",
    "command-help": "ayuda comandos", "toggle-sidebar": "abrir cerrar barra lateral",
  };
  const filtered = commands.filter((command) => normalize(`${command.label} ${command.shortcut} ${aliases[command.id] ?? ""}`).includes(normalize(query.trim())));
  return (
    <div className="dialog-overlay" role="presentation" onClick={onClose}>
      <div className="command-popover command-palette" role="dialog" aria-modal="true" aria-labelledby="command-palette-title" onClick={(event) => event.stopPropagation()}>
        <div className="command-popover__header">
          <h2 id="command-palette-title">Command Palette</h2>
          <button type="button" className="command-popover__close" aria-label="Close Command Palette" onClick={onClose}><Icon name="close" size={16} />          </button>
        </div>
        <input className="command-palette__search" type="search" aria-label="Buscar comandos" placeholder="Buscar comandos..." autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setSelected(0); }} onKeyDown={(event) => { if (event.key === "ArrowDown" && filtered.length) { event.preventDefault(); setSelected((selected + 1) % filtered.length); } if (event.key === "ArrowUp" && filtered.length) { event.preventDefault(); setSelected((selected + filtered.length - 1) % filtered.length); } if (event.key === "Enter" && filtered[selected]) { event.preventDefault(); onRunCommand(filtered[selected]); } }} />
        <div className="command-list">
          {filtered.length === 0 ? <p>No hay comandos que coincidan.</p> : null}
          {filtered.map((command, index) => (
            <button key={command.id} type="button" className={index === selected ? "command-palette__selected" : undefined} aria-label={command.label} onClick={() => onRunCommand(command)}>
              <span>{command.label}</span>
              <kbd>{command.shortcut}</kbd>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CommandHelp({ commands, onClose }: { commands: ShellCommand[]; onClose: () => void }) {
  return (
    <aside className="command-popover command-help" role="dialog" aria-modal="false" aria-labelledby="command-help-title">
      <div className="command-popover__header">
        <h2 id="command-help-title">Command Help</h2>
        <button type="button" className="command-popover__close" aria-label="Close Command Help" onClick={onClose}>
          <Icon name="close" size={16} />
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
  showConfiguration = false,
  onOpenSettings,
}: {
  showConfiguration?: boolean;
  onOpenSettings?: () => void;
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
      {showConfiguration ? (githubRemote ? (
        <div>
          <span>GitHub remote</span>
          <strong>{githubRemote.url}</strong>
        </div>
      ) : (
        <button type="button" onClick={onConnectGitHubRemote} disabled={!canManageWorkspace}>
          Conectar remoto GitHub
        </button>
      )) : null}
      <button
        type="button"
        onClick={onSyncWorkspace}
        disabled={!canManageWorkspace || statusLabel === "Sincronizando" || statusLabel === "Necesita resolver conflicto"}
      >
        Sync now
      </button>
      {conflictedFiles.length > 0 ? (
        <div className="sync-conflicts" role="region" aria-label="Sync conflicts">
          <span>Sync conflicts</span>
          <ul>
            {conflictedFiles.map((notePath) => (
              <li key={notePath}>
                <strong>{notePath}</strong>
                {notePath === sharedWorkspaceMetadataPath ? <p>Manual Tree Order · organización compartida del Workspace</p> : null}
                <div>
                  <button type="button" onClick={() => onResolveConflict(notePath, "local")}>Use local</button>
                  <button type="button" onClick={() => onResolveConflict(notePath, "remote")}>Use remote</button>
                  {notePath !== sharedWorkspaceMetadataPath ? <>
                    <button type="button" onClick={() => onEditConflictManually(notePath)}>Edit manually</button>
                    <button type="button" onClick={() => onResolveConflict(notePath, "manual")}>Mark manual resolution</button>
                  </> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {showConfiguration ? <details
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
      </details> : null}
    </div>
  );
}

function TitleBar({
  platform,
  isMaximized,
  onMinimize,
  onToggleMaximize,
  onClose,
}: {
  platform: Platform;
  isMaximized: boolean;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
}) {
  return (
    <header className="titlebar" data-platform={platform}>
      {/* data-tauri-drag-region lives on the title and this spacer, not on
          the header itself: on macOS the header's own padding-left reserves
          space for the native traffic lights (titleBarStyle: "Overlay", ADR
          0014), and a drag region covering that space swallows the click
          before the native close/minimize/maximize buttons see it. Keeping
          the attribute off the header keeps that strip plain background. */}
      <span className="titlebar__title" data-tauri-drag-region>
        Simpler
      </span>
      <div className="titlebar__drag-spacer" data-tauri-drag-region />
      {/* On macOS the native traffic lights (titleBarStyle: "Overlay", ADR 0014)
          do this job; these buttons are hidden via [data-platform="macos"] in
          styles.css rather than not rendered, so the drag region layout stays
          the same shape on both platforms. */}
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

function activeNoteAncestorFolderPaths(activeNotePath: string | null): ReadonlySet<string> {
  if (!activeNotePath) {
    return new Set();
  }
  const segments = activeNotePath.split("/").slice(0, -1);
  const paths = new Set<string>();
  let cumulative = "";
  for (const segment of segments) {
    cumulative = cumulative ? `${cumulative}/${segment}` : segment;
    paths.add(cumulative);
  }
  return paths;
}

// Matches the `.note-tree__folder-children` CSS grid-rows transition
// duration in styles.css, so a collapsed subtree stays mounted just long
// enough for the collapse animation to finish before it's removed from the DOM.
const FOLDER_COLLAPSE_TRANSITION_MS = 180;

/**
 * Lazily mounts a folder's descendant DOM nodes on expand, and unmounts them
 * after the collapse transition finishes — rather than mounting everything
 * up front and hiding collapsed subtrees via `inert`/`aria-hidden`, so a
 * large Workspace doesn't pay DOM cost for content the user can't see.
 * Still preserves the existing grid-rows collapse/expand transition: a
 * newly-mounted subtree paints one frame at the collapsed row size before
 * switching to the open size, so expanding animates in instead of popping open.
 */
function CollapsibleFolderChildren({ isOpen, children }: { isOpen: boolean; children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isAnimatingOpen, setIsAnimatingOpen] = useState(isOpen);
  const collapseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A layout effect (rather than a passive effect) so a newly-expanded
  // folder mounts synchronously within the same commit — tests and
  // synchronous callers that read the DOM right after triggering an
  // expand (e.g. revealing a note from Global Search) must not need to
  // wait an extra tick for a deferred passive-effect flush.
  useLayoutEffect(() => {
    if (isOpen) {
      if (collapseTimeoutRef.current !== null) {
        clearTimeout(collapseTimeoutRef.current);
        collapseTimeoutRef.current = null;
      }
      setIsMounted(true);
      const frame = requestAnimationFrame(() => setIsAnimatingOpen(true));
      return () => cancelAnimationFrame(frame);
    }

    setIsAnimatingOpen(false);
    collapseTimeoutRef.current = setTimeout(() => {
      collapseTimeoutRef.current = null;
      setIsMounted(false);
    }, FOLDER_COLLAPSE_TRANSITION_MS);

    return () => {
      if (collapseTimeoutRef.current !== null) {
        clearTimeout(collapseTimeoutRef.current);
        collapseTimeoutRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isMounted) {
    return null;
  }

  return (
    <div
      className={
        isAnimatingOpen
          ? "note-tree__folder-children note-tree__folder-children--open"
          : "note-tree__folder-children"
      }
      aria-hidden={!isOpen}
      // Keeps an in-transition folder's descendants out of tab order and the
      // a11y tree while still letting the CSS grid-rows transition animate them.
      inert={!isOpen || undefined}
    >
      <div className="note-tree__folder-children-inner">{children}</div>
    </div>
  );
}

function WorkspaceTree({
  items,
  activeNotePath,
  activeFolderPath,
  openFolderPaths,
  onToggleFolder,
  onSelectFolder,
  onSelectNote,
  onSelectImage,
  onItemContextMenu,
  onTreeDragStart,
  onTreeDragOver,
  onTreeDrop,
  onTreeDragEnd,
  onTreeDragLeave,
  insertion,
  dragEnabled,
}: {
  items: WorkspaceTreeItem[];
  activeNotePath: string | null;
  activeFolderPath: string;
  openFolderPaths: ReadonlySet<string>;
  onToggleFolder: (folderPath: string) => void;
  onSelectFolder: (folderPath: string) => void;
  onSelectNote: (notePath: string) => void;
  onSelectImage: (imagePath: string) => void;
  onItemContextMenu: (event: MouseEvent | ReactKeyboardEvent, kind: WorkspaceTreeItem["kind"], path: string) => void;
  onTreeDragStart: (event: DragEvent, path: string) => void;
  onTreeDragOver: (event: DragEvent, item: WorkspaceTreeItem) => void;
  onTreeDrop: (event: DragEvent, item: WorkspaceTreeItem) => void;
  onTreeDragEnd: () => void;
  onTreeDragLeave: () => void;
  insertion: { path: string; side: "before" | "after" } | null;
  dragEnabled: boolean;
}) {
  const activePathFolders = activeNoteAncestorFolderPaths(activeNotePath);
  const rowDragProps = (item: WorkspaceTreeItem) => ({
    onDragOver: (event: DragEvent) => onTreeDragOver(event, item),
    onDrop: (event: DragEvent) => onTreeDrop(event, item),
    onDragLeave: (event: DragEvent) => {
      if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) onTreeDragLeave();
    },
  });
  return (
    <ul className="note-tree" onDragOver={(event) => {
      if (Array.from(event.dataTransfer.types).includes("application/x-simpler-tree-item")) {
        event.stopPropagation(); onTreeDragLeave();
      }
    }} onDrop={(event) => {
      if (Array.from(event.dataTransfer.types).includes("application/x-simpler-tree-item")) {
        event.preventDefault(); event.stopPropagation(); onTreeDragEnd();
      }
    }}>
      {items.map((item) => {
        const isOpen = openFolderPaths.has(item.path);
        return (
        <li key={item.path} data-reorder-position={insertion?.path === item.path ? insertion.side : undefined}>
          {item.kind === "folder" ? (
            <div {...rowDragProps(item)}
              className={
                activePathFolders.has(item.path)
                  ? "note-tree__folder-row note-tree__folder-row--active-path"
                  : "note-tree__folder-row"
              }
            >
              <button
                type="button"
                className="note-tree__toggle"
                aria-label={`${isOpen ? "Collapse" : "Expand"} ${item.name}`}
                aria-expanded={isOpen}
                onClick={() => onToggleFolder(item.path)}
              >
                <Icon name={isOpen ? "chevron-down" : "chevron-right"} size={12} />
              </button>
              <button
                type="button"
                className="note-tree__folder"
                title={item.path}
                draggable={dragEnabled}
                onClick={() => onSelectFolder(item.path)}
                onContextMenu={(event) => onItemContextMenu(event, "folder", item.path)}
                onKeyDown={(event) => {
                  if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) onItemContextMenu(event, "folder", item.path);
                }}
                onDragStart={(event) => onTreeDragStart(event, item.path)}
                onDragEnd={onTreeDragEnd}
              >
                <span className="note-tree__label">
                  <Icon name="folder" />
                  {item.name}
                </span>
              </button>
              <button type="button" className="note-tree__more" aria-label={`Más acciones para ${item.name}`} aria-haspopup="menu"
                onClick={(event) => onItemContextMenu(event, item.kind, item.path)}><Icon name="more" size={14} /></button>
            </div>
          ) : (
            <div className="note-tree__note-row" {...rowDragProps(item)}>
            <button
              type="button"
              className={
                item.path === activeNotePath ? "note-tree__item note-tree__item--active" : "note-tree__item"
              }
              title={item.path}
              draggable={dragEnabled}
              onClick={() => item.kind === "image" ? onSelectImage(item.path) : onSelectNote(item.path)}
              onContextMenu={(event) => onItemContextMenu(event, item.kind, item.path)}
              onKeyDown={(event) => {
                if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) onItemContextMenu(event, item.kind, item.path);
              }}
              onDragStart={(event) => onTreeDragStart(event, item.path)}
              onDragEnd={onTreeDragEnd}
            >
              <span className="note-tree__label">
                <Icon name={item.kind === "image" ? "image" : "note"} size={14} />
                {item.name}
              </span>
            </button>
              <button type="button" className="note-tree__more" aria-label={`Más acciones para ${item.name}`} aria-haspopup="menu"
                onClick={(event) => onItemContextMenu(event, item.kind, item.path)}><Icon name="more" size={14} /></button>
            </div>
          )}
          {item.kind === "folder" && item.children.length > 0 ? (
            <CollapsibleFolderChildren isOpen={isOpen}>
                <WorkspaceTree
                  items={item.children}
                  activeNotePath={activeNotePath}
                  activeFolderPath={activeFolderPath}
                  openFolderPaths={openFolderPaths}
                  onToggleFolder={onToggleFolder}
                  onSelectFolder={onSelectFolder}
                  onSelectNote={onSelectNote}
                  onSelectImage={onSelectImage}
                  onItemContextMenu={onItemContextMenu}
                  onTreeDragStart={onTreeDragStart}
                  onTreeDragOver={onTreeDragOver}
                  onTreeDrop={onTreeDrop}
                  onTreeDragEnd={onTreeDragEnd}
                  onTreeDragLeave={onTreeDragLeave}
                  insertion={insertion}
                  dragEnabled={dragEnabled}
                />
            </CollapsibleFolderChildren>
          ) : null}
        </li>
        );
      })}
    </ul>
  );
}

function workspaceTreeHasNotes(items: WorkspaceTreeItem[]): boolean {
  return items.some((item) => item.kind === "note" || workspaceTreeHasNotes(item.children));
}

function workspaceNotePaths(items: WorkspaceTreeItem[]): string[] {
  return items.flatMap((item) =>
    item.kind === "note" ? [item.path] : workspaceNotePaths(item.children),
  );
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

function RemoteNotice({ awareness, localChanges, onSync }: {
  awareness?: RemoteAwareness; localChanges: boolean; onSync: () => void;
}) {
  const result = awareness?.result;
  const incoming = (result?.behind ?? 0) > 0 && (result?.state === "incoming" || result?.state === "diverged");
  if (!incoming) return null;
  const message = localChanges || result?.hasLocalChanges || (result?.ahead ?? 0) > 0
    ? "Hay cambios locales y remotos pendientes" : "Hay cambios remotos disponibles";
  return <div className="remote-notice" role="status"><span>{message}</span><button type="button" onClick={onSync}>Sincronizar ahora</button></div>;
}

function RemoteSyncControl({ awareness, localChanges, syncing, onSync, onRetry }: {
  awareness: RemoteAwareness; localChanges: boolean; syncing: boolean; onSync: () => void; onRetry?: () => void;
}) {
  const result = awareness.result;
  const incoming = (result?.behind ?? 0) > 0;
  const failed = result && ["disconnected", "authentication-error", "error"].includes(result.state);
  const label = awareness.checking ? "Comprobando actualizaciones…" : result?.state === "disconnected" ? "Desconectado" : result?.state === "authentication-error" ? "Revisar credenciales" : failed ? "Error de comprobación" : "Sincronizar";
  const explanation = incoming
    ? (localChanges || result?.hasLocalChanges || (result?.ahead ?? 0) > 0 ? "Hay cambios locales y remotos pendientes" : "Hay cambios remotos disponibles")
    : failed ? result.message ?? "No se pudo comprobar el remoto" : "Sincronizar Workspace";
  const lastCheck = awareness.lastSuccessfulCheck ? ` Última comprobación correcta: ${new Date(awareness.lastSuccessfulCheck).toLocaleString()}.` : " Aún no hay una comprobación remota correcta.";
  return <button type="button" className={`remote-sync-control${incoming ? " remote-sync-control--incoming" : ""}`}
    disabled={awareness.checking || syncing}
    title={explanation + lastCheck}
    aria-label={failed ? `${label} — reintentar` : incoming ? "Sincronizar — cambios remotos disponibles" : label}
    onClick={failed ? onRetry : onSync}>
    <span className={awareness.checking ? "remote-sync-control__spinner" : undefined}><Icon name="sync" size={14} /></span>{awareness.checking ? null : label}{incoming && !awareness.checking ? " · Cambios remotos" : ""}
  </button>;
}
