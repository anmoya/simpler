# 06 — Add Command Palette and Command Help

**What to build:** The user can open `Ctrl/Cmd+K` to run common actions and open an anchorable Command Help popup for available shortcuts and commands.

**Blocked by:** 05 — Polish the classic writing layout

**Status:** resolved

- [x] `Ctrl/Cmd+K` opens the Command Palette.
- [x] The Command Palette can run common Workspace, note, search, theme, sync, and help actions that exist at this point.
- [x] Command Help opens from the palette and a keyboard shortcut.
- [x] Command Help can remain visible while the user writes.
- [x] Command Help shows only commands available in the current context.
- [x] Tests cover palette opening, command execution, and help visibility.

## Comments

- Added a context-filtered Command Palette to the classic shell, opened by `Ctrl/Cmd+K` or the toolbar command button.
- Wired available commands for opening a Workspace, creating folders/notes, renaming, moving the active note, route changes for Workspace/Sync/Settings, theme switching, and Command Help.
- Added Command Help as an anchorable popup that stays visible while writing and only lists currently available commands; advertised shortcuts now execute their commands.
- Added UI tests for palette opening, command execution, context-filtered help, shortcut opening, and help persistence during editor input.
- Verified `rtk npm run test -- src/components/ClassicShell.test.tsx`, `rtk npx tsc --noEmit`, `rtk npm run test`, `rtk npm run test:native`, and `rtk npm run tauri -- build --debug --no-bundle`.
