import { invoke } from "@tauri-apps/api/core";

export type NativeDomain = "workspace" | "filesystem" | "git" | "auth";

export interface NativeCommandRequest<TPayload = unknown> {
  domain: NativeDomain;
  action: string;
  payload: TPayload;
}

export interface NativeCommandResponse<TData = unknown> {
  ok: boolean;
  domain: NativeDomain;
  action: string;
  data: TData | null;
  error: string | null;
}

export interface OpenedWorkspace {
  name: string;
  path: string;
  tree: WorkspaceTreeItem[];
  metadata: WorkspaceMetadata;
}

export interface WorkspaceMetadata {
  lastNotePath: string | null;
}

export type SyncStatus = "sincronizado" | "cambios-locales" | "sin-git" | "sin-remoto" | "conflicto";

export interface GitWorkspaceStatus {
  isRepository: boolean;
  hasRemote: boolean;
  syncStatus: SyncStatus;
  conflictedFiles: string[];
}

export interface GitCommit {
  id: string;
  subject: string;
  timestamp: string;
}

export interface AdvancedGitStatus {
  isRepository: boolean;
  repository: string | null;
  branch: string | null;
  latestCommit: GitCommit | null;
  pendingChanges: string[];
}

export interface GitSyncResult {
  status: "synced" | "conflict";
  message: string;
  conflictedFiles: string[];
}

export interface GitHubRemote {
  name: string;
  url: string;
}

export interface GitHubRemoteStatus {
  remote: GitHubRemote | null;
}

export interface GitHubCloneResult {
  workspacePath: string;
}

export type ConflictResolution = "local" | "remote" | "manual";

export type GitHubAuthState = "connected" | "disconnected" | "pending" | "expired" | "failed";

export interface GitHubAuthStatus {
  state: GitHubAuthState;
  message: string | null;
}

