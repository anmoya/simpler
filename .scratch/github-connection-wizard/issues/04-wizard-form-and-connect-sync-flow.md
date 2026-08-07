Status: ready-for-agent

# GitHub Connection Wizard: inline form and connect-then-sync flow

## Parent

.scratch/github-connection-wizard/spec.md

## What to build

Replace the native `window.prompt()` currently used in `connectExistingGitHubRemote` (App.tsx) with a proper in-app component, `GitHubConnectionWizard`, rendered from `ClassicShell.tsx`. This ticket covers the manually-triggered flow only (the wizard opens when the user clicks "Conectar remoto GitHub" from the Sync panel, same trigger point as today) — automatic opening on Workspace load is a separate ticket.

The wizard:
1. Shows a form with a single GitHub repository URL input.
2. Validates the URL client-side before submitting (must look like a GitHub repository URL) and shows an inline error without calling any native command if invalid.
3. On submit with a valid URL, calls the existing `connectGitHubRemote` native wrapper.
4. On a successful connect, immediately triggers a Sync (the existing `onSyncWorkspace` flow) to complete the first push.
5. On success of both steps, closes the wizard and returns to the normal Sync panel (now showing the connected remote).
6. On failure of either step, keeps the wizard open and shows the returned error inline (including the actionable credentials-error text from the backend ticket, when applicable) so the user can retry without losing their input.

Wizard state (open/closed, input value, validation error, in-flight/loading, last error) lives in the existing `AppState` object (`src/app/appState.ts`) — no new state library.

## Acceptance criteria

- [ ] Clicking "Conectar remoto GitHub" opens the `GitHubConnectionWizard` instead of a native `window.prompt()`.
- [ ] Submitting a non-GitHub URL shows an inline validation error and does not call `connectGitHubRemote`.
- [ ] Submitting a valid URL calls `connectGitHubRemote`, then on success triggers Sync, then closes the wizard.
- [ ] A failure from `connectGitHubRemote` keeps the wizard open and displays the returned error inline.
- [ ] A failure from the subsequent Sync call (after a successful connect) keeps the wizard open (or otherwise clearly surfaces the failure) and displays the returned error inline.
- [ ] Tests (Vitest + Testing Library, colocated with `App.test.tsx` or a new `GitHubConnectionWizard.test.tsx`) cover: valid submit → connect → sync → close; invalid URL → no native call; connect failure → error shown, wizard stays open.

## Blocked by

- Auto-init a Git repository when connecting a GitHub remote (01)
- Fix first Sync against a newly connected, empty GitHub remote (02)
- Surface Git credential failures as actionable errors (03)
