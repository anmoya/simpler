import { useEffect, useMemo, useRef, useState } from "react";
import { ClassicShell } from "../components/ClassicShell";
import { isGitHubRepositoryUrl } from "../components/GitHubConnectionWizard";
import { initialAppState, type AppState, type DialogRequest, type EditorError, type ThemeMode } from "./appState";
import type { AppRoute } from "./routes";
import {
  createAutomaticSyncScheduler,
  type AutomaticSyncScheduler,
  type AutomaticSyncTrigger,
} from "./automaticSyncScheduler";
import {
  createFolder,
  createNote,
  cloneGitHubRepository,
  connectGitHubRemote,
  advancedGitStatus,
  deleteItem,
  disconnectGitHub,
  githubRemote,
  gitSync,
  gitStatus,
  githubAuthStatus,
  pollGitHubDeviceFlow,
  resolveGitConflict,
  globalSearch,
  moveItem,
  moveNote,
  openWorkspace,
  readNote,
  rememberWorkspaceNote,
  renameItem,
  startGitHubDeviceFlow,
  storeGitHubPersonalAccessToken,
  writeNote,
  type GlobalSearchResult,
  type ConflictResolution,
  type GitHubAuthStatus,
  type GitHubRemote,
} from "../native/commands";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";

type SyncOutcome = { ok: true } | { ok: false; error?: string };

