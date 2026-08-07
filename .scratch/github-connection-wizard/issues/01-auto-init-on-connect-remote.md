Status: done

# Auto-init a Git repository when connecting a GitHub remote

## Parent

.scratch/github-connection-wizard/spec.md

## What to build

`connect_github_remote` currently rejects any Workspace that is not already a Git repository ("Connecting a GitHub remote requires a Git-backed Workspace"). Extend it so that when the initial `rev-parse --is-inside-work-tree` probe reports the folder is not a repository, it runs `git init --initial-branch=main` before adding the remote (`remote add origin <url>`), instead of erroring out. When the Workspace is already a Git repository, behavior is unchanged: skip init, go straight to `remote add`.

No new native command/action — this is a change entirely inside the existing pure function behind `Git::connect-github-remote`, tested against the existing `FakeGitCommandRunner` seam.

## Acceptance criteria

- [ ] Calling `connect-github-remote` on a plain folder (not yet a Git repository) succeeds: it initializes the repository with `main` as the initial branch, then adds the given URL as `origin`.
- [ ] Calling `connect-github-remote` on a folder that is already a Git repository (no remote yet) behaves exactly as today — no `init` is run, only `remote add`.
- [ ] Existing tests around `connect_github_remote` continue to pass unmodified except where they directly assert on the old "requires a Git-backed Workspace" rejection for a non-repo folder (that behavior is intentionally changing).
- [ ] New unit tests (using `FakeGitCommandRunner`) cover both the non-repo and already-a-repo cases.

## Blocked by

None - can start immediately
