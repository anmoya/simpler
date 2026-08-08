Status: ready-for-agent

# Workspace Tree collapsible folders

## Problem Statement

The Workspace Tree (see `CONTEXT.md`) currently always renders every folder fully expanded — there is no way to collapse a folder, so large workspaces produce a long, unmanageable sidebar.

## Solution

Add folder expand/collapse to the Workspace Tree, with two configurable display modes:

- **Free Tree Mode** (default): opening a folder never collapses any other folder.
- **Accordion Tree Mode**: opening a folder collapses its sibling folders at that same level (cascading their descendants closed), without touching unrelated branches elsewhere in the tree.

A **Focus Active Note** action collapses everything except the full path from the root to the folder containing the active note, regardless of the current mode.

Navigating to a note (Global Search result, Command Palette jump, or restoring the last-opened note on workspace open) auto-expands the path to that note, respecting the current mode (Accordion Mode still collapses unrelated branches).

Both the chosen mode and the current expand/collapse state are per-device preferences, persisted in `.simpler/local/state.json`, not synced via `workspace.json`.

## User Stories

1. As a user with a deep folder structure, I can collapse a folder to hide its contents and reduce sidebar clutter.
2. As a user, I can switch the tree between Accordion Tree Mode and Free Tree Mode via a control in the sidebar header.
3. As a user in Accordion Tree Mode, opening one folder automatically collapses its sibling folders at that level, so only one branch per level is open at a time.
4. As a user in Free Tree Mode, opening folders never auto-collapses anything else.
5. As a user, I can click "Focus Active Note" to instantly collapse everything except the path to the note I'm currently editing.
6. As a user, when I jump to a note via Global Search or Command Palette, the tree reveals it by expanding the path to it (and, in Accordion Mode, collapsing unrelated branches).
7. As a user, my expand/collapse state and chosen mode are remembered the next time I open this workspace on this device.

## Implementation Decisions

- Expand/collapse state and the Accordion/Free mode selection live in `.simpler/local/state.json` (per-device, gitignored), not `.simpler/workspace.json` — this is a navigation preference, not workspace content.
- Default mode for a workspace with no prior preference recorded: Free Tree Mode.
- Accordion Tree Mode collapse scope is strictly per-level siblings-of-the-opened-folder (cascading their descendants), never a global "collapse everything else in the tree" — see `CONTEXT.md`'s Accordion Tree Mode definition.
- Focus Active Note is available in both modes and always expands the *entire* path from root to the active note's folder, not just the top-level ancestor.

## Testing Decisions

- Vitest coverage for the expand/collapse state engine (toggle, accordion cascade, Focus Active Note path computation) independent of React rendering, following this repo's existing pattern of testing state-machine logic separately from UI wiring (see `automaticSyncScheduler.ts`).
- Vitest + Testing Library coverage for the mode-switch control and auto-expand-on-navigation behavior.

## Out of Scope

- Multi-select or bulk folder operations.
- Remembering per-folder collapse state across different workspaces (each workspace's local state is independent, per existing `.simpler/local/` conventions).
- Any change to `workspace.json` or shared/synced state.

## Further Notes

Full design discussion in the grill-with-docs session that produced this spec; see `CONTEXT.md` entries for **Accordion Tree Mode**, **Free Tree Mode**, and **Focus Active Note**.
