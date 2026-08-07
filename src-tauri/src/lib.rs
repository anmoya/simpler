use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Mutex, OnceLock};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum NativeDomain {
    Workspace,
    Filesystem,
    Git,
    Auth,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeCommandRequest {
    pub domain: NativeDomain,
    pub action: String,
    #[serde(default)]
    pub payload: serde_json::Value,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeCommandResponse {
    pub ok: bool,
    pub domain: NativeDomain,
    pub action: String,
    pub data: Option<serde_json::Value>,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OpenWorkspacePayload {
    workspace_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RememberNotePayload {
    workspace_path: String,
    note_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReadNotePayload {
    workspace_path: String,
    note_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WriteNotePayload {
    workspace_path: String,
    note_path: String,
    content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateFolderPayload {
    workspace_path: String,
    parent_path: String,
    folder_name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateNotePayload {
    workspace_path: String,
    parent_path: String,
    note_name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RenameItemPayload {
    workspace_path: String,
    item_path: String,
    new_name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MoveNotePayload {
    workspace_path: String,
    note_path: String,
    target_folder_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeleteItemPayload {
    workspace_path: String,
    item_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MoveItemPayload {
    workspace_path: String,
    item_path: String,
    target_folder_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GlobalSearchPayload {
    workspace_path: String,
    query: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GitStatusPayload {
    workspace_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GitSyncPayload {
    workspace_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdvancedGitStatusPayload {
    workspace_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GitHubRemotePayload {
    workspace_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConnectGitHubRemotePayload {
    workspace_path: String,
    remote_url: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CloneGitHubRepositoryPayload {
    repository_url: String,
    destination_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResolveGitConflictPayload {
    workspace_path: String,
    note_path: String,
    resolution: ConflictResolution,
}

#[derive(Debug, Deserialize)]
struct StorePersonalAccessTokenPayload {
    token: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct NoteContent {
    content: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenedWorkspace {
    name: String,
    path: String,
    tree: Vec<WorkspaceTreeItem>,
    metadata: WorkspaceMetadata,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceMetadata {
    last_note_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SharedWorkspaceMetadata {
    schema_version: u8,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LocalWorkspaceMetadata {
    schema_version: u8,
    last_note_path: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct FilesystemOperationResult {
    tree: Vec<WorkspaceTreeItem>,
    item_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct GlobalSearchResults {
    results: Vec<GlobalSearchResult>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct GlobalSearchResult {
    note_path: String,
    line_number: usize,
    line_text: String,
    match_start: usize,
    match_end: usize,
}

#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct GitWorkspaceStatus {
    is_repository: bool,
    has_remote: bool,
    sync_status: SyncStatus,
    conflicted_files: Vec<String>,
}

#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct GitCommit {
    id: String,
    subject: String,
    timestamp: String,
}

#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdvancedGitStatus {
    is_repository: bool,
    repository: Option<String>,
    branch: Option<String>,
    latest_commit: Option<GitCommit>,
    pending_changes: Vec<String>,
}

#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct GitSyncResult {
    status: SyncResultStatus,
    message: String,
    conflicted_files: Vec<String>,
}

#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct GitHubRemote {
    name: String,
    url: String,
}

#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct GitHubRemoteStatus {
    remote: Option<GitHubRemote>,
}

#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct GitHubCloneResult {
    workspace_path: String,
}

#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
enum SyncStatus {
    Sincronizado,
    CambiosLocales,
    SinGit,
    SinRemoto,
    Conflicto,
}

#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
enum SyncResultStatus {
    Synced,
    Conflict,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
enum ConflictResolution {
    Local,
    Remote,
    Manual,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
enum GitHubAuthState {
    Connected,
    Disconnected,
    Pending,
    Expired,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct GitHubAuthStatus {
    state: GitHubAuthState,
    message: Option<String>,
}

trait GitHubCredentialStore {
    fn access_token(&self) -> Result<Option<String>, String>;
    fn store_access_token(&self, token: &str) -> Result<(), String>;
    fn clear_access_token(&self) -> Result<(), String>;
}

struct SystemCredentialStore;

impl GitHubCredentialStore for SystemCredentialStore {
    fn access_token(&self) -> Result<Option<String>, String> {
        let output = Command::new("secret-tool")
            .args(["lookup", "service", "simpler", "account", "github"])
            .output()
            .map_err(|error| format!("failed to access the system keychain: {error}"))?;

        if output.status.code() == Some(1) {
            return Ok(None);
        }
        if !output.status.success() {
            return Err("failed to read the GitHub credential from the system keychain".to_string());
        }

        Ok(Some(String::from_utf8_lossy(&output.stdout).trim().to_string()).filter(|token| !token.is_empty()))
    }

    fn store_access_token(&self, token: &str) -> Result<(), String> {
        let mut child = Command::new("secret-tool")
            .args([
                "store",
                "--label=Simpler GitHub access token",
                "service",
                "simpler",
                "account",
                "github",
            ])
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|error| format!("failed to access the system keychain: {error}"))?;
        child
            .stdin
            .take()
            .ok_or_else(|| "failed to write the GitHub credential to the system keychain".to_string())?
            .write_all(token.as_bytes())
            .map_err(|error| format!("failed to write the GitHub credential to the system keychain: {error}"))?;
        let status = child
            .wait()
            .map_err(|error| format!("failed to store the GitHub credential in the system keychain: {error}"))?;
        if status.success() {
            Ok(())
        } else {
            Err("failed to store the GitHub credential in the system keychain".to_string())
        }
    }

    fn clear_access_token(&self) -> Result<(), String> {
        let status = Command::new("secret-tool")
            .args(["clear", "service", "simpler", "account", "github"])
            .status()
            .map_err(|error| format!("failed to access the system keychain: {error}"))?;
        if status.success() {
            Ok(())
        } else {
            Err("failed to remove the GitHub credential from the system keychain".to_string())
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct DeviceFlowStart {
    device_code: String,
    user_code: String,
    verification_uri: String,
    expires_in: u64,
    interval: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct DeviceFlowInstructions {
    user_code: String,
    verification_uri: String,
    expires_in: u64,
    interval: u64,
}

enum DeviceFlowPoll {
    Pending,
    Connected(String),
    Expired,
    Failed(String),
}

trait GitHubDeviceFlowClient {
    fn start(&self) -> Result<DeviceFlowStart, String>;
    fn poll(&self, device_code: &str) -> DeviceFlowPoll;
}

struct SystemGitHubDeviceFlowClient;

impl GitHubDeviceFlowClient for SystemGitHubDeviceFlowClient {
    fn start(&self) -> Result<DeviceFlowStart, String> {
        let client_id = github_oauth_client_id()?;
        let value = github_device_flow_request(
            "https://github.com/login/device/code",
            &[format!("client_id={client_id}")],
        )?;
        Ok(DeviceFlowStart {
            device_code: required_json_string(&value, "device_code")?,
            user_code: required_json_string(&value, "user_code")?,
            verification_uri: required_json_string(&value, "verification_uri")?,
            expires_in: required_json_u64(&value, "expires_in")?,
            interval: value.get("interval").and_then(serde_json::Value::as_u64).unwrap_or(5),
        })
    }

    fn poll(&self, device_code: &str) -> DeviceFlowPoll {
        let client_id = match github_oauth_client_id() {
            Ok(client_id) => client_id,
            Err(error) => return DeviceFlowPoll::Failed(error),
        };
        let value = match github_device_flow_request(
            "https://github.com/login/oauth/access_token",
            &[format!("client_id={client_id}"), format!("device_code={device_code}"), "grant_type=urn:ietf:params:oauth:grant-type:device_code".to_string()],
        ) {
            Ok(value) => value,
            Err(error) => return DeviceFlowPoll::Failed(error),
        };
        if let Some(token) = value.get("access_token").and_then(serde_json::Value::as_str) {
            return DeviceFlowPoll::Connected(token.to_string());
        }
        match value.get("error").and_then(serde_json::Value::as_str) {
            Some("authorization_pending") | Some("slow_down") => DeviceFlowPoll::Pending,
            Some("expired_token") => DeviceFlowPoll::Expired,
            Some(error) => DeviceFlowPoll::Failed(error.to_string()),
            None => DeviceFlowPoll::Failed("GitHub returned an invalid device-flow response".to_string()),
        }
    }
}

fn github_oauth_client_id() -> Result<String, String> {
    std::env::var("SIMPLER_GITHUB_CLIENT_ID")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "GitHub OAuth is not configured for this build".to_string())
}

fn github_device_flow_request(url: &str, fields: &[String]) -> Result<serde_json::Value, String> {
    let mut child = Command::new("curl")
        .args(["--fail-with-body", "--silent", "--show-error", "--request", "POST", "--header", "Accept: application/json"])
        .args(["--data", "@-"])
        .arg(url)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .spawn()
        .map_err(|error| format!("failed to start GitHub device flow: {error}"))?;
    child
        .stdin
        .take()
        .ok_or_else(|| "failed to send the GitHub device-flow request".to_string())?
        .write_all(fields.join("&").as_bytes())
        .map_err(|error| format!("failed to send the GitHub device-flow request: {error}"))?;
    let output = child
        .wait_with_output()
        .map_err(|error| format!("failed to complete GitHub device flow: {error}"))?;
    if !output.status.success() {
        return Err("GitHub device flow request failed".to_string());
    }
    serde_json::from_slice(&output.stdout).map_err(|_| "GitHub returned an invalid device-flow response".to_string())
}

fn required_json_string(value: &serde_json::Value, field: &str) -> Result<String, String> {
    value.get(field).and_then(serde_json::Value::as_str).map(ToString::to_string)
        .ok_or_else(|| "GitHub returned an invalid device-flow response".to_string())
}

fn required_json_u64(value: &serde_json::Value, field: &str) -> Result<u64, String> {
    value.get(field).and_then(serde_json::Value::as_u64)
        .ok_or_else(|| "GitHub returned an invalid device-flow response".to_string())
}

static DEVICE_FLOW: OnceLock<Mutex<Option<DeviceFlowStart>>> = OnceLock::new();

fn github_auth_status(keychain: &impl GitHubCredentialStore) -> GitHubAuthStatus {
    match keychain.access_token() {
        Ok(Some(_)) => GitHubAuthStatus {
            state: GitHubAuthState::Connected,
            message: None,
        },
        Ok(None) => GitHubAuthStatus {
            state: GitHubAuthState::Disconnected,
            message: None,
        },
        Err(error) => GitHubAuthStatus {
            state: GitHubAuthState::Failed,
            message: Some(error),
        },
    }
}

fn finish_github_device_flow(
    device_flow: &impl GitHubDeviceFlowClient,
    keychain: &impl GitHubCredentialStore,
    device_code: &str,
) -> GitHubAuthStatus {
    match device_flow.poll(device_code) {
        DeviceFlowPoll::Pending => GitHubAuthStatus { state: GitHubAuthState::Pending, message: None },
        DeviceFlowPoll::Connected(token) => match keychain.store_access_token(&token) {
            Ok(()) => GitHubAuthStatus { state: GitHubAuthState::Connected, message: None },
            Err(error) => GitHubAuthStatus { state: GitHubAuthState::Failed, message: Some(error) },
        },
        DeviceFlowPoll::Expired => GitHubAuthStatus {
            state: GitHubAuthState::Expired,
            message: Some("GitHub device-flow code expired".to_string()),
        },
        DeviceFlowPoll::Failed(error) => GitHubAuthStatus { state: GitHubAuthState::Failed, message: Some(error) },
    }
}

#[derive(Debug, PartialEq, Eq)]
struct GitCommandOutput {
    status_code: Option<i32>,
    stdout: String,
    stderr: String,
}

trait GitCommandRunner {
    fn run(&self, workspace_path: &Path, args: &[&str]) -> Result<GitCommandOutput, String>;
}

struct SystemGitCommandRunner;

impl GitCommandRunner for SystemGitCommandRunner {
    fn run(&self, workspace_path: &Path, args: &[&str]) -> Result<GitCommandOutput, String> {
        let output = Command::new("git")
            .args(args)
            .current_dir(workspace_path)
            .output()
            .map_err(|error| format!("failed to run git: {error}"))?;

        Ok(GitCommandOutput {
            status_code: output.status.code(),
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        })
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceTreeItem {
    name: String,
    path: String,
    kind: WorkspaceTreeItemKind,
    children: Vec<WorkspaceTreeItem>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "kebab-case")]
enum WorkspaceTreeItemKind {
    Folder,
    Note,
}

pub fn dispatch_native_command(request: NativeCommandRequest) -> NativeCommandResponse {
    if request.domain == NativeDomain::Workspace && request.action == "open" {
        return native_response(request, open_workspace_payload);
    }

    if request.domain == NativeDomain::Workspace && request.action == "remember-note" {
        return native_response(request, remember_note_payload);
    }

    if request.domain == NativeDomain::Filesystem && request.action == "read-note" {
        return native_response(request, read_note_payload);
    }

    if request.domain == NativeDomain::Filesystem && request.action == "write-note" {
        return native_response(request, write_note_payload);
    }

    if request.domain == NativeDomain::Filesystem && request.action == "create-folder" {
        return native_response(request, create_folder_payload);
    }

    if request.domain == NativeDomain::Filesystem && request.action == "create-note" {
        return native_response(request, create_note_payload);
    }

    if request.domain == NativeDomain::Filesystem && request.action == "rename-item" {
        return native_response(request, rename_item_payload);
    }

    if request.domain == NativeDomain::Filesystem && request.action == "move-note" {
        return native_response(request, move_note_payload);
    }

    if request.domain == NativeDomain::Filesystem && request.action == "delete-item" {
        return native_response(request, delete_item_payload);
    }

    if request.domain == NativeDomain::Filesystem && request.action == "move-item" {
        return native_response(request, move_item_payload);
    }

    if request.domain == NativeDomain::Filesystem && request.action == "global-search" {
        return native_response(request, global_search_payload);
    }

    if request.domain == NativeDomain::Git && request.action == "status" {
        return native_response(request, git_status_payload);
    }

    if request.domain == NativeDomain::Git && request.action == "advanced-status" {
        return native_response(request, advanced_git_status_payload);
    }

    if request.domain == NativeDomain::Git && request.action == "sync" {
        return native_response(request, git_sync_payload);
    }

    if request.domain == NativeDomain::Git && request.action == "github-remote" {
        return native_response(request, github_remote_payload);
    }

    if request.domain == NativeDomain::Git && request.action == "connect-github-remote" {
        return native_response(request, connect_github_remote_payload);
    }

    if request.domain == NativeDomain::Git && request.action == "clone-github-repository" {
        return native_response(request, clone_github_repository_payload);
    }

    if request.domain == NativeDomain::Git && request.action == "resolve-conflict" {
        return native_response(request, resolve_git_conflict_payload);
    }

    if request.domain == NativeDomain::Auth && request.action == "status" {
        return native_response(request, github_auth_status_payload);
    }

    if request.domain == NativeDomain::Auth && request.action == "start-device-flow" {
        return native_response(request, start_github_device_flow_payload);
    }

    if request.domain == NativeDomain::Auth && request.action == "poll-device-flow" {
        return native_response(request, poll_github_device_flow_payload);
    }

    if request.domain == NativeDomain::Auth && request.action == "store-personal-access-token" {
        return native_response(request, store_personal_access_token_payload);
    }

    if request.domain == NativeDomain::Auth && request.action == "disconnect" {
        return native_response(request, disconnect_github_payload);
    }

    NativeCommandResponse {
        ok: false,
        domain: request.domain,
        action: request.action,
        data: None,
        error: Some("unsupported native command".to_string()),
    }
}

fn github_auth_status_payload(_: serde_json::Value) -> Result<serde_json::Value, String> {
    serde_json::to_value(github_auth_status(&SystemCredentialStore))
        .map_err(|_| "failed to serialize GitHub auth status".to_string())
}

fn start_github_device_flow_payload(_: serde_json::Value) -> Result<serde_json::Value, String> {
    let flow = SystemGitHubDeviceFlowClient.start()?;
    let instructions = DeviceFlowInstructions {
        user_code: flow.user_code.clone(),
        verification_uri: flow.verification_uri.clone(),
        expires_in: flow.expires_in,
        interval: flow.interval,
    };
    let session = DEVICE_FLOW.get_or_init(|| Mutex::new(None));
    *session.lock().map_err(|_| "GitHub device flow is unavailable".to_string())? = Some(flow);
    serde_json::to_value(instructions).map_err(|_| "failed to serialize GitHub device flow".to_string())
}

fn poll_github_device_flow_payload(_: serde_json::Value) -> Result<serde_json::Value, String> {
    let session = DEVICE_FLOW.get_or_init(|| Mutex::new(None));
    let mut session = session.lock().map_err(|_| "GitHub device flow is unavailable".to_string())?;
    let flow = session.as_ref().ok_or_else(|| "GitHub device flow has not been started".to_string())?;
    let status = finish_github_device_flow(&SystemGitHubDeviceFlowClient, &SystemCredentialStore, &flow.device_code);
    if matches!(status.state, GitHubAuthState::Connected | GitHubAuthState::Expired) {
        *session = None;
    }
    serde_json::to_value(status).map_err(|_| "failed to serialize GitHub auth status".to_string())
}

fn store_personal_access_token_payload(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let payload: StorePersonalAccessTokenPayload = serde_json::from_value(payload)
        .map_err(|_| "token is required".to_string())?;
    if payload.token.trim().is_empty() {
        return Err("token is required".to_string());
    }
    SystemCredentialStore.store_access_token(payload.token.trim())?;
    serde_json::to_value(GitHubAuthStatus { state: GitHubAuthState::Connected, message: None })
        .map_err(|_| "failed to serialize GitHub auth status".to_string())
}

fn disconnect_github_payload(_: serde_json::Value) -> Result<serde_json::Value, String> {
    SystemCredentialStore.clear_access_token()?;
    serde_json::to_value(GitHubAuthStatus { state: GitHubAuthState::Disconnected, message: None })
        .map_err(|_| "failed to serialize GitHub auth status".to_string())
}

fn native_response(
    request: NativeCommandRequest,
    operation: fn(serde_json::Value) -> Result<serde_json::Value, String>,
) -> NativeCommandResponse {
    match operation(request.payload) {
        Ok(data) => NativeCommandResponse {
            ok: true,
            domain: request.domain,
            action: request.action,
            data: Some(data),
            error: None,
        },
        Err(error) => NativeCommandResponse {
            ok: false,
            domain: request.domain,
            action: request.action,
            data: None,
            error: Some(error),
        },
    }
}

fn read_note_payload(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let payload: ReadNotePayload = serde_json::from_value(payload)
        .map_err(|_| "workspacePath and notePath are required".to_string())?;
    let note_path = resolve_note_path(&payload.workspace_path, &payload.note_path)?;
    if !note_path.exists() {
        return Err("note file is missing".to_string());
    }
    let content =
        fs::read_to_string(&note_path).map_err(|error| format!("failed to read note: {error}"))?;
    serde_json::to_value(NoteContent { content })
        .map_err(|_| "failed to serialize note".to_string())
}

fn write_note_payload(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let payload: WriteNotePayload = serde_json::from_value(payload)
        .map_err(|_| "workspacePath, notePath, and content are required".to_string())?;
    let note_path = resolve_note_path(&payload.workspace_path, &payload.note_path)?;
    fs::write(&note_path, &payload.content)
        .map_err(|error| format!("failed to save note: {error}"))?;
    serde_json::to_value(NoteContent {
        content: payload.content,
    })
    .map_err(|_| "failed to serialize note".to_string())
}

fn create_folder_payload(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let payload: CreateFolderPayload = serde_json::from_value(payload)
        .map_err(|_| "workspacePath, parentPath, and folderName are required".to_string())?;
    let workspace_path = PathBuf::from(&payload.workspace_path);
    ensure_workspace_folder(&workspace_path)?;
    let parent_path = resolve_workspace_folder(&workspace_path, &payload.parent_path)?;
    let folder_name = sanitize_child_name(&payload.folder_name)?;
    let folder_path = parent_path.join(&folder_name);

    if folder_path.exists() {
        return Err("folder already exists".to_string());
    }

    fs::create_dir(&folder_path).map_err(|error| format!("failed to create folder: {error}"))?;
    workspace_operation_result(&workspace_path, &folder_path)
}

fn create_note_payload(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let payload: CreateNotePayload = serde_json::from_value(payload)
        .map_err(|_| "workspacePath, parentPath, and noteName are required".to_string())?;
    let workspace_path = PathBuf::from(&payload.workspace_path);
    ensure_workspace_folder(&workspace_path)?;
    let parent_path = resolve_workspace_folder(&workspace_path, &payload.parent_path)?;
    let note_name = normalize_note_name(&payload.note_name)?;
    let note_path = parent_path.join(&note_name);

    if note_path.exists() {
        return Err("note already exists".to_string());
    }

    fs::write(&note_path, "").map_err(|error| format!("failed to create note: {error}"))?;
    workspace_operation_result(&workspace_path, &note_path)
}

fn rename_item_payload(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let payload: RenameItemPayload = serde_json::from_value(payload)
        .map_err(|_| "workspacePath, itemPath, and newName are required".to_string())?;
    let workspace_path = PathBuf::from(&payload.workspace_path);
    ensure_workspace_folder(&workspace_path)?;
    let item_path = resolve_workspace_path(&workspace_path, &payload.item_path)?;
    let metadata =
        fs::metadata(&item_path).map_err(|error| format!("failed to read item: {error}"))?;
    let new_name = if metadata.is_file() {
        normalize_note_name(&payload.new_name)?
    } else if metadata.is_dir() {
        sanitize_child_name(&payload.new_name)?
    } else {
        return Err("item must be a note or folder".to_string());
    };
    let target_path = item_path
        .parent()
        .ok_or_else(|| "cannot rename workspace root".to_string())?
        .join(new_name);

    if target_path.exists() {
        return Err("item already exists".to_string());
    }

    fs::rename(&item_path, &target_path)
        .map_err(|error| format!("failed to rename item: {error}"))?;
    workspace_operation_result(&workspace_path, &target_path)
}

fn move_note_payload(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let payload: MoveNotePayload = serde_json::from_value(payload)
        .map_err(|_| "workspacePath, notePath, and targetFolderPath are required".to_string())?;
    let workspace_path = PathBuf::from(&payload.workspace_path);
    ensure_workspace_folder(&workspace_path)?;
    let note_path = resolve_note_path(&payload.workspace_path, &payload.note_path)?;
    if !note_path.is_file() {
        return Err("note path must exist".to_string());
    }
    let target_folder = resolve_workspace_folder(&workspace_path, &payload.target_folder_path)?;
    let file_name = note_path
        .file_name()
        .ok_or_else(|| "note path must include a file name".to_string())?;
    let target_path = target_folder.join(file_name);

    if target_path.exists() {
        return Err("note already exists in target folder".to_string());
    }

    fs::rename(&note_path, &target_path)
        .map_err(|error| format!("failed to move note: {error}"))?;
    workspace_operation_result(&workspace_path, &target_path)
}

fn delete_item_payload(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let payload: DeleteItemPayload = serde_json::from_value(payload)
        .map_err(|_| "workspacePath and itemPath are required".to_string())?;
    let workspace_path = PathBuf::from(&payload.workspace_path);
    ensure_workspace_folder(&workspace_path)?;

    if payload.item_path.trim().is_empty() {
        return Err("cannot delete the workspace root".to_string());
    }

    let item_path = resolve_workspace_path(&workspace_path, &payload.item_path)?;
    let metadata =
        fs::metadata(&item_path).map_err(|error| format!("failed to read item: {error}"))?;
    let parent_path = item_path
        .parent()
        .ok_or_else(|| "cannot delete the workspace root".to_string())?
        .to_path_buf();

    if metadata.is_file() {
        fs::remove_file(&item_path).map_err(|error| format!("failed to delete note: {error}"))?;
    } else if metadata.is_dir() {
        fs::remove_dir_all(&item_path).map_err(|error| format!("failed to delete folder: {error}"))?;
    } else {
        return Err("item must be a note or folder".to_string());
    }

    workspace_operation_result(&workspace_path, &parent_path)
}

fn move_item_payload(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let payload: MoveItemPayload = serde_json::from_value(payload)
        .map_err(|_| "workspacePath, itemPath, and targetFolderPath are required".to_string())?;
    let workspace_path = PathBuf::from(&payload.workspace_path);
    ensure_workspace_folder(&workspace_path)?;
    let item_path = resolve_workspace_path(&workspace_path, &payload.item_path)?;
    let metadata =
        fs::metadata(&item_path).map_err(|error| format!("failed to read item: {error}"))?;
    let target_folder = resolve_workspace_folder(&workspace_path, &payload.target_folder_path)?;

    if metadata.is_dir() && (target_folder == item_path || target_folder.starts_with(&item_path)) {
        return Err("cannot move a folder inside itself".to_string());
    }

    let file_name = item_path
        .file_name()
        .ok_or_else(|| "cannot move the workspace root".to_string())?;
    let target_path = target_folder.join(file_name);

    if target_path == item_path {
        return workspace_operation_result(&workspace_path, &item_path);
    }

    if target_path.exists() {
        return Err("an item with that name already exists in the target folder".to_string());
    }

    fs::rename(&item_path, &target_path)
        .map_err(|error| format!("failed to move item: {error}"))?;
    workspace_operation_result(&workspace_path, &target_path)
}

fn global_search_payload(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let payload: GlobalSearchPayload = serde_json::from_value(payload)
        .map_err(|_| "workspacePath and query are required".to_string())?;
    let workspace_path = PathBuf::from(&payload.workspace_path);
    ensure_workspace_folder(&workspace_path)?;
    let query = payload.query.trim();

    if query.is_empty() {
        return serde_json::to_value(GlobalSearchResults {
            results: Vec::new(),
        })
        .map_err(|_| "failed to serialize search results".to_string());
    }

    let mut results = Vec::new();
    search_markdown_files(&workspace_path, &workspace_path, query, &mut results)?;
    serde_json::to_value(GlobalSearchResults { results })
        .map_err(|_| "failed to serialize search results".to_string())
}

fn git_status_payload(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let payload: GitStatusPayload =
        serde_json::from_value(payload).map_err(|_| "workspacePath is required".to_string())?;
    let workspace_path = PathBuf::from(&payload.workspace_path);
    ensure_workspace_folder(&workspace_path)?;
    let status = read_git_workspace_status(&workspace_path, &SystemGitCommandRunner)?;

    serde_json::to_value(status).map_err(|_| "failed to serialize git status".to_string())
}

fn advanced_git_status_payload(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let payload: AdvancedGitStatusPayload = serde_json::from_value(payload)
        .map_err(|_| "workspacePath is required".to_string())?;
    let workspace_path = PathBuf::from(payload.workspace_path);
    ensure_workspace_folder(&workspace_path)?;
    let status = read_advanced_git_status(&workspace_path, &SystemGitCommandRunner)?;

    serde_json::to_value(status).map_err(|_| "failed to serialize advanced Git status".to_string())
}

fn git_sync_payload(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let payload: GitSyncPayload =
        serde_json::from_value(payload).map_err(|_| "workspacePath is required".to_string())?;
    let workspace_path = PathBuf::from(&payload.workspace_path);
    ensure_workspace_folder(&workspace_path)?;
    let result = sync_git_workspace(&workspace_path, &SystemGitCommandRunner)?;

    serde_json::to_value(result).map_err(|_| "failed to serialize git sync result".to_string())
}

fn github_remote_payload(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let payload: GitHubRemotePayload =
        serde_json::from_value(payload).map_err(|_| "workspacePath is required".to_string())?;
    let workspace_path = PathBuf::from(payload.workspace_path);
    ensure_workspace_folder(&workspace_path)?;
    let status = github_remote_status(&workspace_path, &SystemGitCommandRunner)?;

    serde_json::to_value(status).map_err(|_| "failed to serialize GitHub remote status".to_string())
}

fn connect_github_remote_payload(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let payload: ConnectGitHubRemotePayload = serde_json::from_value(payload)
        .map_err(|_| "workspacePath and remoteUrl are required".to_string())?;
    let workspace_path = PathBuf::from(payload.workspace_path);
    ensure_workspace_folder(&workspace_path)?;
    let remote = connect_github_remote(&workspace_path, &payload.remote_url, &SystemGitCommandRunner)?;

    serde_json::to_value(remote).map_err(|_| "failed to serialize GitHub remote".to_string())
}

fn clone_github_repository_payload(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let payload: CloneGitHubRepositoryPayload = serde_json::from_value(payload)
        .map_err(|_| "repositoryUrl and destinationPath are required".to_string())?;
    let destination_path = PathBuf::from(payload.destination_path);
    let result = clone_github_repository(&payload.repository_url, &destination_path, &SystemGitCommandRunner)?;

    serde_json::to_value(result).map_err(|_| "failed to serialize GitHub clone result".to_string())
}

fn resolve_git_conflict_payload(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let payload: ResolveGitConflictPayload = serde_json::from_value(payload)
        .map_err(|_| "workspacePath, notePath, and resolution are required".to_string())?;
    let workspace_path = PathBuf::from(&payload.workspace_path);
    ensure_workspace_folder(&workspace_path)?;
    resolve_note_path(&payload.workspace_path, &payload.note_path)?;
    let result = resolve_git_conflict(
        &workspace_path,
        &payload.note_path,
        payload.resolution,
        &SystemGitCommandRunner,
    )?;

    serde_json::to_value(result).map_err(|_| "failed to serialize conflict resolution".to_string())
}

fn read_git_workspace_status(
    workspace_path: &Path,
    git: &impl GitCommandRunner,
) -> Result<GitWorkspaceStatus, String> {
    let repo_probe = git.run(workspace_path, &["rev-parse", "--is-inside-work-tree"])?;

    if !git_command_succeeded(&repo_probe) {
        if git_command_reports_non_repository(&repo_probe) {
            return Ok(GitWorkspaceStatus {
                is_repository: false,
                has_remote: false,
                sync_status: SyncStatus::SinGit,
                conflicted_files: Vec::new(),
            });
        }

        return Err(git_failure("failed to detect git repository", &repo_probe));
    }

    if repo_probe.stdout.trim() != "true" {
        return Ok(GitWorkspaceStatus {
            is_repository: false,
            has_remote: false,
            sync_status: SyncStatus::SinGit,
            conflicted_files: Vec::new(),
        });
    }

    let remote_output = git.run(workspace_path, &["remote"])?;
    if !git_command_succeeded(&remote_output) {
        return Err(git_failure("failed to detect git remotes", &remote_output));
    }
    let has_remote = remote_output
        .stdout
        .lines()
        .any(|remote| !remote.trim().is_empty());

    let status_output = git.run(workspace_path, &["status", "--porcelain"])?;
    if !git_command_succeeded(&status_output) {
        return Err(git_failure("failed to read git status", &status_output));
    }
    let conflicted_files = conflicted_markdown_files(workspace_path, git)?;
    let has_changes = !status_output.stdout.trim().is_empty();

    let sync_status = if !conflicted_files.is_empty() {
        SyncStatus::Conflicto
    } else if !has_remote {
        SyncStatus::SinRemoto
    } else if has_changes {
        SyncStatus::CambiosLocales
    } else {
        SyncStatus::Sincronizado
    };

    Ok(GitWorkspaceStatus {
        is_repository: true,
        has_remote,
        sync_status,
        conflicted_files,
    })
}

fn read_advanced_git_status(
    workspace_path: &Path,
    git: &impl GitCommandRunner,
) -> Result<AdvancedGitStatus, String> {
    let repo_probe = git.run(workspace_path, &["rev-parse", "--is-inside-work-tree"])?;
    if !git_command_succeeded(&repo_probe) {
        if git_command_reports_non_repository(&repo_probe) {
            return Ok(AdvancedGitStatus {
                is_repository: false,
                repository: None,
                branch: None,
                latest_commit: None,
                pending_changes: Vec::new(),
            });
        }
        return Err(git_failure("failed to detect git repository", &repo_probe));
    }

    let branch_output = git.run(workspace_path, &["branch", "--show-current"])?;
    if !git_command_succeeded(&branch_output) {
        return Err(git_failure("failed to detect current branch", &branch_output));
    }
    let remote_output = git.run(workspace_path, &["remote", "get-url", "origin"])?;
    let repository = if git_command_succeeded(&remote_output) {
        let url = remote_output.stdout.trim();
        (!url.is_empty()).then(|| url.to_string())
    } else {
        None
    };
    let commit_output = git.run(workspace_path, &["log", "-1", "--format=%h%x1f%s%x1f%cI"])?;
    let latest_commit = if git_command_succeeded(&commit_output) {
        commit_output.stdout.trim().split_once('\u{1f}').and_then(|(id, rest)| {
            rest.split_once('\u{1f}').map(|(subject, timestamp)| GitCommit {
                id: id.to_string(),
                subject: subject.to_string(),
                timestamp: timestamp.to_string(),
            })
        })
    } else {
        None
    };
    let pending_output = git.run(workspace_path, &["status", "--porcelain"])?;
    if !git_command_succeeded(&pending_output) {
        return Err(git_failure("failed to read git status", &pending_output));
    }

    Ok(AdvancedGitStatus {
        is_repository: true,
        repository,
        branch: (!branch_output.stdout.trim().is_empty()).then(|| branch_output.stdout.trim().to_string()),
        latest_commit,
        pending_changes: pending_output
            .stdout
            .lines()
            .filter_map(|line| line.get(3..).map(str::trim))
            .filter(|path| !path.is_empty())
            .map(ToString::to_string)
            .collect(),
    })
}

fn github_remote_status(
    workspace_path: &Path,
    git: &impl GitCommandRunner,
) -> Result<GitHubRemoteStatus, String> {
    let remote_output = git.run(workspace_path, &["remote"])?;
    if !git_command_succeeded(&remote_output) {
        if git_command_reports_non_repository(&remote_output) {
            return Ok(GitHubRemoteStatus { remote: None });
        }
        return Err(git_failure("failed to detect Git remotes", &remote_output));
    }

    for remote_name in remote_output.stdout.lines().map(str::trim).filter(|name| !name.is_empty()) {
        let url_output = git.run(workspace_path, &["remote", "get-url", remote_name])?;
        if !git_command_succeeded(&url_output) {
            return Err(git_failure("failed to read Git remote URL", &url_output));
        }
        let url = url_output.stdout.trim();
        if is_github_repository_url(url) {
            return Ok(GitHubRemoteStatus {
                remote: Some(GitHubRemote {
                    name: remote_name.to_string(),
                    url: url.to_string(),
                }),
            });
        }
    }

    Ok(GitHubRemoteStatus { remote: None })
}

fn connect_github_remote(
    workspace_path: &Path,
    remote_url: &str,
    git: &impl GitCommandRunner,
) -> Result<GitHubRemote, String> {
    let remote_url = normalize_github_repository_url(remote_url)?;
    let repo_probe = git.run(workspace_path, &["rev-parse", "--is-inside-work-tree"])?;
    if !git_command_succeeded(&repo_probe) {
        if !git_command_reports_non_repository(&repo_probe) {
            return Err(git_failure("failed to detect git repository", &repo_probe));
        }

        run_git_step(
            git,
            workspace_path,
            &["init", "--initial-branch=main"],
            "failed to initialize Git repository",
        )?;
    }

    run_git_step(
        git,
        workspace_path,
        &["remote", "add", "origin", remote_url],
        "failed to connect GitHub remote",
    )?;

    Ok(GitHubRemote {
        name: "origin".to_string(),
        url: remote_url.to_string(),
    })
}

fn clone_github_repository(
    repository_url: &str,
    destination_path: &Path,
    git: &impl GitCommandRunner,
) -> Result<GitHubCloneResult, String> {
    let repository_url = normalize_github_repository_url(repository_url)?;
    let destination = destination_path
        .to_str()
        .filter(|path| !path.trim().is_empty())
        .ok_or_else(|| "A destination folder is required".to_string())?;
    let parent = destination_path
        .parent()
        .filter(|path| path.is_dir())
        .ok_or_else(|| "The destination folder's parent must exist".to_string())?;

    run_git_step(
        git,
        parent,
        &["clone", repository_url, destination],
        "failed to clone GitHub repository",
    )?;

    Ok(GitHubCloneResult {
        workspace_path: destination.to_string(),
    })
}

fn normalize_github_repository_url(repository_url: &str) -> Result<&str, String> {
    let repository_url = repository_url.trim();
    if is_github_repository_url(repository_url) {
        Ok(repository_url)
    } else {
        Err("A GitHub repository URL is required".to_string())
    }
}

fn is_github_repository_url(repository_url: &str) -> bool {
    [
        "https://github.com/",
        "http://github.com/",
        "git@github.com:",
        "ssh://git@github.com/",
        "git://github.com/",
    ]
    .iter()
    .any(|prefix| repository_url.starts_with(prefix))
        && repository_url
            .trim_end_matches('/')
            .rsplit_once(['/', ':'])
            .is_some_and(|(_, repository)| !repository.is_empty())
}

fn sync_git_workspace(
    workspace_path: &Path,
    git: &impl GitCommandRunner,
) -> Result<GitSyncResult, String> {
    let status = read_git_workspace_status(workspace_path, git)?;

    if !status.is_repository {
        return Err("Sync requires a Git-backed Workspace".to_string());
    }

    if !status.has_remote {
        return Err("Sync requires a configured Git remote".to_string());
    }

    if !status.conflicted_files.is_empty() {
        return Ok(conflict_result(status.conflicted_files));
    }

    let branch_output = git.run(workspace_path, &["branch", "--show-current"])?;
    if !git_command_succeeded(&branch_output) {
        return Err(git_failure(
            "failed to detect current branch",
            &branch_output,
        ));
    }

    let branch = branch_output.stdout.trim();
    if branch.is_empty() {
        return Err("Sync requires a checked-out branch".to_string());
    }

    let remote_output = git.run(workspace_path, &["remote"])?;
    if !git_command_succeeded(&remote_output) {
        return Err(git_failure("failed to detect Git remote", &remote_output));
    }

    let remote = remote_output
        .stdout
        .lines()
        .map(str::trim)
        .find(|remote| !remote.is_empty())
        .ok_or_else(|| "Sync requires a configured Git remote".to_string())?;

    if status.sync_status == SyncStatus::CambiosLocales {
        run_git_step(
            git,
            workspace_path,
            &["add", "-A"],
            "failed to stage Sync changes",
        )?;
        run_git_step(
            git,
            workspace_path,
            &["commit", "-m", "Sync checkpoint"],
            "failed to commit Sync checkpoint",
        )?;
    }

    let remote_branch_output = git.run(workspace_path, &["ls-remote", "--heads", remote, branch])?;
    if !git_command_succeeded(&remote_branch_output) {
        return Err(git_failure(
            "failed to check remote branch before Sync",
            &remote_branch_output,
        ));
    }
    let remote_has_branch = !remote_branch_output.stdout.trim().is_empty();

    if remote_has_branch {
        let pull_output = git.run(workspace_path, &["pull", "--rebase", remote, branch])?;
        if !git_command_succeeded(&pull_output) {
            let conflicted_files = conflicted_markdown_files(workspace_path, git)?;
            if !conflicted_files.is_empty() {
                return Ok(conflict_result(conflicted_files));
            }
            return Err(git_failure(
                "failed to pull remote changes before Sync push",
                &pull_output,
            ));
        }
        run_git_step(
            git,
            workspace_path,
            &["push", remote, &format!("HEAD:{branch}")],
            "failed to push Sync checkpoint",
        )?;
    } else {
        run_git_step(
            git,
            workspace_path,
            &["push", "-u", remote, &format!("HEAD:{branch}")],
            "failed to push Sync checkpoint",
        )?;
    }

    Ok(GitSyncResult {
        status: SyncResultStatus::Synced,
        message: "Sync completed".to_string(),
        conflicted_files: Vec::new(),
    })
}

fn conflicted_markdown_files(
    workspace_path: &Path,
    git: &impl GitCommandRunner,
) -> Result<Vec<String>, String> {
    let output = git.run(workspace_path, &["diff", "--name-only", "--diff-filter=U"])?;
    if !git_command_succeeded(&output) {
        return Err(git_failure("failed to read Sync conflicts", &output));
    }

    Ok(output
        .stdout
        .lines()
        .map(str::trim)
        .filter(|path| !path.is_empty() && is_markdown_note(Path::new(path)))
        .map(str::to_string)
        .collect())
}

fn conflict_result(conflicted_files: Vec<String>) -> GitSyncResult {
    GitSyncResult {
        status: SyncResultStatus::Conflict,
        message: "Sync needs conflict resolution".to_string(),
        conflicted_files,
    }
}

fn resolve_git_conflict(
    workspace_path: &Path,
    note_path: &str,
    resolution: ConflictResolution,
    git: &impl GitCommandRunner,
) -> Result<GitSyncResult, String> {
    let conflicted_files = conflicted_markdown_files(workspace_path, git)?;
    if !conflicted_files.iter().any(|path| path == note_path) {
        return Err("note is not an unresolved Sync conflict".to_string());
    }

    match resolution {
        // During `pull --rebase`, Git's `theirs` is the local commit being replayed.
        ConflictResolution::Local => run_git_step(
            git,
            workspace_path,
            &["checkout", "--theirs", "--", note_path],
            "failed to choose the local version",
        )?,
        ConflictResolution::Remote => run_git_step(
            git,
            workspace_path,
            &["checkout", "--ours", "--", note_path],
            "failed to choose the remote version",
        )?,
        ConflictResolution::Manual => {}
    }
    run_git_step(
        git,
        workspace_path,
        &["add", "--", note_path],
        "failed to stage the conflict resolution",
    )?;

    let remaining = conflicted_markdown_files(workspace_path, git)?;
    if !remaining.is_empty() {
        return Ok(conflict_result(remaining));
    }

    run_git_step(
        git,
        workspace_path,
        &["-c", "core.editor=true", "rebase", "--continue"],
        "failed to continue Sync after conflict resolution",
    )?;
    sync_git_workspace(workspace_path, git)
}

fn run_git_step(
    git: &impl GitCommandRunner,
    workspace_path: &Path,
    args: &[&str],
    context: &str,
) -> Result<(), String> {
    let output = git.run(workspace_path, args)?;

    if git_command_succeeded(&output) {
        Ok(())
    } else {
        Err(git_failure(context, &output))
    }
}

fn git_command_succeeded(output: &GitCommandOutput) -> bool {
    output.status_code == Some(0)
}

fn git_command_reports_non_repository(output: &GitCommandOutput) -> bool {
    output
        .stderr
        .to_lowercase()
        .contains("not a git repository")
}

fn git_failure(context: &str, output: &GitCommandOutput) -> String {
    let details = output.stderr.trim();

    if details.is_empty() {
        format!("{context}: git exited with status {:?}", output.status_code)
    } else {
        format!("{context}: {details}")
    }
}

fn resolve_note_path(workspace_path: &str, note_path: &str) -> Result<PathBuf, String> {
    if !is_markdown_note(Path::new(note_path)) {
        return Err("note path must be a Markdown file".to_string());
    }

    resolve_workspace_path(&PathBuf::from(workspace_path), note_path)
}

fn open_workspace_payload(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let payload: OpenWorkspacePayload =
        serde_json::from_value(payload).map_err(|_| "workspacePath is required".to_string())?;
    let workspace_path = PathBuf::from(payload.workspace_path);
    open_workspace(&workspace_path).and_then(|workspace| {
        serde_json::to_value(workspace)
            .map_err(|_| "failed to serialize workspace response".to_string())
    })
}

fn remember_note_payload(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let payload: RememberNotePayload = serde_json::from_value(payload)
        .map_err(|_| "workspacePath and notePath are required".to_string())?;
    let workspace_path = PathBuf::from(&payload.workspace_path);
    ensure_workspace_folder(&workspace_path)?;
    let note_path = resolve_note_path(&payload.workspace_path, &payload.note_path)?;

    if !note_path.is_file() {
        return Err("note file is missing".to_string());
    }

    let local_metadata = LocalWorkspaceMetadata {
        schema_version: 1,
        last_note_path: Some(payload.note_path),
    };
    write_local_workspace_metadata(&workspace_path, &local_metadata)?;
    serde_json::to_value(WorkspaceMetadata {
        last_note_path: local_metadata.last_note_path,
    })
    .map_err(|_| "failed to serialize workspace metadata".to_string())
}

fn open_workspace(workspace_path: &Path) -> Result<OpenedWorkspace, String> {
    ensure_workspace_folder(workspace_path)?;
    ensure_workspace_metadata(workspace_path)?;

    let name = workspace_path
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .unwrap_or("Workspace")
        .to_string();

    Ok(OpenedWorkspace {
        name,
        path: workspace_path.to_string_lossy().to_string(),
        tree: read_workspace_tree(workspace_path, workspace_path)?,
        metadata: read_workspace_metadata(workspace_path)?,
    })
}

fn ensure_workspace_metadata(workspace_path: &Path) -> Result<(), String> {
    let metadata_path = workspace_path.join(".simpler");
    let local_path = metadata_path.join("local");
    let cache_path = local_path.join("cache");
    fs::create_dir_all(&cache_path)
        .map_err(|error| format!("failed to create workspace metadata: {error}"))?;

    let gitignore_path = metadata_path.join(".gitignore");
    if !gitignore_path.exists() {
        fs::write(&gitignore_path, "local/\n")
            .map_err(|error| format!("failed to write workspace metadata ignore rules: {error}"))?;
    }

    let shared_metadata_path = metadata_path.join("workspace.json");
    if !shared_metadata_path.exists() {
        let shared_metadata = SharedWorkspaceMetadata { schema_version: 1 };
        write_json_file(&shared_metadata_path, &shared_metadata)?;
    }

    let local_metadata_path = local_path.join("state.json");
    if !local_metadata_path.exists() {
        let local_metadata = LocalWorkspaceMetadata {
            schema_version: 1,
            last_note_path: None,
        };
        write_json_file(&local_metadata_path, &local_metadata)?;
    }

    Ok(())
}

fn read_workspace_metadata(workspace_path: &Path) -> Result<WorkspaceMetadata, String> {
    let local_metadata = read_local_workspace_metadata(workspace_path)?;
    let last_note_path = local_metadata.last_note_path.filter(|note_path| {
        resolve_note_path(&workspace_path.to_string_lossy(), note_path)
            .is_ok_and(|path| path.is_file())
    });

    Ok(WorkspaceMetadata { last_note_path })
}

fn read_local_workspace_metadata(workspace_path: &Path) -> Result<LocalWorkspaceMetadata, String> {
    ensure_workspace_metadata(workspace_path)?;
    let metadata_path = workspace_path
        .join(".simpler")
        .join("local")
        .join("state.json");
    let content = fs::read_to_string(&metadata_path)
        .map_err(|error| format!("failed to read local workspace metadata: {error}"))?;

    serde_json::from_str(&content)
        .map_err(|error| format!("failed to parse local workspace metadata: {error}"))
}

fn write_local_workspace_metadata(
    workspace_path: &Path,
    metadata: &LocalWorkspaceMetadata,
) -> Result<(), String> {
    ensure_workspace_metadata(workspace_path)?;
    write_json_file(
        &workspace_path
            .join(".simpler")
            .join("local")
            .join("state.json"),
        metadata,
    )
}

fn write_json_file<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let content = serde_json::to_string_pretty(value)
        .map_err(|_| "failed to serialize workspace metadata".to_string())?;
    fs::write(path, format!("{content}\n"))
        .map_err(|error| format!("failed to write workspace metadata: {error}"))
}

fn workspace_operation_result(
    workspace_path: &Path,
    item_path: &Path,
) -> Result<serde_json::Value, String> {
    serde_json::to_value(FilesystemOperationResult {
        tree: read_workspace_tree(workspace_path, workspace_path)?,
        item_path: relative_workspace_path(workspace_path, item_path),
    })
    .map_err(|_| "failed to serialize filesystem response".to_string())
}

fn ensure_workspace_folder(workspace_path: &Path) -> Result<(), String> {
    let metadata = fs::metadata(workspace_path)
        .map_err(|error| format!("failed to open workspace: {error}"))?;

    if !metadata.is_dir() {
        return Err("workspace path must be a folder".to_string());
    }

    Ok(())
}

fn resolve_workspace_folder(workspace_path: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let folder_path = resolve_workspace_path(workspace_path, relative_path)?;

    if !folder_path.is_dir() {
        return Err("target path must be a folder".to_string());
    }

    Ok(folder_path)
}

fn resolve_workspace_path(workspace_path: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let path = Path::new(relative_path);

    if path.is_absolute() {
        return Err("workspace-relative path is required".to_string());
    }

    if path.components().any(|component| {
        matches!(
            component,
            std::path::Component::ParentDir
                | std::path::Component::Prefix(_)
                | std::path::Component::RootDir
        )
    }) {
        return Err("path must stay inside the workspace".to_string());
    }

    if path.components().any(|component| match component {
        std::path::Component::Normal(name) => name.to_str().is_some_and(is_hidden_or_internal),
        _ => false,
    }) {
        return Err("hidden or internal paths are not managed by the workspace tree".to_string());
    }

    Ok(workspace_path.join(path))
}

fn sanitize_child_name(name: &str) -> Result<String, String> {
    let trimmed = name.trim();

    if trimmed.is_empty() {
        return Err("name is required".to_string());
    }

    let path = Path::new(trimmed);
    if path.components().count() != 1 || trimmed == "." || trimmed == ".." {
        return Err("name must not include path separators".to_string());
    }

    if is_hidden_or_internal(trimmed) {
        return Err("hidden or internal names are not shown in the workspace tree".to_string());
    }

    Ok(trimmed.to_string())
}

fn normalize_note_name(name: &str) -> Result<String, String> {
    let child_name = sanitize_child_name(name)?;
    let path = Path::new(&child_name);

    if path.extension().is_none() {
        return Ok(format!("{child_name}.md"));
    }

    if !is_markdown_note(path) {
        return Err("note name must be a Markdown file".to_string());
    }

    Ok(child_name)
}

fn read_workspace_tree(
    root_path: &Path,
    current_path: &Path,
) -> Result<Vec<WorkspaceTreeItem>, String> {
    let mut items = Vec::new();
    let entries = fs::read_dir(current_path)
        .map_err(|error| format!("failed to read workspace tree: {error}"))?;

    for entry in entries {
        let entry = entry.map_err(|error| format!("failed to read workspace entry: {error}"))?;
        let path = entry.path();
        let file_name = entry.file_name();
        let Some(name) = file_name.to_str() else {
            continue;
        };

        if is_hidden_or_internal(name) {
            continue;
        }

        let metadata = entry
            .metadata()
            .map_err(|error| format!("failed to read workspace entry metadata: {error}"))?;

        if metadata.is_dir() {
            items.push(WorkspaceTreeItem {
                name: name.to_string(),
                path: relative_workspace_path(root_path, &path),
                kind: WorkspaceTreeItemKind::Folder,
                children: read_workspace_tree(root_path, &path)?,
            });
        } else if metadata.is_file() && is_markdown_note(&path) {
            items.push(WorkspaceTreeItem {
                name: name.to_string(),
                path: relative_workspace_path(root_path, &path),
                kind: WorkspaceTreeItemKind::Note,
                children: Vec::new(),
            });
        }
    }

    items.sort_by(|left, right| {
        folder_rank(left)
            .cmp(&folder_rank(right))
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });

    Ok(items)
}

fn search_markdown_files(
    root_path: &Path,
    current_path: &Path,
    query: &str,
    results: &mut Vec<GlobalSearchResult>,
) -> Result<(), String> {
    let mut entries = fs::read_dir(current_path)
        .map_err(|error| format!("failed to search workspace: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to read workspace search entry: {error}"))?;

    entries.sort_by(|left, right| left.file_name().cmp(&right.file_name()));

    for entry in entries {
        let path = entry.path();
        let file_name = entry.file_name();
        let Some(name) = file_name.to_str() else {
            continue;
        };

        if is_hidden_or_internal(name) {
            continue;
        }

        let metadata = entry
            .metadata()
            .map_err(|error| format!("failed to read workspace search metadata: {error}"))?;

        if metadata.is_dir() {
            search_markdown_files(root_path, &path, query, results)?;
        } else if metadata.is_file() && is_markdown_note(&path) {
            search_note_file(root_path, &path, query, results)?;
        }
    }

    Ok(())
}

fn search_note_file(
    root_path: &Path,
    note_path: &Path,
    query: &str,
    results: &mut Vec<GlobalSearchResult>,
) -> Result<(), String> {
    let content =
        fs::read_to_string(note_path).map_err(|error| format!("failed to search note: {error}"))?;
    let query = query.to_lowercase();

    for (line_index, line_text) in content.lines().enumerate() {
        let normalized_line = line_text.to_lowercase();
        let mut from_index = 0;

        while from_index <= normalized_line.len() {
            let Some(match_start) = normalized_line[from_index..].find(&query) else {
                break;
            };
            let match_start = from_index + match_start;

            results.push(GlobalSearchResult {
                note_path: relative_workspace_path(root_path, note_path),
                line_number: line_index + 1,
                line_text: line_text.to_string(),
                match_start,
                match_end: match_start + query.len(),
            });

            from_index = match_start + query.len();
        }
    }

    Ok(())
}

fn is_hidden_or_internal(name: &str) -> bool {
    name.starts_with('.')
}

fn is_markdown_note(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("md"))
}

fn relative_workspace_path(root_path: &Path, path: &Path) -> String {
    path.strip_prefix(root_path)
        .unwrap_or(path)
        .components()
        .map(|component| component.as_os_str().to_string_lossy())
        .collect::<Vec<_>>()
        .join("/")
}

fn folder_rank(item: &WorkspaceTreeItem) -> u8 {
    match item.kind {
        WorkspaceTreeItemKind::Folder => 0,
        WorkspaceTreeItemKind::Note => 1,
    }
}

#[cfg(not(test))]
mod commands {
    use super::{dispatch_native_command, NativeCommandRequest, NativeCommandResponse};

    #[tauri::command]
    pub fn native_command(request: NativeCommandRequest) -> NativeCommandResponse {
        dispatch_native_command(request)
    }
}

#[cfg(not(test))]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![commands::native_command])
        .run(tauri::generate_context!())
        .expect("failed to run Simpler");
}

#[cfg(test)]
pub fn run() {}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;

    #[derive(Default)]
    struct StubCredentialStore {
        token: Option<String>,
        error: Option<String>,
    }

    impl GitHubCredentialStore for StubCredentialStore {
        fn access_token(&self) -> Result<Option<String>, String> {
            self.error.clone().map_or_else(|| Ok(self.token.clone()), Err)
        }

        fn store_access_token(&self, _token: &str) -> Result<(), String> {
            Ok(())
        }

        fn clear_access_token(&self) -> Result<(), String> {
            Ok(())
        }
    }

    struct StubDeviceFlowClient(DeviceFlowPoll);

    impl GitHubDeviceFlowClient for StubDeviceFlowClient {
        fn start(&self) -> Result<DeviceFlowStart, String> {
            unreachable!("this test adapter only polls")
        }

        fn poll(&self, _device_code: &str) -> DeviceFlowPoll {
            match &self.0 {
                DeviceFlowPoll::Pending => DeviceFlowPoll::Pending,
                DeviceFlowPoll::Connected(token) => DeviceFlowPoll::Connected(token.clone()),
                DeviceFlowPoll::Expired => DeviceFlowPoll::Expired,
                DeviceFlowPoll::Failed(error) => DeviceFlowPoll::Failed(error.clone()),
            }
        }
    }

    #[test]
    fn github_auth_reports_disconnected_when_the_keychain_has_no_credential() {
        let keychain = StubCredentialStore::default();

        assert_eq!(
            github_auth_status(&keychain),
            GitHubAuthStatus {
                state: GitHubAuthState::Disconnected,
                message: None,
            }
        );
    }

    #[test]
    fn github_auth_reports_connected_and_keychain_failures_without_a_network_request() {
        let connected = StubCredentialStore {
            token: Some("oauth-token".to_string()),
            error: None,
        };
        let unavailable = StubCredentialStore {
            token: None,
            error: Some("keychain is locked".to_string()),
        };

        assert_eq!(github_auth_status(&connected).state, GitHubAuthState::Connected);
        assert_eq!(github_auth_status(&unavailable).state, GitHubAuthState::Failed);
        assert_eq!(github_auth_status(&unavailable).message.as_deref(), Some("keychain is locked"));
    }

    #[test]
    fn github_device_flow_reports_pending_expired_and_failed_states_without_live_github() {
        let keychain = StubCredentialStore::default();

        assert_eq!(
            finish_github_device_flow(&StubDeviceFlowClient(DeviceFlowPoll::Pending), &keychain, "device-code").state,
            GitHubAuthState::Pending
        );
        assert_eq!(
            finish_github_device_flow(&StubDeviceFlowClient(DeviceFlowPoll::Expired), &keychain, "device-code").state,
            GitHubAuthState::Expired
        );
        assert_eq!(
            finish_github_device_flow(
                &StubDeviceFlowClient(DeviceFlowPoll::Failed("network unavailable".to_string())),
                &keychain,
                "device-code",
            )
            .state,
            GitHubAuthState::Failed
        );
    }

    #[test]
    fn dispatch_preserves_the_typed_command_boundary() {
        let response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Auth,
            action: "unsupported".to_string(),
            payload: serde_json::json!({ "workspacePath": "/tmp/notes" }),
        });

        assert!(!response.ok);
        assert_eq!(response.domain, NativeDomain::Auth);
        assert_eq!(response.action, "unsupported");
        assert_eq!(response.data, None);
        assert_eq!(
            response.error,
            Some("unsupported native command".to_string())
        );
    }

    #[test]
    fn command_boundary_covers_planned_native_domains() {
        let domains = [
            NativeDomain::Workspace,
            NativeDomain::Filesystem,
            NativeDomain::Git,
            NativeDomain::Auth,
        ];

        for domain in domains {
            let response = dispatch_native_command(NativeCommandRequest {
                domain: domain.clone(),
                action: "probe".to_string(),
                payload: serde_json::Value::Null,
            });

            assert_eq!(response.domain, domain);
            assert_eq!(response.action, "probe");
        }
    }

    #[test]
    fn git_status_reports_non_git_workspaces() {
        let workspace = test_workspace("git_non_repo");
        let status = read_git_workspace_status(
            &workspace,
            &StubGitRunner::new(vec![Ok(git_output(
                Some(128),
                "",
                "fatal: not a git repository",
            ))]),
        )
        .unwrap();

        assert_eq!(
            status,
            GitWorkspaceStatus {
                is_repository: false,
                has_remote: false,
                sync_status: SyncStatus::SinGit,
                conflicted_files: Vec::new(),
            }
        );
    }

    #[test]
    fn git_status_reports_clean_repos_with_remotes_as_synced() {
        let workspace = test_workspace("git_clean_remote");
        let runner = StubGitRunner::new(vec![
            Ok(git_output(Some(0), "true\n", "")),
            Ok(git_output(Some(0), "origin\n", "")),
            Ok(git_output(Some(0), "", "")),
            Ok(git_output(Some(0), "", "")),
        ]);

        let status = read_git_workspace_status(&workspace, &runner).unwrap();

        assert_eq!(
            status,
            GitWorkspaceStatus {
                is_repository: true,
                has_remote: true,
                sync_status: SyncStatus::Sincronizado,
                conflicted_files: Vec::new(),
            }
        );
        assert_eq!(
            runner.commands(),
            vec![
                vec!["rev-parse".to_string(), "--is-inside-work-tree".to_string()],
                vec!["remote".to_string()],
                vec!["status".to_string(), "--porcelain".to_string()],
                vec![
                    "diff".to_string(),
                    "--name-only".to_string(),
                    "--diff-filter=U".to_string()
                ]
            ]
        );
    }

    #[test]
    fn git_status_reports_changed_repos_as_local_changes() {
        let workspace = test_workspace("git_changed_remote");
        let status = read_git_workspace_status(
            &workspace,
            &StubGitRunner::new(vec![
                Ok(git_output(Some(0), "true\n", "")),
                Ok(git_output(Some(0), "origin\n", "")),
                Ok(git_output(Some(0), " M today.md\n", "")),
                Ok(git_output(Some(0), "", "")),
            ]),
        )
        .unwrap();

        assert_eq!(status.sync_status, SyncStatus::CambiosLocales);
    }

    #[test]
    fn advanced_git_status_reports_repository_branch_commit_and_pending_changes() {
        let workspace = test_workspace("advanced_git_status");
        let status = read_advanced_git_status(
            &workspace,
            &StubGitRunner::new(vec![
                Ok(git_output(Some(0), "true\n", "")),
                Ok(git_output(Some(0), "main\n", "")),
                Ok(git_output(Some(0), "https://github.com/simpler/notes.git\n", "")),
                Ok(git_output(Some(0), "abc1234\u{1f}Write today\u{1f}2026-08-05T12:00:00Z\n", "")),
                Ok(git_output(Some(0), " M today.md\n?? ideas.md\n", "")),
            ]),
        )
        .unwrap();

        assert_eq!(
            status,
            AdvancedGitStatus {
                is_repository: true,
                repository: Some("https://github.com/simpler/notes.git".to_string()),
                branch: Some("main".to_string()),
                latest_commit: Some(GitCommit {
                    id: "abc1234".to_string(),
                    subject: "Write today".to_string(),
                    timestamp: "2026-08-05T12:00:00Z".to_string(),
                }),
                pending_changes: vec!["today.md".to_string(), "ideas.md".to_string()],
            }
        );
    }

    #[test]
    fn git_status_reports_missing_remotes() {
        let workspace = test_workspace("git_missing_remote");
        let status = read_git_workspace_status(
            &workspace,
            &StubGitRunner::new(vec![
                Ok(git_output(Some(0), "true\n", "")),
                Ok(git_output(Some(0), "", "")),
                Ok(git_output(Some(0), "", "")),
                Ok(git_output(Some(0), "", "")),
            ]),
        )
        .unwrap();

        assert_eq!(
            status,
            GitWorkspaceStatus {
                is_repository: true,
                has_remote: false,
                sync_status: SyncStatus::SinRemoto,
                conflicted_files: Vec::new(),
            }
        );
    }

    #[test]
    fn github_remote_detection_finds_github_urls_but_ignores_other_remotes() {
        let workspace = test_workspace("github_remote_detection");
        let runner = StubGitRunner::new(vec![
            Ok(git_output(Some(0), "origin\nbackup\n", "")),
            Ok(git_output(Some(0), "https://gitlab.com/simpler/notes.git\n", "")),
            Ok(git_output(Some(0), "git@github.com:simpler/notes.git\n", "")),
        ]);

        let status = github_remote_status(&workspace, &runner).unwrap();

        assert_eq!(
            status,
            GitHubRemoteStatus {
                remote: Some(GitHubRemote {
                    name: "backup".to_string(),
                    url: "git@github.com:simpler/notes.git".to_string(),
                }),
            }
        );
        assert_eq!(
            runner.commands(),
            vec![
                vec!["remote"],
                vec!["remote", "get-url", "origin"],
                vec!["remote", "get-url", "backup"],
            ]
        );
    }

    #[test]
    fn github_remote_connect_adds_origin_and_rejects_non_github_urls() {
        let workspace = test_workspace("github_remote_connect");
        let runner = StubGitRunner::new(vec![
            Ok(git_output(Some(0), "true\n", "")),
            Ok(git_output(Some(0), "", "")),
        ]);

        let remote = connect_github_remote(&workspace, "https://github.com/simpler/notes.git", &runner).unwrap();

        assert_eq!(remote.name, "origin");
        assert_eq!(remote.url, "https://github.com/simpler/notes.git");
        assert_eq!(
            runner.commands(),
            vec![
                vec!["rev-parse", "--is-inside-work-tree"],
                vec!["remote", "add", "origin", "https://github.com/simpler/notes.git"],
            ]
        );
        assert_eq!(
            connect_github_remote(
                &workspace,
                "https://gitlab.com/simpler/notes.git",
                &StubGitRunner::new(vec![]),
            )
            .unwrap_err(),
            "A GitHub repository URL is required"
        );
    }

    #[test]
    fn github_remote_connect_initializes_a_repository_when_the_workspace_is_not_yet_git_backed() {
        let workspace = test_workspace("github_remote_connect_init");
        let runner = StubGitRunner::new(vec![
            Ok(git_output(Some(1), "", "fatal: not a git repository")),
            Ok(git_output(Some(0), "", "")),
            Ok(git_output(Some(0), "", "")),
        ]);

        let remote = connect_github_remote(&workspace, "https://github.com/simpler/notes.git", &runner).unwrap();

        assert_eq!(remote.name, "origin");
        assert_eq!(remote.url, "https://github.com/simpler/notes.git");
        assert_eq!(
            runner.commands(),
            vec![
                vec!["rev-parse", "--is-inside-work-tree"],
                vec!["init", "--initial-branch=main"],
                vec!["remote", "add", "origin", "https://github.com/simpler/notes.git"],
            ]
        );
    }

    #[test]
    fn github_clone_uses_the_selected_destination_and_rejects_non_github_urls() {
        let root = test_workspace("github_clone");
        let destination = root.join("notes");
        let runner = StubGitRunner::new(vec![Ok(git_output(Some(0), "", ""))]);

        let result = clone_github_repository(
            "https://github.com/simpler/notes.git",
            &destination,
            &runner,
        )
        .unwrap();

        assert_eq!(result.workspace_path, destination.to_string_lossy());
        assert_eq!(
            runner.commands(),
            vec![vec![
                "clone",
                "https://github.com/simpler/notes.git",
                destination.to_str().unwrap(),
            ]]
        );
        assert_eq!(
            clone_github_repository(
                "https://example.com/simpler/notes.git",
                &destination,
                &StubGitRunner::new(vec![]),
            )
            .unwrap_err(),
            "A GitHub repository URL is required"
        );
    }

    #[test]
    fn git_status_reports_git_command_failures() {
        let workspace = test_workspace("git_command_failure");
        let error = read_git_workspace_status(
            &workspace,
            &StubGitRunner::new(vec![Err("git missing".to_string())]),
        )
        .unwrap_err();

        assert_eq!(error, "git missing");
    }

    #[test]
    fn git_sync_commits_grouped_local_changes_and_pushes_them_to_the_remote() {
        let (workspace, remote) = test_git_workspace_with_remote("git_sync_success");
        fs::write(workspace.join("today.md"), "# Today\n\nLocal Save").unwrap();

        let result = sync_git_workspace(&workspace, &SystemGitCommandRunner).unwrap();

        assert_eq!(
            result,
            GitSyncResult {
                status: SyncResultStatus::Synced,
                message: "Sync completed".to_string(),
                conflicted_files: Vec::new(),
            }
        );
        assert_eq!(
            git_stdout(&workspace, &["log", "-1", "--pretty=%s"]),
            "Sync checkpoint"
        );
        assert_eq!(
            git_stdout(&remote, &["show", "main:today.md"]),
            "# Today\n\nLocal Save"
        );
    }

    #[test]
    fn git_sync_noops_clean_workspaces_without_creating_a_checkpoint() {
        let (workspace, _remote) = test_git_workspace_with_remote("git_sync_noop");
        let before = git_stdout(&workspace, &["rev-list", "--count", "HEAD"]);

        let result = sync_git_workspace(&workspace, &SystemGitCommandRunner).unwrap();

        assert_eq!(result.status, SyncResultStatus::Synced);
        assert_eq!(
            git_stdout(&workspace, &["rev-list", "--count", "HEAD"]),
            before
        );
        assert_eq!(git_stdout(&workspace, &["status", "--porcelain"]), "");
    }

    #[test]
    fn git_sync_pulls_remote_changes_before_pushing_local_changes() {
        let (workspace, remote) = test_git_workspace_with_remote("git_sync_pull_first");
        commit_remote_change(&remote, "remote.md", "# Remote\n");
        fs::write(workspace.join("local.md"), "# Local\n").unwrap();

        sync_git_workspace(&workspace, &SystemGitCommandRunner).unwrap();

        assert_eq!(
            fs::read_to_string(workspace.join("remote.md")).unwrap(),
            "# Remote\n"
        );
        assert_eq!(git_stdout(&remote, &["show", "main:local.md"]), "# Local");
    }

    #[test]
    fn git_sync_failure_keeps_local_save_content_and_reports_actionable_status() {
        let (workspace, remote) = test_git_workspace_with_remote("git_sync_failure");
        fs::write(workspace.join("today.md"), "# Today\n\nLocal Save").unwrap();
        git_ok(
            &workspace,
            &[
                "remote",
                "set-url",
                "origin",
                &format!("{}/missing.git", remote.display()),
            ],
        );

        let error = sync_git_workspace(&workspace, &SystemGitCommandRunner).unwrap_err();

        assert!(error.contains("failed to check remote branch before Sync"));
        assert_eq!(
            fs::read_to_string(workspace.join("today.md")).unwrap(),
            "# Today\n\nLocal Save"
        );
    }

    #[test]
    fn git_sync_uses_plain_pull_rebase_and_push_without_force_or_discard_commands() {
        let workspace = test_workspace("git_sync_commands");
        let runner = StubGitRunner::new(vec![
            Ok(git_output(Some(0), "true\n", "")),
            Ok(git_output(Some(0), "origin\n", "")),
            Ok(git_output(Some(0), " M today.md\n", "")),
            Ok(git_output(Some(0), "", "")),
            Ok(git_output(Some(0), "main\n", "")),
            Ok(git_output(Some(0), "origin\n", "")),
            Ok(git_output(Some(0), "", "")),
            Ok(git_output(Some(0), "[main abc123] Sync checkpoint\n", "")),
            Ok(git_output(
                Some(0),
                "abc123\trefs/heads/main\n",
                "",
            )),
            Ok(git_output(Some(0), "", "")),
            Ok(git_output(Some(0), "", "")),
        ]);

        sync_git_workspace(&workspace, &runner).unwrap();

        let commands = runner.commands();
        assert_eq!(
            commands,
            vec![
                vec!["rev-parse", "--is-inside-work-tree"],
                vec!["remote"],
                vec!["status", "--porcelain"],
                vec!["diff", "--name-only", "--diff-filter=U"],
                vec!["branch", "--show-current"],
                vec!["remote"],
                vec!["add", "-A"],
                vec!["commit", "-m", "Sync checkpoint"],
                vec!["ls-remote", "--heads", "origin", "main"],
                vec!["pull", "--rebase", "origin", "main"],
                vec!["push", "origin", "HEAD:main"],
            ]
        );
        assert!(!commands.iter().flatten().any(|arg| arg.contains("force")));
        assert!(!commands.iter().any(|command| {
            matches!(
                command.first().map(String::as_str),
                Some("reset" | "checkout" | "restore" | "clean")
            )
        }));
    }

    #[test]
    fn git_sync_against_an_empty_remote_skips_pull_and_pushes_with_upstream() {
        let workspace = test_workspace("git_sync_empty_remote");
        let runner = StubGitRunner::new(vec![
            Ok(git_output(Some(0), "true\n", "")),
            Ok(git_output(Some(0), "origin\n", "")),
            Ok(git_output(Some(0), " M today.md\n", "")),
            Ok(git_output(Some(0), "", "")),
            Ok(git_output(Some(0), "main\n", "")),
            Ok(git_output(Some(0), "origin\n", "")),
            Ok(git_output(Some(0), "", "")),
            Ok(git_output(Some(0), "[main abc123] Sync checkpoint\n", "")),
            Ok(git_output(Some(0), "", "")),
            Ok(git_output(Some(0), "", "")),
        ]);

        let result = sync_git_workspace(&workspace, &runner).unwrap();

        assert_eq!(result.status, SyncResultStatus::Synced);
        let commands = runner.commands();
        assert_eq!(
            commands,
            vec![
                vec!["rev-parse", "--is-inside-work-tree"],
                vec!["remote"],
                vec!["status", "--porcelain"],
                vec!["diff", "--name-only", "--diff-filter=U"],
                vec!["branch", "--show-current"],
                vec!["remote"],
                vec!["add", "-A"],
                vec!["commit", "-m", "Sync checkpoint"],
                vec!["ls-remote", "--heads", "origin", "main"],
                vec!["push", "-u", "origin", "HEAD:main"],
            ]
        );
        assert!(!commands.iter().any(|command| command.first().map(String::as_str) == Some("pull")));
    }

    #[test]
    fn git_sync_reports_markdown_conflicts_and_resolves_the_local_version() {
        let (workspace, remote) = test_git_workspace_with_remote("git_sync_conflict_local");
        fs::write(workspace.join("today.md"), "# Today\n\nLocal version\n").unwrap();
        git_ok(&workspace, &["add", "today.md"]);
        git_ok(&workspace, &["commit", "-m", "Local note"]);
        commit_remote_change(&remote, "today.md", "# Today\n\nRemote version\n");

        let conflict = sync_git_workspace(&workspace, &SystemGitCommandRunner).unwrap();
        assert_eq!(conflict.status, SyncResultStatus::Conflict);
        assert_eq!(conflict.conflicted_files, vec!["today.md"]);
        assert_eq!(
            read_git_workspace_status(&workspace, &SystemGitCommandRunner)
                .unwrap()
                .sync_status,
            SyncStatus::Conflicto
        );

        let resolved = resolve_git_conflict(
            &workspace,
            "today.md",
            ConflictResolution::Local,
            &SystemGitCommandRunner,
        )
        .unwrap();

        assert_eq!(resolved.status, SyncResultStatus::Synced);
        assert_eq!(
            fs::read_to_string(workspace.join("today.md")).unwrap(),
            "# Today\n\nLocal version\n"
        );
        assert_eq!(
            git_stdout(&remote, &["show", "main:today.md"]),
            "# Today\n\nLocal version"
        );
    }

    #[test]
    fn git_sync_continues_after_a_manually_edited_conflict() {
        let (workspace, remote) = test_git_workspace_with_remote("git_sync_conflict_manual");
        fs::write(workspace.join("today.md"), "# Today\n\nLocal version\n").unwrap();
        git_ok(&workspace, &["add", "today.md"]);
        git_ok(&workspace, &["commit", "-m", "Local note"]);
        commit_remote_change(&remote, "today.md", "# Today\n\nRemote version\n");

        let conflict = sync_git_workspace(&workspace, &SystemGitCommandRunner).unwrap();
        assert_eq!(conflict.status, SyncResultStatus::Conflict);
        fs::write(workspace.join("today.md"), "# Today\n\nMerged manually\n").unwrap();

        let resolved = resolve_git_conflict(
            &workspace,
            "today.md",
            ConflictResolution::Manual,
            &SystemGitCommandRunner,
        )
        .unwrap();

        assert_eq!(resolved.status, SyncResultStatus::Synced);
        assert_eq!(
            git_stdout(&remote, &["show", "main:today.md"]),
            "# Today\n\nMerged manually"
        );
    }

    #[test]
    fn opens_workspace_with_visible_folders_and_markdown_notes() {
        let workspace = test_workspace("visible_tree");
        fs::create_dir_all(workspace.join("daily")).unwrap();
        fs::create_dir_all(workspace.join("ideas")).unwrap();
        fs::write(workspace.join("daily").join("today.md"), "# Today").unwrap();
        fs::write(workspace.join("ideas").join("plan.MD"), "# Plan").unwrap();

        let response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Workspace,
            action: "open".to_string(),
            payload: serde_json::json!({ "workspacePath": workspace }),
        });

        assert!(response.ok);
        assert_eq!(response.domain, NativeDomain::Workspace);
        assert_eq!(response.action, "open");
        assert_eq!(
            response.data.unwrap()["tree"],
            serde_json::json!([
                {
                    "name": "daily",
                    "path": "daily",
                    "kind": "folder",
                    "children": [
                        {
                            "name": "today.md",
                            "path": "daily/today.md",
                            "kind": "note",
                            "children": []
                        }
                    ]
                },
                {
                    "name": "ideas",
                    "path": "ideas",
                    "kind": "folder",
                    "children": [
                        {
                            "name": "plan.MD",
                            "path": "ideas/plan.MD",
                            "kind": "note",
                            "children": []
                        }
                    ]
                }
            ])
        );
    }

    #[test]
    fn opening_workspace_creates_shared_and_local_metadata_without_touching_notes() {
        let workspace = test_workspace("metadata_creation");
        fs::write(workspace.join("today.md"), "# Today\n\nPortable body").unwrap();

        let response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Workspace,
            action: "open".to_string(),
            payload: serde_json::json!({ "workspacePath": workspace }),
        });

        assert!(response.ok);
        assert!(workspace.join(".simpler").join("workspace.json").is_file());
        assert!(workspace
            .join(".simpler")
            .join("local")
            .join("state.json")
            .is_file());
        assert!(workspace
            .join(".simpler")
            .join("local")
            .join("cache")
            .is_dir());
        assert_eq!(
            fs::read_to_string(workspace.join(".simpler").join(".gitignore")).unwrap(),
            "local/\n"
        );
        assert_eq!(
            fs::read_to_string(workspace.join("today.md")).unwrap(),
            "# Today\n\nPortable body"
        );
    }

    #[test]
    fn remembers_and_restores_the_last_existing_note_for_a_workspace() {
        let workspace = test_workspace("last_note_restore");
        fs::create_dir_all(workspace.join("daily")).unwrap();
        fs::write(workspace.join("daily").join("today.md"), "# Today").unwrap();

        let remember_response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Workspace,
            action: "remember-note".to_string(),
            payload: serde_json::json!({
                "workspacePath": workspace,
                "notePath": "daily/today.md",
            }),
        });

        assert!(remember_response.ok);

        let open_response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Workspace,
            action: "open".to_string(),
            payload: serde_json::json!({ "workspacePath": workspace }),
        });

        assert!(open_response.ok);
        assert_eq!(
            open_response.data.unwrap()["metadata"]["lastNotePath"],
            serde_json::json!("daily/today.md")
        );

        fs::remove_file(workspace.join("daily").join("today.md")).unwrap();
        let reopened_response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Workspace,
            action: "open".to_string(),
            payload: serde_json::json!({ "workspacePath": workspace }),
        });

        assert!(reopened_response.ok);
        assert_eq!(
            reopened_response.data.unwrap()["metadata"]["lastNotePath"],
            serde_json::Value::Null
        );
    }

    #[test]
    fn filters_hidden_internal_and_non_markdown_entries_without_deleting_them() {
        let workspace = test_workspace("filtered_tree");
        fs::create_dir_all(workspace.join(".git")).unwrap();
        fs::create_dir_all(workspace.join(".simpler")).unwrap();
        fs::create_dir_all(workspace.join("assets")).unwrap();
        fs::write(workspace.join(".git").join("config"), "[core]").unwrap();
        fs::write(workspace.join(".simpler").join("metadata.json"), "{}").unwrap();
        fs::write(workspace.join("assets").join("photo.png"), "png").unwrap();
        fs::write(workspace.join("readme.txt"), "not a note").unwrap();
        fs::write(workspace.join("note.md"), "# Note").unwrap();

        let response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Workspace,
            action: "open".to_string(),
            payload: serde_json::json!({ "workspacePath": workspace }),
        });

        assert!(response.ok);
        assert_eq!(
            response.data.unwrap()["tree"],
            serde_json::json!([
                {
                    "name": "assets",
                    "path": "assets",
                    "kind": "folder",
                    "children": []
                },
                {
                    "name": "note.md",
                    "path": "note.md",
                    "kind": "note",
                    "children": []
                }
            ])
        );
        assert!(workspace.join("readme.txt").exists());
        assert!(workspace.join(".git").join("config").exists());
        assert!(workspace.join(".simpler").join("metadata.json").exists());
    }

    #[test]
    fn rejects_paths_that_are_not_folders() {
        let workspace = test_workspace("not_folder");
        let file_path = workspace.join("note.md");
        fs::write(&file_path, "# Note").unwrap();

        let response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Workspace,
            action: "open".to_string(),
            payload: serde_json::json!({ "workspacePath": file_path }),
        });

        assert!(!response.ok);
        assert_eq!(
            response.error,
            Some("workspace path must be a folder".to_string())
        );
    }

    #[test]
    fn reads_note_content_from_the_workspace() {
        let workspace = test_workspace("read_note");
        fs::create_dir_all(workspace.join("daily")).unwrap();
        fs::write(workspace.join("daily").join("today.md"), "# Today\n\nBody").unwrap();

        let response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Filesystem,
            action: "read-note".to_string(),
            payload: serde_json::json!({
                "workspacePath": workspace,
                "notePath": "daily/today.md",
            }),
        });

        assert!(response.ok);
        assert_eq!(
            response.data.unwrap()["content"],
            serde_json::json!("# Today\n\nBody")
        );
    }

    #[test]
    fn writes_note_content_to_disk_through_local_save() {
        let workspace = test_workspace("write_note");
        fs::create_dir_all(workspace.join("daily")).unwrap();
        fs::write(workspace.join("daily").join("today.md"), "# Today").unwrap();

        let response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Filesystem,
            action: "write-note".to_string(),
            payload: serde_json::json!({
                "workspacePath": workspace,
                "notePath": "daily/today.md",
                "content": "# Today\n\nUpdated body",
            }),
        });

        assert!(response.ok);
        let saved = fs::read_to_string(workspace.join("daily").join("today.md")).unwrap();
        assert_eq!(saved, "# Today\n\nUpdated body");
    }

    #[test]
    fn rejects_reading_or_writing_non_markdown_paths() {
        let workspace = test_workspace("reject_non_markdown");
        fs::write(workspace.join("notes.txt"), "not a note").unwrap();

        let response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Filesystem,
            action: "read-note".to_string(),
            payload: serde_json::json!({
                "workspacePath": workspace,
                "notePath": "notes.txt",
            }),
        });

        assert!(!response.ok);
        assert_eq!(
            response.error,
            Some("note path must be a Markdown file".to_string())
        );
    }

    #[test]
    fn reports_missing_markdown_notes_distinctly() {
        let workspace = test_workspace("missing_note");

        let response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Filesystem,
            action: "read-note".to_string(),
            payload: serde_json::json!({
                "workspacePath": workspace,
                "notePath": "deleted.md",
            }),
        });

        assert!(!response.ok);
        assert_eq!(response.error, Some("note file is missing".to_string()));
    }

    #[test]
    fn creates_folders_inside_the_active_workspace() {
        let workspace = test_workspace("create_folder");

        let response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Filesystem,
            action: "create-folder".to_string(),
            payload: serde_json::json!({
                "workspacePath": workspace,
                "parentPath": "",
                "folderName": "daily",
            }),
        });

        assert!(response.ok);
        assert!(workspace.join("daily").is_dir());
        assert_eq!(
            response.data.unwrap()["itemPath"],
            serde_json::json!("daily")
        );
    }

    #[test]
    fn creates_markdown_notes_and_normalizes_missing_extension() {
        let workspace = test_workspace("create_note");
        fs::create_dir_all(workspace.join("daily")).unwrap();

        let response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Filesystem,
            action: "create-note".to_string(),
            payload: serde_json::json!({
                "workspacePath": workspace,
                "parentPath": "daily",
                "noteName": "today",
            }),
        });

        assert!(response.ok);
        assert!(workspace.join("daily").join("today.md").is_file());
        assert_eq!(
            response.data.unwrap()["itemPath"],
            serde_json::json!("daily/today.md")
        );
    }

    #[test]
    fn refuses_to_overwrite_existing_notes_when_creating_or_renaming() {
        let workspace = test_workspace("no_overwrite");
        fs::write(workspace.join("today.md"), "# Today").unwrap();
        fs::write(workspace.join("tomorrow.md"), "# Tomorrow").unwrap();

        let create_response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Filesystem,
            action: "create-note".to_string(),
            payload: serde_json::json!({
                "workspacePath": workspace,
                "parentPath": "",
                "noteName": "today",
            }),
        });

        assert!(!create_response.ok);
        assert_eq!(
            create_response.error,
            Some("note already exists".to_string())
        );

        let rename_response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Filesystem,
            action: "rename-item".to_string(),
            payload: serde_json::json!({
                "workspacePath": workspace,
                "itemPath": "tomorrow.md",
                "newName": "today.md",
            }),
        });

        assert!(!rename_response.ok);
        assert_eq!(
            rename_response.error,
            Some("item already exists".to_string())
        );
        assert_eq!(
            fs::read_to_string(workspace.join("today.md")).unwrap(),
            "# Today"
        );
        assert_eq!(
            fs::read_to_string(workspace.join("tomorrow.md")).unwrap(),
            "# Tomorrow"
        );
    }

    #[test]
    fn renames_notes_and_folders_on_disk() {
        let workspace = test_workspace("rename_items");
        fs::create_dir_all(workspace.join("daily")).unwrap();
        fs::write(workspace.join("daily").join("today.md"), "# Today").unwrap();

        let note_response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Filesystem,
            action: "rename-item".to_string(),
            payload: serde_json::json!({
                "workspacePath": workspace,
                "itemPath": "daily/today.md",
                "newName": "morning",
            }),
        });

        assert!(note_response.ok);
        assert!(!workspace.join("daily").join("today.md").exists());
        assert!(workspace.join("daily").join("morning.md").exists());

        let folder_response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Filesystem,
            action: "rename-item".to_string(),
            payload: serde_json::json!({
                "workspacePath": workspace,
                "itemPath": "daily",
                "newName": "journal",
            }),
        });

        assert!(folder_response.ok);
        assert!(!workspace.join("daily").exists());
        assert!(workspace.join("journal").join("morning.md").exists());
    }

    #[test]
    fn moves_notes_between_folders_without_changing_the_note_identity_to_a_heading() {
        let workspace = test_workspace("move_note");
        fs::create_dir_all(workspace.join("daily")).unwrap();
        fs::create_dir_all(workspace.join("archive")).unwrap();
        fs::write(
            workspace.join("daily").join("today.md"),
            "# Renamed by heading",
        )
        .unwrap();

        let edit_response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Filesystem,
            action: "write-note".to_string(),
            payload: serde_json::json!({
                "workspacePath": workspace,
                "notePath": "daily/today.md",
                "content": "# A different title\n\nBody",
            }),
        });

        assert!(edit_response.ok);
        assert!(workspace.join("daily").join("today.md").exists());
        assert!(!workspace
            .join("daily")
            .join("A different title.md")
            .exists());

        let move_response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Filesystem,
            action: "move-note".to_string(),
            payload: serde_json::json!({
                "workspacePath": workspace,
                "notePath": "daily/today.md",
                "targetFolderPath": "archive",
            }),
        });

        assert!(move_response.ok);
        assert!(!workspace.join("daily").join("today.md").exists());
        assert_eq!(
            fs::read_to_string(workspace.join("archive").join("today.md")).unwrap(),
            "# A different title\n\nBody"
        );
    }

    #[test]
    fn refuses_to_manage_hidden_or_internal_workspace_paths() {
        let workspace = test_workspace("reject_hidden_management");
        fs::create_dir_all(workspace.join(".simpler")).unwrap();
        fs::write(workspace.join(".simpler").join("metadata.md"), "internal").unwrap();

        let response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Filesystem,
            action: "read-note".to_string(),
            payload: serde_json::json!({
                "workspacePath": workspace,
                "notePath": ".simpler/metadata.md",
            }),
        });

        assert!(!response.ok);
        assert_eq!(
            response.error,
            Some("hidden or internal paths are not managed by the workspace tree".to_string())
        );
    }

    #[test]
    fn global_search_returns_markdown_file_and_line_matches_only_from_visible_workspace_entries() {
        let workspace = test_workspace("global_search");
        fs::create_dir_all(workspace.join("daily")).unwrap();
        fs::create_dir_all(workspace.join(".simpler")).unwrap();
        fs::write(
            workspace.join("daily").join("today.md"),
            "# Today\n\nSearch term here\nanother search term",
        )
        .unwrap();
        fs::write(workspace.join(".simpler").join("hidden.md"), "search term").unwrap();
        fs::write(workspace.join("notes.txt"), "search term").unwrap();

        let response = dispatch_native_command(NativeCommandRequest {
            domain: NativeDomain::Filesystem,
            action: "global-search".to_string(),
            payload: serde_json::json!({
                "workspacePath": workspace,
                "query": "search",
            }),
        });

        assert!(response.ok);
        assert_eq!(
            response.data.unwrap()["results"],
            serde_json::json!([
                {
                    "notePath": "daily/today.md",
                    "lineNumber": 3,
                    "lineText": "Search term here",
                    "matchStart": 0,
                    "matchEnd": 6
                },
                {
                    "notePath": "daily/today.md",
                    "lineNumber": 4,
                    "lineText": "another search term",
                    "matchStart": 8,
                    "matchEnd": 14
                }
            ])
        );
    }

    fn test_workspace(name: &str) -> PathBuf {
        let mut workspace = std::env::temp_dir();
        workspace.push(format!(
            "simpler_{name}_{}_{}",
            std::process::id(),
            std::thread::current().name().unwrap_or("test")
        ));
        let _ = fs::remove_dir_all(&workspace);
        fs::create_dir_all(&workspace).unwrap();
        workspace
    }

    fn test_git_workspace_with_remote(name: &str) -> (PathBuf, PathBuf) {
        let root = test_workspace(name);
        let remote = root.join("remote.git");
        let workspace = root.join("workspace");

        fs::create_dir_all(&workspace).unwrap();
        git_ok(
            &root,
            &["init", "--bare", "--initial-branch=main", "remote.git"],
        );
        git_ok(&workspace, &["init", "--initial-branch=main"]);
        configure_git_identity(&workspace);
        fs::write(workspace.join("README.md"), "# Simpler\n").unwrap();
        git_ok(&workspace, &["add", "README.md"]);
        git_ok(&workspace, &["commit", "-m", "Initial notes"]);
        git_ok(
            &workspace,
            &["remote", "add", "origin", remote.to_str().unwrap()],
        );
        git_ok(&workspace, &["push", "-u", "origin", "main"]);

        (workspace, remote)
    }

    fn commit_remote_change(remote: &Path, note_path: &str, content: &str) {
        let root = test_workspace("git_remote_change");
        let clone = root.join("clone");

        git_ok(&root, &["clone", remote.to_str().unwrap(), "clone"]);
        configure_git_identity(&clone);
        fs::write(clone.join(note_path), content).unwrap();
        git_ok(&clone, &["add", note_path]);
        git_ok(&clone, &["commit", "-m", "Remote note"]);
        git_ok(&clone, &["push", "origin", "main"]);
    }

    fn configure_git_identity(workspace: &Path) {
        git_ok(workspace, &["config", "user.email", "simpler@example.test"]);
        git_ok(workspace, &["config", "user.name", "Simpler Test"]);
    }

    fn git_ok(workspace: &Path, args: &[&str]) {
        let output = Command::new("git")
            .args(args)
            .current_dir(workspace)
            .output()
            .unwrap_or_else(|error| panic!("failed to run git {args:?}: {error}"));

        if !output.status.success() {
            panic!(
                "git {args:?} failed\nstdout:\n{}\nstderr:\n{}",
                String::from_utf8_lossy(&output.stdout),
                String::from_utf8_lossy(&output.stderr)
            );
        }
    }

    fn git_stdout(workspace: &Path, args: &[&str]) -> String {
        let output = Command::new("git")
            .args(args)
            .current_dir(workspace)
            .output()
            .unwrap_or_else(|error| panic!("failed to run git {args:?}: {error}"));

        if !output.status.success() {
            panic!(
                "git {args:?} failed\nstdout:\n{}\nstderr:\n{}",
                String::from_utf8_lossy(&output.stdout),
                String::from_utf8_lossy(&output.stderr)
            );
        }

        String::from_utf8_lossy(&output.stdout).trim().to_string()
    }

    fn git_output(status_code: Option<i32>, stdout: &str, stderr: &str) -> GitCommandOutput {
        GitCommandOutput {
            status_code,
            stdout: stdout.to_string(),
            stderr: stderr.to_string(),
        }
    }

    struct StubGitRunner {
        outputs: RefCell<Vec<Result<GitCommandOutput, String>>>,
        commands: RefCell<Vec<Vec<String>>>,
    }

    impl StubGitRunner {
        fn new(outputs: Vec<Result<GitCommandOutput, String>>) -> Self {
            Self {
                outputs: RefCell::new(outputs.into_iter().rev().collect()),
                commands: RefCell::new(Vec::new()),
            }
        }

        fn commands(&self) -> Vec<Vec<String>> {
            self.commands.borrow().clone()
        }
    }

    impl GitCommandRunner for StubGitRunner {
        fn run(&self, _workspace_path: &Path, args: &[&str]) -> Result<GitCommandOutput, String> {
            self.commands
                .borrow_mut()
                .push(args.iter().map(|arg| arg.to_string()).collect());
            self.outputs
                .borrow_mut()
                .pop()
                .expect("stub git output missing")
        }
    }
}
