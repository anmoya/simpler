# 14 — Connect and clone existing GitHub repositories

**What to build:** The user can connect an existing GitHub repo to a local Workspace or clone an existing GitHub repo into a local folder, keeping `Abrir carpeta` and `Clonar desde GitHub` separate.

**Blocked by:** 10 — Add manual Sync against a Git remote; 13 — Add GitHub authentication storage

**Status:** ready-for-agent

- [ ] `Abrir carpeta` remains a distinct flow for existing local Workspaces.
- [ ] `Clonar desde GitHub` lets the user clone an existing repository into a local folder.
- [ ] The user can connect an existing GitHub remote to a local Workspace.
- [ ] The app detects when an opened Workspace already has a GitHub remote.
- [ ] The app does not create GitHub repositories in the MVP.
- [ ] After connect or clone, the Workspace can participate in manual Sync.
- [ ] Tests cover open-existing, clone-existing, connect-remote, existing-remote detection, and error states.
