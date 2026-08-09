# Trash UI: view and restore

Status: ready-for-agent

## Parent

`.scratch/trash/spec.md`

## What to build

Add a way to view and restore items sitting in `.simpler/local/trash/` (populated by issue 01).

- New native actions under the `Filesystem` domain (e.g. `list-trash`, `restore-trash-item`) with typed wrapper functions in `src/native/commands.ts`, following the existing `dispatch_native_command` if-chain pattern.
  - `list-trash` reads `.simpler/local/trash/index.json` and returns entries (original path, deleted-at, isDirectory).
  - `restore-trash-item` moves the item back to its `originalRelativePath` and removes its entry from the index. If a file/folder already exists at the original path, fail with a clear error rather than overwriting (surface this to the UI as an error the same way other native errors are surfaced).
- UI entry point reachable from `ClassicShell` (e.g. a "Papelera" item in the existing sidebar/command surface — follow whatever pattern the sidebar already uses for auxiliary views) showing the trashed items list with deletion date and a "Restore" action per item.

## Acceptance criteria

- [ ] `list-trash` native action returns all current trash entries for a workspace
- [ ] `restore-trash-item` moves the item back to its original path and removes it from the trash index
- [ ] Restoring when the original path is already occupied returns an error and does not delete the trashed copy
- [ ] The Trash UI lists items with their original path and deletion date, and a working "Restore" action per item
- [ ] Restoring an item from the UI makes it reappear in the Workspace Tree at its original location
- [ ] Native tests cover `list-trash` and `restore-trash-item` (including the path-occupied error case)
- [ ] An App/component test exercises opening the Trash view and restoring an item
- [ ] `npm run test` and `npm run test:native` pass

## Blocked by

- `.scratch/trash/issues/01-move-to-trash-on-delete.md`
