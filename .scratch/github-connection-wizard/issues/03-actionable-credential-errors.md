Status: ready-for-agent

# Surface Git credential failures as actionable errors

## Parent

.scratch/github-connection-wizard/spec.md

## What to build

When `connect-github-remote` or `sync` fail because of Git authentication (no working SSH key, no credential helper, permission denied by the remote), the error currently returned is whatever raw Git failure message `git_failure`/`git_command_succeeded` produce today — not distinguishable from other kinds of Git failures (bad URL, network issue, merge conflict, etc.).

Add a way to recognize "this failure is auth-shaped" from the Git subprocess's stderr (Git's own permission/auth-denied wording — e.g. "Permission denied", "Authentication failed", "could not read Username") and return an error string that clearly communicates a credentials problem, distinct from other Git failures. Reuse the existing `git_failure`/`git_command_succeeded` plumbing; this is additional classification, not a rewrite of error handling.

## Acceptance criteria

- [ ] A Git auth failure during `connect-github-remote` (e.g. `remote add` followed by any operation that authenticates) surfaces an error message that clearly indicates a credentials/authentication problem.
- [ ] A Git auth failure during `sync` (pull or push) surfaces the same kind of clearly-labeled credentials error.
- [ ] Non-auth Git failures (e.g. invalid URL, merge conflict) are unaffected and keep their existing error messages.
- [ ] New unit tests (using `FakeGitCommandRunner` configured to return auth-failure-shaped output) cover both the connect and sync paths.

## Blocked by

None - can start immediately
