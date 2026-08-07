---
status: accepted (amends ADR 0003)
---

# Sync authenticates via system Git credentials, not Simpler-managed OAuth

ADR 0003 named GitHub OAuth Device Flow as the *primary* desktop auth flow, with PATs as an advanced fallback. In practice, `gitSync` already shells out to plain `git pull --rebase` / `git push` (ADR 0007), which inherits whatever SSH agent or `credential.helper` is already configured on the machine — the same as running `git` from a terminal. For a Workspace that is already a Git repo with a working remote, this means Sync needs no Simpler-specific authentication at all; Device Flow was solving a problem that didn't exist for this case, while contributing to real onboarding friction (Device Flow requires a registered GitHub OAuth App and a `SIMPLER_GITHUB_CLIENT_ID`, which no shipped build currently provides).

We're narrowing scope: connecting a Workspace to an existing GitHub remote and syncing it relies entirely on the system's Git credentials. Simpler's own GitHub auth (Device Flow, PAT storage in the keychain) is reserved for a future "clone or create a repository from inside the app" feature, which is out of scope for now — it's not required for the connect-existing-remote-and-sync path this ADR covers.

**Consequences:**
- The `Auth` domain and GitHub OAuth code stay in the codebase but become optional/secondary, not a gate for Sync.
- Errors from `connect-github-remote` / `sync` must surface Git's own auth failures (e.g. permission denied, no SSH key) clearly, since Simpler no longer mediates authentication for this path.
- If/when "clone or create from GitHub" is designed, revisit whether Device Flow needs a Simpler-owned OAuth App with an embedded Client ID (public, non-secret, compiled into the binary) versus other approaches.
