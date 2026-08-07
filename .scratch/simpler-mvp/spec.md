Status: ready-for-agent

# Simpler MVP Spec

## Problem Statement

The user wants a daily writing app that keeps notes simple, durable, and portable across devices. Existing note apps either hide the underlying files, push the user into proprietary data models, or require manual Git habits that are easy to forget during daily use.

The user needs a desktop app that opens a normal folder as a Workspace, edits Raw Markdown files directly, shows a clear folder-based interface, and uses Git/GitHub to keep notes synchronized between personal devices without making Git the center of the daily writing experience.

## Solution

Build a Linux-first desktop MVP for Simpler using Tauri, React, TypeScript, Vite, and CodeMirror 6. The app opens or clones a Workspace, shows the real Workspace Tree in a classic sidebar/editor/status layout, lets the user create and manage Markdown notes, saves locally immediately, and synchronizes committed changes through Git/GitHub using a simple Sync model.

The primary experience is writing Raw Markdown in `.md` files. The app shows only Markdown files as editable notes in the Workspace Tree, preserves other files without managing them, and stores app metadata in `.simpler/` rather than modifying notes with mandatory frontmatter. Git is hidden behind statuses such as `Sincronizado`, `Cambios locales`, `Sincronizando`, `Necesita resolver conflicto`, and `Error`, with technical Git details available in an advanced view.

## User Stories

