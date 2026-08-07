Status: ready-for-agent

# GitHub Connection Wizard

## Problem Statement

Simpler already has all the pieces to Sync a Workspace through GitHub — `git status`/`sync`, connecting an existing GitHub remote, resolving conflicts — but a real user cannot get through the flow end to end today.

Two things break the path from "a folder of notes" to "a synced, Git-backed Workspace":

1. Connecting a GitHub remote (`connect-github-remote`) requires the Workspace to already be a Git repository. A plain folder — the common starting point — is rejected outright ("Connecting a GitHub remote requires a Git-backed Workspace"), and there is no action anywhere that runs `git init`.
2. Even once a remote is connected, the first Sync always runs `git pull --rebase <remote> <branch>` before pushing. Against a freshly created, empty GitHub repository (no commits, no matching branch), that pull fails, so the very first Sync after connecting breaks.

On top of these two hard failures, the only UI for connecting a remote is a native `window.prompt()` asking for a raw GitHub URL — no validation, no inline error, no indication of whether the Workspace is even eligible yet.

GitHub OAuth Device Flow, which is documented as the primary desktop auth flow (ADR 0003), is not actually needed for this path: `gitSync` already shells out to plain `git`, which uses whatever SSH agent or `credential.helper` is already configured on the user's machine (ADR 0007, amended by [ADR 0010](../../docs/adr/0010-sync-authenticates-via-system-git-credentials.md)). Device Flow also cannot work in a real build today — its Client ID is read from an environment variable (`SIMPLER_GITHUB_CLIENT_ID`) that no shipped build sets.

## Solution

A **GitHub Connection Wizard**: a guided, in-app flow that turns any Workspace folder — Git-backed or not, with or without a remote — into a synced, Git-backed Workspace, using System Git Credentials only. It appears automatically when a Workspace is opened without a remote configured, replaces the raw `window.prompt()`, and the two backend gaps (missing `git init`, first-sync-against-empty-remote) are fixed so the guided path actually completes.

GitHub OAuth (Device Flow, PAT storage) is explicitly out of scope for this spec — it stays in the codebase for a future "clone or create a repository from GitHub" feature, but is not part of this wizard.

## User Stories

1. As a user who opens a plain folder of Markdown notes (no Git at all) as a Workspace, I want to be offered a way to connect it to GitHub, so that I don't have to know Git exists to start syncing.
2. As a user being offered the wizard, I want to be able to dismiss/postpone it, so that I'm not forced through it if I just want to write notes locally.
3. As a user who dismissed the wizard, I want that choice to be remembered per-device, so that I'm not re-prompted every time I open the same Workspace on the same machine.
4. As a user entering the wizard, I want to paste a GitHub repository URL into a proper form field (not a native browser prompt), so that the experience feels like part of the app.
5. As a user who pastes an invalid or non-GitHub URL, I want a clear inline error before anything happens, so that I don't get a confusing Git failure later.
6. As a user connecting a Workspace that isn't a Git repository yet, I want the app to initialize it for me, so that I don't have to run `git init` myself.
7. As a user connecting a Workspace that is already a Git repository (e.g. I cloned it myself) with no remote yet, I want the wizard to just add the remote, so that it doesn't redo work or fail because the repo already exists.
8. As a user whose GitHub repository is brand new and empty, I want my first Sync to succeed (push my existing notes up), so that I'm not blocked by a pull failure against a repo with no commits.
9. As a user whose GitHub repository already has commits I don't have locally, I want the normal pull-then-push Sync behavior to still apply, so that I don't lose or overwrite remote history.
10. As a user whose machine has no working Git credentials (no SSH key, no credential helper) for the given remote, I want a clear, actionable error message from the wizard/Sync (not a raw Git stack trace), so that I know it's a credentials problem and not an app bug.
11. As a user who successfully completes the wizard, I want to land back in the normal Sync panel showing "connected" and be able to press "Sync now" immediately, so that the wizard doesn't strand me somewhere else in the app.
12. As a user who already has a remote configured, I want to never see the wizard trigger automatically, so that it doesn't interrupt an already-working setup.

## Implementation Decisions