export interface DeviceFlowInstructions {
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export interface WorkspaceTreeItem {
  name: string;
  path: string;
  kind: "folder" | "note";
  children: WorkspaceTreeItem[];
}

export function invokeNativeCommand<TData, TPayload = unknown>(
  request: NativeCommandRequest<TPayload>,
) {
  return invoke<NativeCommandResponse<TData>>("native_command", { request });
}

export interface NoteContent {
  content: string;
}

export interface FilesystemOperationResult {
  tree: WorkspaceTreeItem[];
  itemPath: string;
}

export interface GlobalSearchResult {
  notePath: string;
  lineNumber: number;
  lineText: string;
  matchStart: number;
  matchEnd: number;
}

export interface GlobalSearchResults {
  results: GlobalSearchResult[];
}

export function openWorkspace(workspacePath: string) {
  return invokeNativeCommand<OpenedWorkspace, { workspacePath: string }>({
    domain: "workspace",
    action: "open",
    payload: { workspacePath },
  });
}

export function rememberWorkspaceNote(workspacePath: string, notePath: string) {
  return invokeNativeCommand<WorkspaceMetadata, { workspacePath: string; notePath: string }>({
    domain: "workspace",
    action: "remember-note",
    payload: { workspacePath, notePath },
  });
}

export function readNote(workspacePath: string, notePath: string) {
  return invokeNativeCommand<NoteContent, { workspacePath: string; notePath: string }>({
    domain: "filesystem",
    action: "read-note",
    payload: { workspacePath, notePath },
  });
}

export function writeNote(workspacePath: string, notePath: string, content: string) {
  return invokeNativeCommand<
    NoteContent,
    { workspacePath: string; notePath: string; content: string }
  >({
    domain: "filesystem",
    action: "write-note",
    payload: { workspacePath, notePath, content },
  });
}

export function createFolder(workspacePath: string, parentPath: string, folderName: string) {
  return invokeNativeCommand<
    FilesystemOperationResult,
    { workspacePath: string; parentPath: string; folderName: string }
  >({
    domain: "filesystem",
    action: "create-folder",
    payload: { workspacePath, parentPath, folderName },
  });
}

export function createNote(workspacePath: string, parentPath: string, noteName: string) {
  return invokeNativeCommand<
    FilesystemOperationResult,
    { workspacePath: string; parentPath: string; noteName: string }
  >({
    domain: "filesystem",
    action: "create-note",
    payload: { workspacePath, parentPath, noteName },
  });
}

export function renameItem(workspacePath: string, itemPath: string, newName: string) {
  return invokeNativeCommand<
    FilesystemOperationResult,
    { workspacePath: string; itemPath: string; newName: string }
  >({
    domain: "filesystem",
    action: "rename-item",
    payload: { workspacePath, itemPath, newName },
  });
}

export function moveNote(workspacePath: string, notePath: string, targetFolderPath: string) {
  return invokeNativeCommand<
    FilesystemOperationResult,
    { workspacePath: string; notePath: string; targetFolderPath: string }
  >({
    domain: "filesystem",
    action: "move-note",
    payload: { workspacePath, notePath, targetFolderPath },
  });
}

export function moveItem(workspacePath: string, itemPath: string, targetFolderPath: string) {
  return invokeNativeCommand<
    FilesystemOperationResult,
    { workspacePath: string; itemPath: string; targetFolderPath: string }
  >({
    domain: "filesystem",
    action: "move-item",
    payload: { workspacePath, itemPath, targetFolderPath },
  });
}

export function deleteItem(workspacePath: string, itemPath: string) {
  return invokeNativeCommand<FilesystemOperationResult, { workspacePath: string; itemPath: string }>({
    domain: "filesystem",
    action: "delete-item",
    payload: { workspacePath, itemPath },
  });
}

export function globalSearch(workspacePath: string, query: string) {
  return invokeNativeCommand<GlobalSearchResults, { workspacePath: string; query: string }>({
    domain: "filesystem",
    action: "global-search",
    payload: { workspacePath, query },
  });
}

export function gitStatus(workspacePath: string) {
  return invokeNativeCommand<GitWorkspaceStatus, { workspacePath: string }>({
    domain: "git",
    action: "status",
    payload: { workspacePath },
  });
}

export function advancedGitStatus(workspacePath: string) {
  return invokeNativeCommand<AdvancedGitStatus, { workspacePath: string }>({
    domain: "git",
    action: "advanced-status",
    payload: { workspacePath },
  });
}

export function gitSync(workspacePath: string) {
  return invokeNativeCommand<GitSyncResult, { workspacePath: string }>({
    domain: "git",
    action: "sync",
    payload: { workspacePath },
  });
}

export function githubRemote(workspacePath: string) {
  return invokeNativeCommand<GitHubRemoteStatus, { workspacePath: string }>({
    domain: "git",
    action: "github-remote",
    payload: { workspacePath },
  });
}

export function connectGitHubRemote(workspacePath: string, remoteUrl: string) {
  return invokeNativeCommand<GitHubRemote, { workspacePath: string; remoteUrl: string }>({
    domain: "git",
    action: "connect-github-remote",
    payload: { workspacePath, remoteUrl },
  });
}

export function cloneGitHubRepository(repositoryUrl: string, destinationPath: string) {
  return invokeNativeCommand<GitHubCloneResult, { repositoryUrl: string; destinationPath: string }>({
    domain: "git",
    action: "clone-github-repository",
    payload: { repositoryUrl, destinationPath },
  });
}

export function resolveGitConflict(workspacePath: string, notePath: string, resolution: ConflictResolution) {
  return invokeNativeCommand<
    GitSyncResult,
    { workspacePath: string; notePath: string; resolution: ConflictResolution }
  >({
    domain: "git",
    action: "resolve-conflict",
    payload: { workspacePath, notePath, resolution },
  });
}

export function githubAuthStatus() {
  return invokeNativeCommand<GitHubAuthStatus>({ domain: "auth", action: "status", payload: {} });
}

export function startGitHubDeviceFlow() {
  return invokeNativeCommand<DeviceFlowInstructions>({ domain: "auth", action: "start-device-flow", payload: {} });
}

export function pollGitHubDeviceFlow() {
  return invokeNativeCommand<GitHubAuthStatus>({ domain: "auth", action: "poll-device-flow", payload: {} });
}

export function storeGitHubPersonalAccessToken(token: string) {
  return invokeNativeCommand<GitHubAuthStatus, { token: string }>({
    domain: "auth",
    action: "store-personal-access-token",
    payload: { token },
  });
}

export function disconnectGitHub() {
  return invokeNativeCommand<GitHubAuthStatus>({ domain: "auth", action: "disconnect", payload: {} });
}