1. As a daily writer, I want to open a normal folder as my Workspace, so that my notes remain portable outside the app.
2. As a daily writer, I want the app to show my folders and Markdown files in a sidebar, so that I can navigate notes by the structure I already understand.
3. As a daily writer, I want the sidebar to reflect the real filesystem, so that changes made outside the app are not trapped in a separate app model.
4. As a daily writer, I want to create a folder inside the selected Workspace, so that I can organize notes by topic.
5. As a daily writer, I want to create a Markdown note inside a selected folder, so that I can place notes where they belong immediately.
6. As a daily writer, I want new notes to use explicit names, so that filenames stay meaningful in Git and other editors.
7. As a daily writer, I want the app to add `.md` when I omit the extension, so that creating notes is fast without losing file clarity.
8. As a daily writer, I want the app to refuse overwriting an existing note, so that I do not lose existing writing by accident.
9. As a daily writer, I want to rename notes from the sidebar, so that I can clean up Note Identity without leaving the app.
10. As a daily writer, I want to rename folders from the sidebar, so that my Workspace Tree stays organized.
11. As a daily writer, I want to move notes between folders, so that I can reorganize notes as my thinking changes.
12. As a daily writer, I want non-Markdown files to be preserved but hidden from the note list, so that the app stays focused on writing.
13. As a daily writer, I want hidden folders such as `.git` and `.simpler` excluded from the sidebar, so that internal machinery does not clutter my notes.
14. As a daily writer, I want to edit Raw Markdown directly, so that the saved file is exactly what I wrote.
15. As a daily writer, I want Markdown syntax highlighting, so that long notes are easier to scan.
16. As a daily writer, I want line numbers in the editor, so that navigation and conflict discussion are precise.
17. As a daily writer, I want Local Save to happen immediately, so that my writing does not depend on network or Git.
18. As a daily writer, I want the app to remember the last opened note in a Workspace, so that I can resume quickly.
19. As a daily writer, I want the app to remember recent Workspaces, so that I can switch between note folders without browsing every time.
20. As a daily writer, I want only one active Workspace at a time, so that search and Sync state are unambiguous.
21. As a daily writer, I want a classic layout with sidebar, editor, and status bar, so that the app stays simple and functional.
22. As a daily writer, I want light and dark themes, so that I can write comfortably at different times.
23. As a keyboard-heavy user, I want a Command Palette, so that I can run actions without hunting through UI controls.
24. As a keyboard-heavy user, I want to open the Command Palette with `Ctrl/Cmd+K`, so that action launching is consistent.
25. As a keyboard-heavy user, I want commands for creating notes, searching, syncing, changing theme, and opening help, so that common actions are reachable from one place.
26. As a keyboard-heavy user, I want Command Help, so that I can learn available shortcuts while writing.
27. As a keyboard-heavy user, I want Command Help to stay visible when I choose, so that it can accompany me until I learn the commands.
28. As a keyboard-heavy user, I want useful Vim-inspired shortcuts, so that navigation is faster without requiring a full Vim mode.
29. As a keyboard-heavy user, I want to jump to a line, so that I can navigate long notes quickly.
30. As a keyboard-heavy user, I want to search within the current file, so that I can find text in the note I am editing.
31. As a daily writer, I want Global Search across Markdown files, so that I can find notes by text.
32. As a daily writer, I want Global Search results to show file and line references, so that I can jump to the right context quickly.
33. As a daily writer, I want the first Markdown heading to be used as an optional Note Title, so that notes can look nicer without changing their identity.
34. As a daily writer, I want the filename/path to remain the Note Identity, so that changing a heading does not unexpectedly rename or move files.
35. As a daily writer, I want to open an existing Git-backed Workspace, so that the app can detect Sync configuration.
36. As a daily writer, I want to connect an existing GitHub repository to a Workspace, so that I can sync notes without creating a repository in the app.
37. As a daily writer on a new computer, I want to clone from GitHub into a local folder, so that I can bring my notes to that device.
38. As a daily writer, I want `Abrir carpeta` and `Clonar desde GitHub` to be separate flows, so that I understand whether I am opening local notes or creating a local clone.
39. As a daily writer, I want GitHub authentication through OAuth or Device Flow, so that I do not need to paste tokens for normal use.
40. As a daily writer, I want credentials stored in the system keychain, so that secrets are not written into the Workspace.
41. As an advanced user, I want Personal Access Token auth as a fallback, so that I can recover if OAuth is not available.
42. As a daily writer, I want Sync to show simple product statuses, so that I know whether my notes are safe without thinking in Git terms.
43. As a daily writer, I want local changes to be grouped into automatic commits, so that I do not need to remember manual commits.
44. As a daily writer, I want automatic Sync after short inactivity or periodic writing, so that changes eventually reach GitHub.
45. As a daily writer, I want Sync to run when opening a Workspace, so that I start from the latest remote state when safe.
46. As a daily writer, I want Sync to run when closing the app when possible, so that my latest changes are less likely to stay local.
47. As a daily writer, I want a manual sync action, so that I can force synchronization before switching devices.
48. As a daily writer, I want the app to keep writing locally when offline, so that network loss does not block note-taking.
49. As a daily writer, I want the app to retry Sync after connectivity returns, so that temporary network failures recover without manual Git.
50. As a daily writer, I want Sync to never discard local changes automatically, so that my notes are protected.
51. As a daily writer, I want the app to never force push in the MVP, so that one device cannot overwrite another device's history.
52. As a daily writer, I want conflicts to pause Sync, so that I can resolve them deliberately.
53. As a daily writer, I want conflicted files listed clearly, so that I know what needs attention.
54. As a daily writer, I want conflict resolution options for local, remote, and manual conflict markers, so that I can choose the safest resolution per file.
55. As an advanced user, I want to see the connected repository, current branch, latest commit, pending changes, and recent Sync events, so that I can diagnose problems.
56. As an advanced user, I want technical Git controls in an advanced view, so that I can recover without leaving the app when appropriate.
57. As a daily writer, I want `.simpler/` metadata to stay separate from my notes, so that my Markdown remains portable.
58. As a daily writer, I want shared safe Workspace settings to sync when useful, so that Workspace behavior can follow me between devices.
59. As a daily writer, I want local metadata, caches, logs, and credentials excluded from Git, so that device-specific state does not pollute my notes repository.
60. As a Linux user, I want the MVP validated on Linux first, so that the first version works well in my actual environment.
61. As a future macOS or Windows user, I want platform assumptions isolated, so that the app can be ported later.

## Implementation Decisions