export function App() {
  const [appState, setAppState] = useState<AppState>(() => ({
    ...initialAppState,
    recentWorkspaces: readRecentWorkspaces(),
    themeMode: readThemeMode(),
  }));
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);

  const requestPrompt = (title: string, defaultValue = "") =>
    new Promise<string | null>((resolve) => setDialog({ kind: "prompt", title, defaultValue, resolve }));

  const requestConfirm = (title: string) =>
    new Promise<boolean>((resolve) => setDialog({ kind: "confirm", title, resolve }));
  const appStateRef = useRef(appState);
  const activeWorkspacePathRef = useRef<string | null>(null);
  const syncWorkspaceRef = useRef<(trigger: AutomaticSyncTrigger) => void>(() => undefined);
  const schedulerRef = useRef<AutomaticSyncScheduler | null>(null);

  appStateRef.current = appState;

  if (schedulerRef.current === null) {
    schedulerRef.current = createAutomaticSyncScheduler({
      requestSync: (trigger) => syncWorkspaceRef.current(trigger),
      markPending: () => {
        setAppState((current) => ({ ...current, syncStatus: "cambios-locales" }));
      },
    });
  }

  useEffect(() => {
    const requestCloseSync = () => {
      schedulerRef.current?.appClosing();
    };

    window.addEventListener("beforeunload", requestCloseSync);

    let unlistenClose: (() => void) | null = null;
    try {
      void getCurrentWindow()
        .onCloseRequested(() => {
          requestCloseSync();
        })
        .then((unlisten) => {
          unlistenClose = unlisten;
        })
        .catch(() => undefined);
    } catch {
      // Browser-only tests and Vite dev do not expose Tauri window internals.
    }

    return () => {
      window.removeEventListener("beforeunload", requestCloseSync);
      unlistenClose?.();
      schedulerRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    let unlistenResize: (() => void) | null = null;
    try {
      const currentWindow = getCurrentWindow();
      void currentWindow.isMaximized().then(setIsWindowMaximized);
      void currentWindow
        .onResized(() => {
          void currentWindow.isMaximized().then(setIsWindowMaximized);
        })
        .then((unlisten) => {
          unlistenResize = unlisten;
        })
        .catch(() => undefined);
    } catch {
      // Browser-only tests and Vite dev do not expose Tauri window internals.
    }

    return () => {
      unlistenResize?.();
    };
  }, []);

  const minimizeWindow = () => {
    try {
      void getCurrentWindow().minimize();
    } catch {
      // Browser-only tests and Vite dev do not expose Tauri window internals.
    }
  };

  const toggleMaximizeWindow = () => {
    try {
      void getCurrentWindow().toggleMaximize();
    } catch {
      // Browser-only tests and Vite dev do not expose Tauri window internals.
    }
  };

  const closeWindow = () => {
    try {
      void getCurrentWindow().close();
    } catch {
      // Browser-only tests and Vite dev do not expose Tauri window internals.
    }
  };

  const openRoute = (activeRoute: AppRoute) => {
    setAppState((current) => ({ ...current, activeRoute }));
    if (activeRoute === "settings") {
      void refreshGitHubAuth();
    }
  };

  const updateGitHubAuth = (response: { ok: boolean; data: GitHubAuthStatus | null; error: string | null }) => {
    setAppState((current) => ({
      ...current,
      githubAuth: response.data ?? { state: "failed", message: response.error ?? "GitHub authentication failed" },
    }));
  };

  const refreshGitHubAuth = async () => updateGitHubAuth(await githubAuthStatus());

  const beginGitHubDeviceFlow = async () => {
    const response = await startGitHubDeviceFlow();
    if (!response.ok || !response.data) {
      updateGitHubAuth({ ok: false, data: null, error: response.error });
      return;
    }
    setAppState((current) => ({ ...current, githubAuth: { state: "pending", message: null } }));
    return response.data;
  };

  const checkGitHubDeviceFlow = async () => updateGitHubAuth(await pollGitHubDeviceFlow());

  const saveGitHubPersonalAccessToken = async (token: string) => {
    updateGitHubAuth(await storeGitHubPersonalAccessToken(token));
  };

  const disconnectGitHubAccount = async () => updateGitHubAuth(await disconnectGitHub());

  const openWorkspaceFromPath = async () => {
    const workspacePath = await chooseWorkspacePath();

    if (!workspacePath) {
      return;
    }

    await openWorkspaceAtPath(workspacePath);
  };

  const cloneExistingGitHubRepository = async () => {
    const repositoryUrl = window.prompt("GitHub repository URL");
    if (!repositoryUrl) {
      return;
    }
    const destinationPath = window.prompt("Clone destination folder path");
    if (!destinationPath) {
      return;
    }

    setAppState((current) => ({ ...current, workspaceError: null }));
    const response = await cloneGitHubRepository(repositoryUrl, destinationPath);
    if (!response.ok || !response.data) {
      setAppState((current) => ({
        ...current,
        workspaceError: response.error ?? "No se pudo clonar el repositorio de GitHub",
      }));
      return;
    }

    await openWorkspaceAtPath(response.data.workspacePath);
  };

  const openGitHubConnectionWizard = () => {
    setAppState((current) => ({
      ...current,
      githubConnectionWizard: {
        isOpen: true,
        urlInput: "",
        validationError: null,
        isSubmitting: false,
        submitError: null,
      },
    }));
  };

  const closeGitHubConnectionWizard = () => {
    setAppState((current) => ({
      ...current,
      githubConnectionWizard: { ...initialAppState.githubConnectionWizard },
    }));
  };

  const changeGitHubWizardUrl = (url: string) => {
    setAppState((current) => ({
      ...current,
      githubConnectionWizard: { ...current.githubConnectionWizard, urlInput: url, validationError: null },
    }));
  };

  const submitGitHubConnectionWizard = async () => {
    const workspacePath = appState.workspace?.path;
    if (!workspacePath) {
      return;
    }

    const remoteUrl = appState.githubConnectionWizard.urlInput.trim();
    if (!isGitHubRepositoryUrl(remoteUrl)) {
      setAppState((current) => ({
        ...current,
        githubConnectionWizard: {
          ...current.githubConnectionWizard,
          validationError: "Enter a valid GitHub repository URL",
        },
      }));
      return;
    }

    setAppState((current) => ({
      ...current,
      githubConnectionWizard: { ...current.githubConnectionWizard, isSubmitting: true, submitError: null },
    }));

    const connectResponse = await connectGitHubRemote(workspacePath, remoteUrl);
    if (!connectResponse.ok || !connectResponse.data) {
      setAppState((current) => ({
        ...current,
        githubConnectionWizard: {
          ...current.githubConnectionWizard,
          isSubmitting: false,
          submitError: connectResponse.error ?? "No se pudo conectar el remoto de GitHub",
        },
      }));
      return;
    }

    setAppState((current) => ({ ...current, githubRemote: connectResponse.data, workspaceError: null }));
    await refreshGitStatus(workspacePath);

    const syncOutcome = await runSyncWorkspace("manual");
    if (!syncOutcome.ok) {
      setAppState((current) => ({
        ...current,
        githubConnectionWizard: {
          ...current.githubConnectionWizard,
          isSubmitting: false,
          submitError: syncOutcome.error ?? "No se pudo sincronizar el Workspace",
        },
      }));
      return;
    }

    closeGitHubConnectionWizard();
  };

  const openWorkspaceAtPath = async (workspacePath: string) => {
    setAppState((current) => ({ ...current, workspaceError: null }));
    const response = await loadWorkspace(workspacePath);

    const openedWorkspace = response.data;

    if (!response.ok || !openedWorkspace) {
      setAppState((current) => ({
        ...current,
        workspace: null,
        workspaceTree: [],
        syncStatus: "desconectado",
        conflictedFiles: [],
        githubRemote: null,
        advancedGit: null,
        syncEvents: [],
        editorError: null,
        workspaceError: response.error ?? "No se pudo abrir el Workspace",
      }));
      activeWorkspacePathRef.current = null;
      return;
    }

    const recentWorkspaces = saveRecentWorkspace({
      name: openedWorkspace.name,
      path: openedWorkspace.path,
    });

    setAppState((current) => ({
      ...current,
      workspace: { name: openedWorkspace.name, path: openedWorkspace.path },
      recentWorkspaces,
      workspaceTree: openedWorkspace.tree,
      activeNotePath: null,
      activeFolderPath: "",
      noteContent: "",
      editorError: null,
      syncStatus: "workspace-abierto",
      conflictedFiles: [],
      githubRemote: null,
      advancedGit: null,
      syncEvents: [],
      workspaceError: null,
      globalSearchQuery: "",
      globalSearchResults: [],
      fileSearchJump: null,
    }));
    activeWorkspacePathRef.current = openedWorkspace.path;

    if (openedWorkspace.metadata.lastNotePath) {
      await openNoteInWorkspace(openedWorkspace.path, openedWorkspace.metadata.lastNotePath, null, true);
    }

    const [openedSyncStatus] = await Promise.all([
      refreshGitStatus(openedWorkspace.path),
      refreshGitHubRemote(openedWorkspace.path),
      refreshAdvancedGitStatus(openedWorkspace.path),
    ]);
    schedulerRef.current?.workspaceOpened(openedSyncStatus === "cambios-locales");
  };

  const selectFolder = (folderPath: string) => {
    setAppState((current) => ({
      ...current,
      activeFolderPath: folderPath,
      activeNotePath: null,
      noteContent: "",
      editorError: null,
      workspaceError: null,
      fileSearchJump: null,
    }));
  };

  const selectNote = async (notePath: string, fileSearchJump: AppState["fileSearchJump"] = null) => {
    if (!appState.workspace) {
      return;
    }

    await openNoteInWorkspace(appState.workspace.path, notePath, fileSearchJump, true);
  };

  const openNoteInWorkspace = async (
    workspacePath: string,
    notePath: string,
    fileSearchJump: AppState["fileSearchJump"] = null,
    rememberNote = false,
  ) => {
    const response = await readNote(workspacePath, notePath);

    if (!response.ok || response.data === null) {
      setAppState((current) => ({
        ...current,
        activeNotePath: notePath,
        activeFolderPath: parentFolderPath(notePath),
        noteContent: "",
        editorError: noteReadError(response.error),
        workspaceError: response.error ?? "No se pudo abrir la nota",
        fileSearchJump: null,
      }));
      return;
    }

    if (rememberNote) {
      await rememberWorkspaceNote(workspacePath, notePath).catch(() => undefined);
    }

    setAppState((current) => ({
      ...current,
      activeNotePath: notePath,
      activeFolderPath: parentFolderPath(notePath),
      noteContent: response.data!.content,
      editorError: null,
      workspaceError: null,
      fileSearchJump,
    }));
  };

  const changeGlobalSearch = async (query: string) => {
    setAppState((current) => ({ ...current, globalSearchQuery: query }));

    if (!appState.workspace || query.trim() === "") {
      setAppState((current) => ({ ...current, globalSearchResults: [] }));
      return;
    }

    const response = await globalSearch(appState.workspace.path, query);

    if (!response.ok || !response.data) {
      setAppState((current) => ({
        ...current,
        globalSearchResults: [],
        workspaceError: response.error ?? "No se pudo buscar en el Workspace",
      }));
      return;
    }

    setAppState((current) => ({
      ...current,
      globalSearchResults: response.data!.results,
      workspaceError: null,
    }));
  };

  const selectGlobalSearchResult = async (result: GlobalSearchResult) => {
    await selectNote(result.notePath, {
      notePath: result.notePath,
      lineNumber: result.lineNumber,
      matchStart: result.matchStart,
      matchEnd: result.matchEnd,
    });
  };

  const changeNoteContent = async (content: string) => {
    const workspace = appState.workspace;
    const activeNotePath = appState.activeNotePath;

    if (!workspace || !activeNotePath) {
      return;
    }

    setAppState((current) => ({ ...current, noteContent: content, editorError: null }));

    const response = await writeNote(workspace.path, activeNotePath, content);

    if (!response.ok) {
      setAppState((current) => ({
        ...current,
        workspaceError: response.error ?? "No se pudo guardar la nota",
      }));
      return;
    }

    setAppState((current) => ({
      ...current,
      syncStatus: current.syncStatus === "sincronizado" ? "cambios-locales" : current.syncStatus,
    }));
    schedulerRef.current?.localSave();
  };

  const createFolderInSelection = async () => {
    const folderName = await requestPrompt("Nombre de la carpeta");
    if (!folderName || !appState.workspace) {
      return;
    }

    const response = await createFolder(appState.workspace.path, appState.activeFolderPath, folderName);
    applyFilesystemOperation(response, (itemPath) => ({
      activeFolderPath: itemPath,
      activeNotePath: null,
      noteContent: "",
      editorError: null,
    }));
  };

  const createNoteInSelection = async () => {
    const noteName = await requestPrompt("Nombre de la nota");
    if (!noteName || !appState.workspace) {
      return;
    }

    const response = await createNote(appState.workspace.path, appState.activeFolderPath, noteName);
    applyFilesystemOperation(response, (itemPath) => ({
      activeFolderPath: parentFolderPath(itemPath),
      activeNotePath: itemPath,
      noteContent: "",
      editorError: null,
    }));
  };

  const renameSelection = async () => {
    const selectedPath = appState.activeNotePath ?? appState.activeFolderPath;

    if (!selectedPath || !appState.workspace) {
      return;
    }

    const newName = await requestPrompt("Nuevo nombre", basename(selectedPath));
    if (!newName) {
      return;
    }

    const wasNote = appState.activeNotePath !== null;
    const response = await renameItem(appState.workspace.path, selectedPath, newName);
    applyFilesystemOperation(response, (itemPath) => ({
      activeFolderPath: wasNote ? parentFolderPath(itemPath) : itemPath,
      activeNotePath: wasNote ? itemPath : null,
      noteContent: wasNote ? appState.noteContent : "",
      editorError: null,
    }));
  };

  const moveActiveNote = async () => {
    if (!appState.workspace || !appState.activeNotePath) {
      return;
    }

    const targetFolderPath = await requestPrompt("Carpeta destino", appState.activeFolderPath);
    if (targetFolderPath === null) {
      return;
    }

    const response = await moveNote(appState.workspace.path, appState.activeNotePath, targetFolderPath);
    applyFilesystemOperation(response, (itemPath) => ({
      activeFolderPath: parentFolderPath(itemPath),
      activeNotePath: itemPath,
      noteContent: appState.noteContent,
      editorError: null,
    }));
  };

  const moveItemToFolder = async (itemPath: string, targetFolderPath: string) => {
    if (!appState.workspace || itemPath === targetFolderPath) {
      return;
    }

    const wasActiveNote = itemPath === appState.activeNotePath;
    const wasActiveFolder = itemPath === appState.activeFolderPath;
    const response = await moveItem(appState.workspace.path, itemPath, targetFolderPath);
    applyFilesystemOperation(response, (resultItemPath) => ({
      activeFolderPath: wasActiveNote
        ? parentFolderPath(resultItemPath)
        : wasActiveFolder
          ? resultItemPath
          : appState.activeFolderPath,
      activeNotePath: wasActiveNote ? resultItemPath : appState.activeNotePath,
      noteContent: appState.noteContent,
      editorError: null,
    }));
  };

  const deleteSelection = async () => {
    const selectedPath = appState.activeNotePath ?? appState.activeFolderPath;

    if (!selectedPath || !appState.workspace) {
      return;
    }

    const wasNote = appState.activeNotePath !== null;
    const confirmed = await requestConfirm(
      wasNote ? `¿Eliminar "${basename(selectedPath)}"?` : `¿Eliminar la carpeta "${basename(selectedPath)}" y todo su contenido?`,
    );
    if (!confirmed) {
      return;
    }

    const response = await deleteItem(appState.workspace.path, selectedPath);
    applyFilesystemOperation(response, (itemPath) => ({
      activeFolderPath: itemPath,
      activeNotePath: null,
      noteContent: "",
      editorError: null,
    }));
  };

  const changeTheme = (themeMode: ThemeMode) => {
    saveThemeMode(themeMode);
    setAppState((current) => ({ ...current, themeMode }));
  };

  const syncWorkspace = async () => {
    schedulerRef.current?.manualSync();
  };

  const runSyncWorkspace = async (trigger: AutomaticSyncTrigger): Promise<SyncOutcome> => {
    const workspacePath = appStateRef.current.workspace?.path ?? activeWorkspacePathRef.current;

    if (!workspacePath) {
      return { ok: false };
    }

    const currentSyncStatus = appStateRef.current.syncStatus;
    if (trigger !== "manual" && trigger !== "open" && !canRunAutomaticSync(currentSyncStatus)) {
      return { ok: false };
    }

    if (currentSyncStatus === "sincronizando") {
      return { ok: false };
    }

    setAppState((current) => ({ ...current, syncStatus: "sincronizando", workspaceError: null }));

    try {
      const response = await gitSync(workspacePath);

      if (!response.ok || !response.data) {
        schedulerRef.current?.syncFailed();
        setAppState((current) => ({
          ...current,
          syncStatus: "error",
          workspaceError: response.error ?? "No se pudo sincronizar el Workspace",
          syncEvents: recordSyncEvent(current.syncEvents, "error", response.error ?? "No se pudo sincronizar el Workspace"),
        }));
        return { ok: false, error: response.error ?? "No se pudo sincronizar el Workspace" };
      }

      if (response.data.status === "conflict") {
        schedulerRef.current?.syncConflicted();
        setAppState((current) => ({
          ...current,
          syncStatus: "conflicto",
          conflictedFiles: response.data!.conflictedFiles ?? [],
          workspaceError: null,
          syncEvents: recordSyncEvent(current.syncEvents, "conflict", response.data!.message),
        }));
        return { ok: false, error: response.data.message };
      }

      schedulerRef.current?.syncSucceeded();
      const workspaceResponse = await loadWorkspace(workspacePath);
      if (workspaceResponse.ok && workspaceResponse.data) {
        setAppState((current) => ({
          ...current,
          workspaceTree: workspaceResponse.data!.tree,
        }));
      }

      setAppState((current) => ({
        ...current,
        syncEvents: recordSyncEvent(current.syncEvents, "success", response.data!.message),
      }));
      await refreshGitStatus(workspacePath);
      await refreshAdvancedGitStatus(workspacePath);
      return { ok: true };
    } catch {
      schedulerRef.current?.syncFailed();
      setAppState((current) => ({
        ...current,
        syncStatus: "error",
        workspaceError: "No se pudo sincronizar el Workspace",
        syncEvents: recordSyncEvent(current.syncEvents, "error", "No se pudo sincronizar el Workspace"),
      }));
      return { ok: false, error: "No se pudo sincronizar el Workspace" };
    }
  };

  const refreshGitStatus = async (workspacePath: string) => {
    try {
      const response = await gitStatus(workspacePath);

      if (!response.ok || !response.data) {
        setAppState((current) => ({
          ...current,
          syncStatus: "error",
          workspaceError: response.error ?? "No se pudo leer el estado de Sync",
        }));
        return null;
      }

      setAppState((current) => ({
        ...current,
        syncStatus: response.data!.syncStatus,
        conflictedFiles: response.data!.conflictedFiles ?? [],
        workspaceError: null,
      }));
      return response.data.syncStatus;
    } catch {
      setAppState((current) => ({
        ...current,
        syncStatus: "error",
        workspaceError: "No se pudo leer el estado de Sync",
      }));
      return null;
    }
  };

  const refreshGitHubRemote = async (workspacePath: string) => {
    try {
      const response = await githubRemote(workspacePath);
      setAppState((current) => ({ ...current, githubRemote: response.ok ? response.data?.remote ?? null : null }));
    } catch {
      setAppState((current) => ({ ...current, githubRemote: null }));
    }
  };

  const refreshAdvancedGitStatus = async (workspacePath: string) => {
    try {
      const response = await advancedGitStatus(workspacePath);
      setAppState((current) => ({
        ...current,
        advancedGit: response.ok ? response.data : null,
        workspaceError: response.ok ? current.workspaceError : response.error ?? "No se pudieron leer los detalles de Git",
      }));
    } catch {
      setAppState((current) => ({ ...current, advancedGit: null }));
    }
  };

  const resolveConflict = async (notePath: string, resolution: ConflictResolution) => {
    const workspacePath = appState.workspace?.path;
    if (!workspacePath) {
      return;
    }

    const response = await resolveGitConflict(workspacePath, notePath, resolution);
    if (!response.ok || !response.data) {
      setAppState((current) => ({ ...current, workspaceError: response.error ?? "No se pudo resolver el conflicto" }));
      return;
    }

    if (response.data.status === "conflict") {
      schedulerRef.current?.syncConflicted();
      setAppState((current) => ({ ...current, syncStatus: "conflicto", conflictedFiles: response.data!.conflictedFiles ?? [] }));
      return;
    }

    schedulerRef.current?.syncSucceeded();
    const workspaceResponse = await loadWorkspace(workspacePath);
    if (workspaceResponse.ok && workspaceResponse.data) {
      setAppState((current) => ({ ...current, workspaceTree: workspaceResponse.data!.tree }));
    }
    await refreshGitStatus(workspacePath);
  };

  const editConflictManually = async (notePath: string) => {
    if (!appState.workspace) {
      return;
    }
    await openNoteInWorkspace(appState.workspace.path, notePath, null, true);
    setAppState((current) => ({ ...current, activeRoute: "workspace" }));
  };

  const applyFilesystemOperation = (
    response: Awaited<ReturnType<typeof createNote>>,
    selection: (
      itemPath: string,
    ) => Pick<AppState, "activeFolderPath" | "activeNotePath" | "noteContent" | "editorError">,
  ) => {
    if (!response.ok || !response.data) {
      setAppState((current) => ({
        ...current,
        workspaceError: response.error ?? "No se pudo modificar el Workspace",
      }));
      return;
    }

    setAppState((current) => ({
      ...current,
      workspaceTree: response.data!.tree,
      workspaceError: null,
      syncStatus: "cambios-locales",
      ...selection(response.data!.itemPath),
    }));
    schedulerRef.current?.localSave();
  };

  syncWorkspaceRef.current = (trigger) => {
    void runSyncWorkspace(trigger);
  };

  const statusLabel = useMemo(() => {
    switch (appState.syncStatus) {
      case "sincronizado":
        return "Sincronizado";
      case "cambios-locales":
        return "Cambios locales";
      case "workspace-abierto":
        return "Workspace abierto";
      case "sincronizando":
        return "Sincronizando";
      case "sin-git":
        return "Sin Git";
      case "sin-remoto":
        return "Sin remoto";
      case "conflicto":
        return "Necesita resolver conflicto";
      case "error":
        return "Error";
      case "desconectado":
        return "Sin workspace";
    }
  }, [appState.syncStatus]);

  return (
    <ClassicShell
      activeRoute={appState.activeRoute}
      workspaceTree={appState.workspaceTree}
      statusLabel={statusLabel}
      workspaceError={appState.workspaceError}
      workspaceName={appState.workspace?.name ?? "Abrir carpeta"}
      workspacePath={appState.workspace?.path ?? null}
      recentWorkspaces={appState.recentWorkspaces}
      activeNotePath={appState.activeNotePath}
      activeFolderPath={appState.activeFolderPath}
      noteContent={appState.noteContent}
      themeMode={appState.themeMode}
      editorError={appState.editorError}
      canManageWorkspace={appState.workspace !== null}
      onOpenWorkspace={openWorkspaceFromPath}
      onCloneGitHubRepository={cloneExistingGitHubRepository}
      onOpenRecentWorkspace={openWorkspaceAtPath}
      onRouteChange={openRoute}
      onThemeChange={changeTheme}
      onSelectFolder={selectFolder}
      onSelectNote={selectNote}
      onNoteChange={changeNoteContent}
      onCreateFolder={createFolderInSelection}
      onCreateNote={createNoteInSelection}
      onRenameSelection={renameSelection}
      onMoveActiveNote={moveActiveNote}
      onDeleteSelection={deleteSelection}
      onMoveItem={moveItemToFolder}
      isWindowMaximized={isWindowMaximized}
      onMinimizeWindow={minimizeWindow}
      onToggleMaximizeWindow={toggleMaximizeWindow}
      onCloseWindow={closeWindow}
      dialog={dialog}
      onDialogSubmit={(value) => {
        if (dialog?.kind === "prompt") {
          dialog.resolve(value);
        } else if (dialog?.kind === "confirm") {
          dialog.resolve(true);
        }
        setDialog(null);
      }}
      onDialogCancel={() => {
        if (dialog?.kind === "prompt") {
          dialog.resolve(null);
        } else if (dialog?.kind === "confirm") {
          dialog.resolve(false);
        }
        setDialog(null);
      }}
      githubConnectionWizard={appState.githubConnectionWizard}
      onGitHubWizardUrlChange={changeGitHubWizardUrl}
      onGitHubWizardSubmit={() => void submitGitHubConnectionWizard()}
      onGitHubWizardCancel={closeGitHubConnectionWizard}
      onSyncWorkspace={syncWorkspace}
      githubRemote={appState.githubRemote}
      advancedGit={appState.advancedGit}
      syncEvents={appState.syncEvents}
      onRefreshAdvancedGit={() => {
        void refreshGitHubAuth();
        if (appState.workspace) {
          void refreshAdvancedGitStatus(appState.workspace.path);
        }
      }}
      onConnectGitHubRemote={openGitHubConnectionWizard}
      conflictedFiles={appState.conflictedFiles}
      onResolveConflict={resolveConflict}
      onEditConflictManually={editConflictManually}
      fileSearchJump={appState.fileSearchJump}
      globalSearchQuery={appState.globalSearchQuery}
      globalSearchResults={appState.globalSearchResults}
      onGlobalSearchChange={changeGlobalSearch}
      onSelectGlobalSearchResult={selectGlobalSearchResult}
      githubAuth={appState.githubAuth}
      onBeginGitHubDeviceFlow={beginGitHubDeviceFlow}
      onCheckGitHubDeviceFlow={checkGitHubDeviceFlow}
      onStoreGitHubPersonalAccessToken={saveGitHubPersonalAccessToken}
      onDisconnectGitHub={disconnectGitHubAccount}
    />
  );
}

