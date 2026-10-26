use super::{
    ensure_workspace_metadata, relative_workspace_path, resolve_workspace_folder,
    scan_workspace_tree, SharedWorkspaceMetadata, WorkspaceTreeItem,
};
use serde::Deserialize;
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Component, Path};
use std::sync::Mutex;

pub(super) const METADATA_PATH: &str = ".simpler/workspace.json";
static SHARED_ORDER: Mutex<()> = Mutex::new(());

fn read(workspace: &Path) -> Result<SharedWorkspaceMetadata, String> {
    ensure_workspace_metadata(workspace)?;
    let content = fs::read_to_string(workspace.join(METADATA_PATH))
        .map_err(|error| format!("failed to read shared Workspace metadata: {error}"))?;
    parse(&content)
}

pub(super) fn parse(content: &str) -> Result<SharedWorkspaceMetadata, String> {
    let metadata: SharedWorkspaceMetadata = serde_json::from_str(content)
        .map_err(|error| format!("invalid shared Workspace metadata: {error}"))?;
    validate(&metadata)?;
    Ok(metadata)
}

pub(super) fn validate(metadata: &SharedWorkspaceMetadata) -> Result<(), String> {
    if metadata.schema_version != 1 {
        return Err("unsupported shared Workspace metadata version".into());
    }
    for (parent, children) in &metadata.manual_tree_order {
        if !parent.is_empty() && !Path::new(parent).components().all(|part| matches!(part, Component::Normal(name) if !name.to_string_lossy().starts_with('.'))) {
            return Err("invalid Manual Tree Order folder".into());
        }
        let mut unique = BTreeSet::new();
        for child in children {
            if child.is_empty()
                || child.contains(['/', '\\'])
                || child.starts_with('.')
                || !unique.insert(child)
            {
                return Err("invalid or duplicate Manual Tree Order entry".into());
            }
        }
    }
    Ok(())
}

fn write(workspace: &Path, metadata: &SharedWorkspaceMetadata) -> Result<(), String> {
    validate(metadata)?;
    let content = serde_json::to_string_pretty(metadata).map_err(|error| error.to_string())?;
    let temporary = workspace.join(".simpler/local/tree-order.pending.json");
    fs::write(&temporary, format!("{content}\n"))
        .map_err(|error| format!("failed to save Manual Tree Order: {error}"))?;
    fs::rename(temporary, workspace.join(METADATA_PATH))
        .map_err(|error| format!("failed to save Manual Tree Order: {error}"))
}

pub(super) fn apply(workspace: &Path, tree: &mut [WorkspaceTreeItem]) -> Result<(), String> {
    let _guard = SHARED_ORDER
        .lock()
        .map_err(|_| "Manual Tree Order is unavailable".to_string())?;
    let mut metadata = match read(workspace) {
        Ok(metadata) => metadata,
        Err(error) => {
            // Only an actual unresolved Git conflict permits an uncustomized tree.
            // Do not reconcile or rewrite the conflict-markered shared file.
            let conflicts = super::conflicted_sync_files(workspace, &super::SystemGitCommandRunner);
            if conflicts.is_ok_and(|paths| paths.iter().any(|path| path == METADATA_PATH)) {
                return Ok(());
            }
            return Err(error);
        }
    };
    let previous = metadata.manual_tree_order.clone();
    let mut existing_folders = BTreeSet::new();
    reconcile(
        tree,
        "",
        &mut metadata.manual_tree_order,
        &mut existing_folders,
    );
    metadata
        .manual_tree_order
        .retain(|parent, _| existing_folders.contains(parent));
    if previous != metadata.manual_tree_order {
        write(workspace, &metadata)?;
    }
    Ok(())
}

