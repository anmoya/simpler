# Simpler

Simpler is a local-first Markdown notes app for daily personal writing across multiple devices.

## Language

**Workspace**:
A normal filesystem folder that the app opens as the user's notes space. The workspace remains readable and editable outside the app, and app-specific state belongs in hidden metadata rather than replacing the folder structure.
_Avoid_: Vault, project, proprietary store

**Workspace Tree**:
The real folder and Markdown file hierarchy inside the workspace as shown in the app sidebar.
_Avoid_: Virtual tree, database-backed folders

**Accordion Tree Mode**:
A Workspace Tree display setting where opening a folder collapses its sibling folders at that same level (cascading their descendants closed), without affecting unrelated branches elsewhere in the tree. A per-device preference, not shared via the Workspace.
_Avoid_: Auto-collapse, single-open mode

**Free Tree Mode**:
A Workspace Tree display setting where opening a folder never collapses any other folder. The default for a Workspace no one has configured yet.
_Avoid_: Manual mode, multi-open mode

**Focus Active Note**:
A Workspace Tree action that collapses every folder except the full path from the root to the folder containing the active note. Available regardless of the current Accordion/Free Tree Mode.
_Avoid_: Reveal in tree, collapse all

**Note Identity**:
The note's real path and filename inside the workspace.
_Avoid_: Heading, display title

**Note Title**:
The first Markdown heading in a note when present, used as optional display text but not as the note's identity.
_Avoid_: Filename, path

**Raw Markdown**:
The primary writing experience where the user edits Markdown source text directly, and the saved file content is exactly the Markdown text.
_Avoid_: WYSIWYG, rich-text document

**Standard Markdown**:
Markdown syntax based on CommonMark and common GitHub-flavored features, without app-specific note syntax in the MVP.
_Avoid_: Proprietary Markdown, custom blocks, wikilinks

**Command Palette**:
A keyboard-first action launcher for workspace actions such as creating notes, searching, syncing, changing theme, and opening help.
_Avoid_: Menu, toolbar

**Command Help**:
A contextual popup that teaches currently available keyboard commands and can stay visible while the user writes.
_Avoid_: Documentation page, tutorial

**Global Search**:
Plain-text search across Markdown files in the active workspace, returning matching files and line references.
_Avoid_: Semantic search, fuzzy finder

**Local Save**:
Persisting note changes to files inside the workspace without requiring network access or Git operations.
_Avoid_: Sync, publish, backup

**Sync**:
Moving committed workspace changes between the local device and the configured Git remote so multiple devices can converge on the same notes.
_Avoid_: Save, upload

**Git-backed Workspace**:
A Workspace whose folder is also a Git repository with a configured remote, making it eligible for Sync.
_Avoid_: Connected workspace, linked repo

**System Git Credentials**:
The Git authentication already configured on the user's machine (SSH agent, `credential.helper`, etc.) that Sync relies on directly, the same way a plain `git pull`/`push` from a terminal would. Simpler does not intermediate this with its own login.
_Avoid_: Login, sign-in, Simpler account

**GitHub Connection Wizard**:
The guided flow that turns a plain Workspace folder into a Git-backed Workspace with a GitHub remote configured, using System Git Credentials.
_Avoid_: Onboarding, setup flow

**Theme**:
A named, self-contained set of colors, typography, and shape (corner radius, shadow style) applied across the whole app shell and editor. Multiple Themes can exist; each Theme must define its own light and dark Appearance Mode.
_Avoid_: Palette, skin, style

**Appearance Mode**:
The light/dark variant selected within the current Theme.
_Avoid_: Color scheme, dark mode (when referring to the axis rather than the dark value specifically)

**Close Sync Prompt**:
A blocking dialog shown when the in-app close action is used while changes are pending Sync, letting the user choose to wait for Sync to finish or close without it. Always resolves to closing — it never cancels the close outright. Not shown for a window-manager-initiated close (that path bypasses the app's JS entirely).
_Avoid_: Confirm dialog, exit warning
