Status: done

# Fix first Sync against a newly connected, empty GitHub remote

## Parent

.scratch/github-connection-wizard/spec.md

## What to build

`sync_git_workspace` always runs `git pull --rebase <remote> <branch>` before pushing. Against a freshly created, empty GitHub repository (no commits, no branch matching the local one), that pull fails and Sync breaks on the very first attempt after connecting a remote.

Before running `pull --rebase`, detect whether the remote already has the target branch (e.g. via `git ls-remote --heads <remote> <branch>`, or an equivalent primitive already available through `GitCommandRunner`). If the branch does not exist on the remote yet, skip the pull entirely and push directly with `git push -u <remote> HEAD:<branch>` (setting upstream, since none exists yet). If the branch does exist remotely, behavior is unchanged: `pull --rebase` then the existing `push <remote> HEAD:<branch>` (no `-u` needed, upstream already set).

Same function, same `FakeGitCommandRunner` seam used by the existing `git_sync_*` tests — no new native action.

## Acceptance criteria

- [ ] Sync against a remote with no matching branch skips `pull --rebase` and runs `push -u <remote> HEAD:<branch>` instead.
- [ ] Sync against a remote that already has the matching branch behaves exactly as today (pull --rebase, then push) — regression coverage, this path must not change.
- [ ] Existing tests `git_sync_commits_grouped_local_changes_and_pushes_them_to_the_remote`, `git_sync_pulls_remote_changes_before_pushing_local_changes`, and `git_sync_uses_plain_pull_rebase_and_push_without_force_or_discard_commands` continue to pass.
- [ ] New unit test covers the empty-remote / first-sync case end to end (stage → commit → push -u, no pull attempted).

## Blocked by

None - can start immediately