- **Backend — extend `connect_github_remote` (no new native action).** If the initial `rev-parse --is-inside-work-tree` probe reports "not a repository" (the same condition `read_git_workspace_status` currently maps to `SyncStatus::SinGit`), run `git init --initial-branch=main` before adding the remote. If the probe reports the Workspace is already a repository, skip init and proceed straight to `remote add origin` as today. No new entries in `dispatch_native_command`; this stays inside the existing `Git::connect-github-remote` action and its pure function, tested against the existing `FakeGitCommandRunner`.
- **Backend — extend `sync_git_workspace` for the first-sync case.** Before running `pull --rebase <remote> <branch>`, detect whether the remote has the target branch yet (e.g. `git ls-remote --heads <remote> <branch>` or equivalent already-available primitive). If it doesn't, skip the pull and push directly with `git push -u <remote> HEAD:<branch>` (setting upstream, since none exists yet) instead of the current unconditional `push <remote> HEAD:<branch>`. If the branch does exist remotely, behavior is unchanged (pull --rebase, then push). This is the same function and same `FakeGitCommandRunner` seam used by the existing `git_sync_*` tests.
- **Backend — surface credential failures distinctly.** When `push`/`pull` fail due to auth (non-zero Git exit with stderr indicating permission/auth failure — Git's own message, not parsed/reinterpreted beyond distinguishing "auth-shaped" failures from other Git failures), the error returned to the frontend should be recognizable as a credentials problem so the UI can show an actionable message rather than a raw Git error dump. Exact stderr-matching heuristic is an implementation detail for the agent building this — reuse whatever pattern `git_failure`/`git_command_succeeded` already provide before adding new parsing.
- **Frontend — new `GitHubConnectionWizard` component**, rendered from `ClassicShell.tsx`, replacing the `window.prompt()` call currently in `connectExistingGitHubRemote` (`App.tsx:213-233`). It calls the same `connectGitHubRemote` native wrapper — no new native command wrapper needed on the frontend either.
- **Frontend — wizard state lives in `AppState`** (`src/app/appState.ts`), following the existing pattern (no new state library). Fields needed at minimum: whether the wizard is open, the URL input value, inline validation/error state, and in-flight/loading state during connect + first sync.
- **Auto-trigger condition:** the wizard opens automatically when the active Workspace's Git status is `SinGit` or `SinRemoto` (values already produced by `read_git_workspace_status` and already flowing to the frontend as `advancedGit`/workspace status), unless the user has previously postponed it for this Workspace on this device.
- **Postpone persistence:** the "postponed" choice is stored in `.simpler/local/state.json` per ADR 0005 (local-only, not committed, not shared across devices) — not in `.simpler/workspace.json`.
- **Wizard steps (happy path):** (1) detect state and show either "Initialize & connect" (no Git yet) or "Connect remote" (Git present, no remote) framing — same form either way, differs only in the description text; (2) user enters/pastes a GitHub URL; (3) on submit, call `connect-github-remote` (now handling init internally per above); (4) on success, immediately trigger a Sync (existing `onSyncWorkspace`) to complete the first push; (5) on success, close the wizard and land on the normal Sync panel; (6) on any failure at steps 3–4, show the error inline in the wizard without closing it, so the user can retry.
- **Out of scope for the wizard UI:** no GitHub OAuth, no repository creation via GitHub's API, no account picker — the wizard only ever takes a URL the user already has (an existing empty or non-empty GitHub repo they created themselves via github.com).

## Testing Decisions

- Only test external behavior (native command inputs/outputs, and rendered UI + user interactions), not internal implementation details — consistent with existing tests in this repo.
- **Rust (`src-tauri`):** extend the existing unit tests around `connect_github_remote` and `sync_git_workspace` (see `git_sync_commits_grouped_local_changes_and_pushes_them_to_the_remote`, `git_sync_pulls_remote_changes_before_pushing_local_changes`, `git_sync_uses_plain_pull_rebase_and_push_without_force_or_discard_commands` as prior art) using the fake `GitCommandRunner`. New cases needed:
  - Connecting a remote on a plain (non-Git) folder runs `init` then `remote add`.
  - Connecting a remote on an already-initialized repo does not run `init`.
  - First Sync against a remote with no matching branch skips `pull --rebase` and runs `push -u` instead.
  - Sync against a remote that already has the branch behaves exactly as today (regression coverage — this path must not change).
  - A Git auth failure produces an error distinguishable from other Git failures.
- **TypeScript (`src`):** extend `App.test.tsx` / add a colocated test for `GitHubConnectionWizard`, following the Vitest + Testing Library conventions already in use. New cases needed:
  - Wizard auto-opens when Workspace status is `SinGit` or `SinRemoto`.
  - Wizard does not open when a remote is already configured.
  - Dismissing the wizard persists and prevents it from reopening for that Workspace (mock the local-state persistence, don't assert on file contents directly).
  - Submitting a non-GitHub URL shows an inline validation error and does not call the native command.
  - Submitting a valid URL calls `connectGitHubRemote` then triggers Sync, and closes the wizard on success.
  - A failure response from either call keeps the wizard open and shows the returned error.

## Out of Scope

- GitHub OAuth Device Flow / PAT-based authentication — untouched by this spec, remains available under Settings for a future clone/create-from-GitHub feature.
- Cloning or creating a new GitHub repository from inside the app.
- Multi-account or multi-remote support.
- Any change to conflict resolution (`resolve-conflict`) — unaffected by this spec.
- Registering a Simpler-owned GitHub OAuth App / embedding a Client ID — deferred until the clone/create feature is designed.

## Further Notes

- This spec directly implements the direction recorded in [ADR 0010](../../docs/adr/0010-sync-authenticates-via-system-git-credentials.md) (Sync authenticates via System Git Credentials) and the amendment note on [ADR 0003](../../docs/adr/0003-github-oauth-device-flow.md).
- New glossary terms already recorded in `CONTEXT.md`: **Git-backed Workspace**, **System Git Credentials**, **GitHub Connection Wizard** — use these terms in code comments, UI copy, and commit messages instead of ad hoc alternatives ("connected workspace", "login", "onboarding").