- The first product surface is a Tauri desktop app.
- The MVP is Linux-first while keeping paths, credentials, Git execution, and UI assumptions portable for later macOS/Windows support.
- The UI stack is React, TypeScript, and Vite.
- The Markdown editor is CodeMirror 6.
- The app opens a normal filesystem folder as a Workspace.
- The Workspace Tree shown in the sidebar is derived from the real filesystem hierarchy.
- Only `.md` files are visible and editable as notes in the MVP.
- Non-Markdown files are preserved and can still be synchronized by Git, but they are not shown or edited as notes.
- Hidden/internal folders such as `.git` and `.simpler` are excluded from the visible Workspace Tree.
- Raw Markdown is the primary writing experience.
- Standard Markdown/CommonMark/GitHub-flavored basics are supported in the MVP.
- WYSIWYG editing, proprietary Markdown syntax, wikilinks, backlinks, and graph views are excluded from the MVP.
- Markdown preview is excluded from the MVP.
- The classic layout is the only MVP layout: sidebar, central editor, and bottom/status area.
- Light and dark themes are included in the MVP.
- Multiple visual layout modes such as focus/editorial are excluded from the MVP.
- Command Palette is included as the keyboard-first action launcher.
- Command Help is included as a contextual popup that can stay visible while writing.
- The MVP includes useful Vim-inspired shortcuts, not a full Vim mode.
- Note Identity is the real path and filename.
- Note Title is derived from the first Markdown heading when present, and never automatically renames the file.
- New notes are created explicitly in the selected folder, with `.md` normalization and no overwrite.
- No daily-note special mode is included in the MVP.
- App metadata lives under `.simpler/`.
- The MVP separates shared safe Workspace metadata from local ignored metadata.
- Mandatory frontmatter or app-specific fields are not written into notes.
- Local Save persists note changes to disk without waiting for Git or network access.
- Sync is a separate operation from Local Save.
- Git is hidden behind a simple Sync product model in the main UI.
- A technical/advanced Git view is available for diagnostics and manual recovery.
- Git operations use the system `git` executable through an internal service boundary in the MVP.
- The MVP connects to an existing GitHub repository rather than creating repositories from inside the app.
- `Abrir carpeta` and `Clonar desde GitHub` are separate onboarding/opening flows.
- GitHub auth uses OAuth or Device Flow, storing credentials in the system keychain.
- Manual Personal Access Tokens are allowed only as an advanced fallback.
- Automatic Sync groups changes rather than pushing on every keystroke.
- A reasonable MVP Sync cadence is commit after 30-60 seconds of inactivity or periodically during continued writing, plus sync on open, close, and manual command.
- On opening a Workspace, the app may pull automatically only when local changes are protected.
- The MVP never discards local changes automatically.
- The MVP never force pushes.
- Conflict resolution detects conflicts, pauses Sync, lists conflicted files, and offers local, remote, and manual conflict-marker resolution.
- Global Search is plain-text search across Markdown files in the active Workspace.
- Semantic search and fuzzy advanced search are out of scope.

## Testing Decisions

- Tests should verify external behavior and user-visible contracts rather than internal implementation details.
- Workspace behavior should be tested through a high-level Workspace service seam.
- Workspace tests should use temporary folders to verify opening a Workspace, reading the Workspace Tree, filtering `.md` files, ignoring internal folders, creating notes/folders, renaming notes/folders, moving notes, preserving non-Markdown files, and writing `.simpler/` metadata without modifying note contents.
- Editor behavior should be tested at the app/UI behavior level rather than by testing CodeMirror internals.
- Editor tests should verify opening a note, editing Raw Markdown, Local Save to disk, file search, line navigation, Command Palette actions, and Command Help visibility.
- Sync behavior should be tested through a Git service adapter seam.
- Sync tests should use temporary local Git repositories and local bare remotes for core behavior rather than GitHub network calls.
- Sync tests should cover status detection, grouped commits, pull/push, offline/error states where practical, no force push, local-change protection, conflict detection, conflict pause, and conflict resolution.
- GitHub authentication should sit behind an auth adapter so OAuth/Device Flow and keychain behavior can be tested separately from core Sync.
- The Tauri command layer should be tested as the contract between the React UI and native capabilities.
- Tauri command tests should cover opening Workspaces, filesystem operations, Git operations, auth state, and Sync status events.
- UI acceptance tests should focus on the classic layout workflows instead of exhaustively testing every component.
- Regression tests should be added for any bug that could lose note content, corrupt the Workspace Tree, discard local changes, or misreport Sync state.

## Out of Scope

- WYSIWYG editing.
- Markdown preview.
- Full Vim mode.
- Multiple layout modes such as focus or editorial.
- Tabs or multiple simultaneously active Workspaces.
- Mobile apps.
- Real-time collaboration.
- Creating GitHub repositories from inside the app.
- Advanced conflict diff UI.
- Semantic search.
- Advanced fuzzy search.
- Wikilinks.
- Backlinks.
- Graph view.
- Plugins.
- Mandatory frontmatter.
- Proprietary Markdown blocks.
- Daily-note special mode.
- Multi-OS release support in the MVP.
- Embedded Git library implementation.

## Further Notes

- The UI reference zip in the repo is treated as a visual direction for the classic layout, not as binding implementation code.
- The app should optimize for daily writing and operational confidence: files should remain readable, Git history should stay understandable, and local writing should never depend on network access.
- Future specs can add Markdown preview, repository creation, daily notes, richer conflict UI, multi-platform packaging, or more powerful search after the MVP proves the Workspace, editor, and Sync model.