const recentWorkspacesStorageKey = "simpler.recentWorkspaces";
const themeModeStorageKey = "simpler.themeMode";

function readThemeMode(): ThemeMode {
  try {
    const value = localStorage.getItem(themeModeStorageKey);
    return value === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function saveThemeMode(themeMode: ThemeMode) {
  try {
    localStorage.setItem(themeModeStorageKey, themeMode);
  } catch {
    // localStorage may be unavailable (e.g. private browsing); the app still works, just unpersisted.
  }
}

function recordSyncEvent(
  events: AppState["syncEvents"],
  outcome: AppState["syncEvents"][number]["outcome"],
  message: string,
) {
  return [{ at: new Date().toISOString(), outcome, message }, ...events].slice(0, 8);
}

function readRecentWorkspaces() {
  try {
    const value = localStorage.getItem(recentWorkspacesStorageKey);
    if (!value) {
      return [];
    }

    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (workspace): workspace is { name: string; path: string } =>
          typeof workspace?.name === "string" && typeof workspace?.path === "string",
      )
      .slice(0, 5);
  } catch {
    return [];
  }
}

function saveRecentWorkspace(workspace: { name: string; path: string }) {
  const recentWorkspaces = [
    workspace,
    ...readRecentWorkspaces().filter((recentWorkspace) => recentWorkspace.path !== workspace.path),
  ].slice(0, 5);

  localStorage.setItem(recentWorkspacesStorageKey, JSON.stringify(recentWorkspaces));
  return recentWorkspaces;
}

function noteReadError(error: string | null): EditorError {
  const message = error ?? "No se pudo abrir la nota";

  if (
    message.includes("note file is missing") ||
    message.includes("No such file") ||
    message.includes("os error 2")
  ) {
    return { kind: "missing-note", message };
  }

  return { kind: "file-error", message };
}

function parentFolderPath(notePath: string) {
  const lastSlash = notePath.lastIndexOf("/");
  return lastSlash === -1 ? "" : notePath.slice(0, lastSlash);
}

function basename(path: string) {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash === -1 ? path : path.slice(lastSlash + 1);
}

function canRunAutomaticSync(syncStatus: AppState["syncStatus"]) {
  return syncStatus === "cambios-locales" || syncStatus === "sincronizado" || syncStatus === "error";
}

async function chooseWorkspacePath() {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Abrir Workspace",
    });

    if (typeof selected === "string") {
      return selected;
    }
  } catch {
    return window.prompt("Workspace folder path");
  }

  return null;
}

async function loadWorkspace(workspacePath: string) {
  try {
    return await openWorkspace(workspacePath);
  } catch {
    return {
      ok: false,
      domain: "workspace" as const,
      action: "open",
      data: null,
      error: "No se pudo abrir el Workspace",
    };
  }
}
