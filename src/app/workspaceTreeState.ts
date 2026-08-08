import type { TreeMode, WorkspaceTreeItem } from "./appState";

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
