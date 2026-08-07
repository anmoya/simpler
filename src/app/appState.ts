import type { AppRoute } from "./routes";
import type { AdvancedGitStatus, GitHubAuthStatus, GitHubRemote, GlobalSearchResult, SyncStatus as GitSyncStatus } from "../native/commands";

export type SyncStatus = GitSyncStatus | "workspace-abierto" | "sincronizando" | "desconectado" | "error";
export type ThemeMode = "light" | "dark";
export type EditorError =
  | { kind: "missing-note"; message: string }
  | { kind: "file-error"; message: string };
export type DialogRequest =
  | { kind: "prompt"; title: string; defaultValue: string; resolve: (value: string | null) => void }
  | { kind: "confirm"; title: string; resolve: (value: boolean) => void };

// State machine for the Close Sync Prompt (see CONTEXT.md): "choice" offers
// wait-for-sync/close-without-sync, "waiting" is the in-flight Sync, and
// "error" (reached from a failed/conflicted Sync, or a pre-existing paused
// conflict) offers only close-without-sync.
export type CloseSyncPromptState =
  | { kind: "choice" }
  | { kind: "waiting" }
  | { kind: "error"; message: string };

export interface WorkspaceSummary {
  name: string;
  path: string;
}

export interface WorkspaceTreeItem {
  name: string;
  path: string;
  kind: "folder" | "note";
  children: WorkspaceTreeItem[];
}

export interface GitHubConnectionWizardState {
  isOpen: boolean;
  urlInput: string;
  validationError: string | null;
  isSubmitting: boolean;
  submitError: string | null;
}

// Only the states the notice actually renders something for — "idle"/"checking"/"up-to-date" show no notice.
export type UpdateNoticeState =
  | { kind: "downloading" }
  | { kind: "update-ready"; version: string | undefined }
  | { kind: "update-available"; version: string | undefined };

export interface AppState {
  activeRoute: AppRoute;
  workspace: WorkspaceSummary | null;
  recentWorkspaces: WorkspaceSummary[];
  workspaceTree: WorkspaceTreeItem[];
  activeNotePath: string | null;
  activeFolderPath: string;
  noteContent: string;
  themeMode: ThemeMode;
  editorError: EditorError | null;
  syncStatus: SyncStatus;
  conflictedFiles: string[];
  workspaceError: string | null;
  globalSearchQuery: string;
  globalSearchResults: GlobalSearchResult[];
  fileSearchJump: FileSearchJump | null;
  githubAuth: GitHubAuthStatus;
  githubRemote: GitHubRemote | null;
  advancedGit: AdvancedGitStatus | null;
  syncEvents: SyncEvent[];
  githubConnectionWizard: GitHubConnectionWizardState;
  updateNotice: UpdateNoticeState | null;
}

export interface SyncEvent {
  at: string;
  outcome: "success" | "error" | "conflict";
  message: string;
}

export interface FileSearchJump {
  notePath: string;
  lineNumber: number;
  matchStart: number;
  matchEnd: number;
}

export const initialAppState: AppState = {
  activeRoute: "workspace",
  workspace: null,
  recentWorkspaces: [],
  workspaceTree: [],
  activeNotePath: null,
  activeFolderPath: "",
  noteContent: "",
  themeMode: "light",
  editorError: null,
  syncStatus: "desconectado",
  conflictedFiles: [],
  workspaceError: null,
  globalSearchQuery: "",
  globalSearchResults: [],
  fileSearchJump: null,
  githubAuth: { state: "disconnected", message: null },
  githubRemote: null,
  advancedGit: null,
  syncEvents: [],
  githubConnectionWizard: {
    isOpen: false,
    urlInput: "",
    validationError: null,
    isSubmitting: false,
    submitError: null,
  },
  updateNotice: null,
};
