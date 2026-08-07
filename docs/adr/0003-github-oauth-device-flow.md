---
status: amended by ADR 0010
---

# GitHub OAuth for desktop authentication

The app will authenticate GitHub access through a desktop-friendly OAuth or Device Flow and store credentials in the system keychain. Manual Personal Access Tokens may exist as an advanced fallback, but they are not the primary flow because they add friction and weaker daily-use security.

**Amended by [ADR 0010](./0010-sync-authenticates-via-system-git-credentials.md):** this OAuth flow is no longer the primary path for the common case (connecting an existing Git-backed Workspace and syncing it) — that now relies on the system's own Git credentials. Device Flow/PAT remain scoped to a future clone-or-create-from-GitHub feature.
