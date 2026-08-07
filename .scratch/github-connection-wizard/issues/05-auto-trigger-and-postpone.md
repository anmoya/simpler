Status: ready-for-agent

# GitHub Connection Wizard: auto-trigger on open and postpone persistence

## Parent

.scratch/github-connection-wizard/spec.md

## What to build

Make the `GitHubConnectionWizard` (built in the previous ticket) open automatically when a Workspace is opened and its Git status is `SinGit` or `SinRemoto` (values already produced by `read_git_workspace_status` and already available to the frontend), unless the user has previously postponed it for that specific Workspace on this device.

Add a "postpone" / dismiss action to the wizard. Postponing:
- Closes the wizard without connecting anything.
- Persists the choice to `.simpler/local/state.json` (per ADR 0005 — local-only, not committed, not shared across devices), keyed by Workspace so postponing one Workspace doesn't affect others.
- Prevents the wizard from auto-opening again for that Workspace on that device (the user can still open it manually via the existing "Conectar remoto GitHub" button).

The wizard must never auto-open when a remote is already configured, regardless of postpone state.

## Acceptance criteria

- [ ] Opening a Workspace with Git status `SinGit` auto-opens the wizard.
- [ ] Opening a Workspace with Git status `SinRemoto` auto-opens the wizard.
- [ ] Opening a Workspace that already has a remote configured never auto-opens the wizard.
- [ ] Postponing the wizard closes it, persists the choice in `.simpler/local/state.json` for that Workspace, and does not call any Git/connect native command.
- [ ] Reopening the same Workspace (same device) after postponing does not auto-open the wizard again.
- [ ] The user can still open the wizard manually via the existing button after postponing.
- [ ] Tests cover: auto-open on `SinGit`/`SinRemoto`, no auto-open when a remote exists, postpone persists and suppresses future auto-open (mock the local-state persistence rather than asserting on raw file contents).

## Blocked by

- GitHub Connection Wizard: inline form and connect-then-sync flow (04)
