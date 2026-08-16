import type { TreeMode, WorkspaceTreeItem } from "./appState";
import type { WorkspaceTreePatch } from "../native/commands";

/**
 * Applies a single-file create/rename/move/delete patch to an existing
 * Workspace Tree in place of a full rebuild-and-swap, producing a tree
 * equivalent to what `read_workspace_tree` would return from scratch.
 */
export function applyWorkspaceTreePatch(
  tree: WorkspaceTreeItem[],
  patch: WorkspaceTreePatch,
): WorkspaceTreeItem[] {
  let next = tree;

  for (const removedPath of patch.removedPaths) {
    next = removeTreeItem(next, removedPath);
  }

  if (patch.upsertedItem) {
    next = upsertTreeItem(next, patch.upsertedItem);
  }

  return next;
}

function removeTreeItem(items: WorkspaceTreeItem[], path: string): WorkspaceTreeItem[] {
  return items
    .filter((item) => item.path !== path)
    .map((item) =>
      item.kind === "folder" && item.children.length > 0
        ? { ...item, children: removeTreeItem(item.children, path) }
        : item,
    );
}

function upsertTreeItem(items: WorkspaceTreeItem[], upserted: WorkspaceTreeItem): WorkspaceTreeItem[] {
  const parentPath = parentFolderPath(upserted.path);

  if (parentPath === "") {
    return sortTreeItems(replaceOrInsert(items, upserted));
  }

  return items.map((item) => {
    if (item.kind !== "folder") {
      return item;
    }
    if (item.path === parentPath) {
      return { ...item, children: sortTreeItems(replaceOrInsert(item.children, upserted)) };
    }
    if (parentPath.startsWith(`${item.path}/`)) {
      return { ...item, children: upsertTreeItem(item.children, upserted) };
    }
    return item;
  });
}

function replaceOrInsert(items: WorkspaceTreeItem[], upserted: WorkspaceTreeItem): WorkspaceTreeItem[] {
  const withoutExisting = items.filter((item) => item.path !== upserted.path);
  return [...withoutExisting, upserted];
}

function sortTreeItems(items: WorkspaceTreeItem[]): WorkspaceTreeItem[] {
  return [...items].sort((left, right) => {
    const rankDifference = folderRank(left) - folderRank(right);
    if (rankDifference !== 0) {
      return rankDifference;
    }
    return left.name.toLowerCase().localeCompare(right.name.toLowerCase());
  });
}

function folderRank(item: WorkspaceTreeItem): number {
  return item.kind === "folder" ? 0 : 1;
}

function parentFolderPath(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash === -1 ? "" : path.slice(0, lastSlash);
}

export function toggleFolder(
  current: ReadonlySet<string>,
  folderPath: string,
  tree: WorkspaceTreeItem[],
  mode: TreeMode,
): Set<string> {
  const next = new Set(current);

  if (next.has(folderPath)) {
    next.delete(folderPath);
    return next;
  }

  return openFolder(next, folderPath, tree, mode);
}

export function focusActiveNote(notePath: string, tree: WorkspaceTreeItem[]): Set<string> {
  return new Set(folderPathToNote(notePath, tree));
}

export function expandPathToNote(
  current: ReadonlySet<string>,
  notePath: string,
  tree: WorkspaceTreeItem[],
  mode: TreeMode,
): Set<string> {
  let next = new Set(current);

  for (const folderPath of folderPathToNote(notePath, tree)) {
    next = openFolder(next, folderPath, tree, mode);
  }

  return next;
}

function openFolder(
  current: ReadonlySet<string>,
  folderPath: string,
  tree: WorkspaceTreeItem[],
  mode: TreeMode,
): Set<string> {
  const next = new Set(current);
  if (mode === "accordion") {
    for (const sibling of findSiblingFolders(tree, folderPath)) {
      if (sibling.path !== folderPath) {
        removeFolderAndDescendants(next, sibling.path);
      }
    }
  }
  next.add(folderPath);
  return next;
}

export function restoreOpenFolderPaths(paths: readonly string[], tree: WorkspaceTreeItem[]): Set<string> {
  const existingFolders = new Set(flattenFolders(tree).map((folder) => folder.path));
  return new Set(paths.filter((path) => existingFolders.has(path)));
}

function folderPathToNote(notePath: string, items: WorkspaceTreeItem[], ancestors: string[] = []): string[] {
  for (const item of items) {
    if (item.kind === "note" && item.path === notePath) {
      return ancestors;
    }

    if (item.kind === "folder") {
      const path = folderPathToNote(notePath, item.children, [...ancestors, item.path]);
      if (path.length > 0) {
        return path;
      }
    }
  }

  return [];
}

function findSiblingFolders(items: WorkspaceTreeItem[], folderPath: string): WorkspaceTreeItem[] {
  if (items.some((item) => item.kind === "folder" && item.path === folderPath)) {
    return items.filter((item) => item.kind === "folder");
  }

  for (const item of items) {
    if (item.kind === "folder") {
      const siblings = findSiblingFolders(item.children, folderPath);
      if (siblings.length > 0) {
        return siblings;
      }
    }
  }

  return [];
}

function flattenFolders(items: WorkspaceTreeItem[]): WorkspaceTreeItem[] {
  return items.flatMap((item) =>
    item.kind === "folder" ? [item, ...flattenFolders(item.children)] : [],
  );
}

function removeFolderAndDescendants(paths: Set<string>, folderPath: string) {
  for (const path of paths) {
    if (path === folderPath || path.startsWith(`${folderPath}/`)) {
      paths.delete(path);
    }
  }
}