pub(super) fn relocate(workspace: &Path, old: &Path, new: &Path) -> Result<(), String> {
    let _guard = SHARED_ORDER
        .lock()
        .map_err(|_| "Manual Tree Order is unavailable".to_string())?;
    let mut metadata = read(workspace)?;
    let previous = metadata.manual_tree_order.clone();
    let old_relative = old
        .strip_prefix(workspace)
        .map_err(|error| error.to_string())?;
    let old_parent = relative_workspace_path(workspace, old.parent().unwrap_or(workspace));
    let new_parent = relative_workspace_path(workspace, new.parent().unwrap_or(workspace));
    let old_name = old.file_name().unwrap_or_default().to_string_lossy();
    let new_name = new.file_name().unwrap_or_default().to_string_lossy();
    if let Some(order) = metadata.manual_tree_order.get_mut(&old_parent) {
        if old_parent == new_parent {
            for name in order {
                if name == &old_name {
                    *name = new_name.to_string();
                }
            }
        } else {
            order.retain(|name| name != &old_name);
        }
    }
    if old_parent != new_parent {
        if let Some(order) = metadata.manual_tree_order.get_mut(&new_parent) {
            if !order.iter().any(|name| name == &new_name) {
                order.push(new_name.to_string());
            }
        }
    }
    metadata.manual_tree_order = metadata
        .manual_tree_order
        .into_iter()
        .map(|(parent, order)| {
            let parent = Path::new(&parent)
                .strip_prefix(old_relative)
                .ok()
                .map(|suffix| relative_workspace_path(workspace, &new.join(suffix)))
                .unwrap_or(parent);
            (parent, order)
        })
        .collect();
    if previous != metadata.manual_tree_order {
        write(workspace, &metadata)?;
    }
    Ok(())
}

fn reconcile(
    tree: &mut [WorkspaceTreeItem],
    parent: &str,
    orders: &mut BTreeMap<String, Vec<String>>,
    existing_folders: &mut BTreeSet<String>,
) {
    existing_folders.insert(parent.into());
    if let Some(order) = orders.get_mut(parent) {
        let present: BTreeSet<_> = tree.iter().map(|item| item.name.clone()).collect();
        order.retain(|name| present.contains(name));
        for item in tree.iter() {
            if !order.contains(&item.name) {
                order.push(item.name.clone());
            }
        }
        tree.sort_by_key(|item| {
            order
                .iter()
                .position(|name| name == &item.name)
                .unwrap_or(usize::MAX)
        });
    }
    for item in tree {
        if matches!(item.kind, super::WorkspaceTreeItemKind::Folder) {
            reconcile(&mut item.children, &item.path, orders, existing_folders);
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetOrderRequest {
    workspace_path: String,
    parent_path: String,
    ordered_paths: Option<Vec<String>>,
}

pub(super) fn set_order_payload(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let request: SetOrderRequest = serde_json::from_value(payload)
        .map_err(|_| "workspacePath, parentPath and orderedPaths are required".to_string())?;
    let workspace = Path::new(&request.workspace_path);
    let folder = resolve_workspace_folder(workspace, &request.parent_path)?;
    let parent = relative_workspace_path(workspace, &folder);
    let guard = SHARED_ORDER
        .lock()
        .map_err(|_| "Manual Tree Order is unavailable".to_string())?;
    let mut metadata = read(workspace)?;
    if let Some(paths) = request.ordered_paths {
        let siblings = scan_workspace_tree(workspace, &folder)?;
        let expected: BTreeSet<_> = siblings.iter().map(|item| item.path.clone()).collect();
        let actual: BTreeSet<_> = paths.iter().cloned().collect();
        if actual != expected || actual.len() != paths.len() {
            return Err("Manual Tree Order must contain each current sibling exactly once".into());
        }
        let names = paths
            .iter()
            .map(|path| {
                Path::new(path)
                    .file_name()
                    .and_then(|name| name.to_str())
                    .map(str::to_owned)
                    .ok_or_else(|| "invalid Manual Tree Order path".to_string())
            })
            .collect::<Result<Vec<_>, _>>()?;
        metadata.manual_tree_order.insert(parent, names);
    } else {
        metadata.manual_tree_order.remove(&parent);
    }
    write(workspace, &metadata)?;
    drop(guard);
    serde_json::to_value(super::FilesystemOperationResult {
        tree: super::read_workspace_tree(workspace, workspace)?,
        item_path: request.parent_path,
    })
    .map_err(|error| error.to_string())
}
