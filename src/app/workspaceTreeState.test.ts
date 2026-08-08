import { describe, expect, it } from "vitest";
import type { WorkspaceTreeItem } from "./appState";
import {
  expandPathToNote,
  focusActiveNote,
  restoreOpenFolderPaths,
  toggleFolder,
} from "./workspaceTreeState";

const tree: WorkspaceTreeItem[] = [
  {
    name: "daily",
    path: "daily",
    kind: "folder",
    children: [
      {
        name: "2026",
        path: "daily/2026",
        kind: "folder",
        children: [{ name: "today.md", path: "daily/2026/today.md", kind: "note", children: [] }],
      },
      {
        name: "archive",
        path: "daily/archive",
        kind: "folder",
        children: [{ name: "old.md", path: "daily/archive/old.md", kind: "note", children: [] }],
      },
    ],
  },
  {
    name: "ideas",
    path: "ideas",
    kind: "folder",
    children: [
      {
        name: "drafts",
        path: "ideas/drafts",
        kind: "folder",
        children: [{ name: "plan.md", path: "ideas/drafts/plan.md", kind: "note", children: [] }],
      },
    ],
  },
];

describe("Workspace Tree state", () => {
  it("toggles one folder without changing independent open folders in Free Tree Mode", () => {
    const opened = toggleFolder(new Set(["ideas"]), "daily", tree, "free");
    expect([...opened].sort()).toEqual(["daily", "ideas"]);

    const closed = toggleFolder(opened, "daily", tree, "free");
    expect([...closed]).toEqual(["ideas"]);
  });

  it("opening an accordion folder closes its siblings and descendants without touching unrelated levels", () => {
    const opened = toggleFolder(
      new Set(["daily", "daily/2026", "ideas", "ideas/drafts"]),
      "daily/archive",
      tree,
      "accordion",
    );

    expect([...opened].sort()).toEqual(["daily", "daily/archive", "ideas", "ideas/drafts"]);
  });

  it("Focus Active Note leaves exactly the full folder path to the active note open", () => {
    expect([...focusActiveNote("daily/2026/today.md", tree)]).toEqual(["daily", "daily/2026"]);
  });

  it("expands a note path without disturbing other branches in Free Tree Mode", () => {
    const opened = expandPathToNote(new Set(["ideas", "ideas/drafts"]), "daily/2026/today.md", tree, "free");
    expect([...opened].sort()).toEqual(["daily", "daily/2026", "ideas", "ideas/drafts"]);
  });

  it("expands a note path with accordion cascades at each level", () => {
    const opened = expandPathToNote(
      new Set(["daily", "daily/archive", "ideas", "ideas/drafts"]),
      "daily/2026/today.md",
      tree,
      "accordion",
    );
    expect([...opened]).toEqual(["daily", "daily/2026"]);
  });

  it("drops persisted folder paths that no longer exist", () => {
    expect([...restoreOpenFolderPaths(["daily", "daily/missing", "ideas/drafts"], tree)]).toEqual([
      "daily",
      "ideas/drafts",
    ]);
  });
});
