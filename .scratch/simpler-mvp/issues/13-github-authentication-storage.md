# 13 — Add GitHub authentication storage

**What to build:** The app supports GitHub OAuth/Device Flow auth, stores credentials in the system keychain, reports auth state, and keeps PAT as an advanced fallback.

**Blocked by:** 09 — Add Git status through the system Git service

**Status:** ready-for-agent

- [ ] The app exposes a GitHub auth flow suitable for desktop use.
- [ ] OAuth or Device Flow is the primary auth path.
- [ ] Credentials are stored in the system keychain, not in the Workspace.
- [ ] The app can report connected, disconnected, expired, and failed auth states.
- [ ] Manual Personal Access Token auth is available only as an advanced fallback.
- [ ] Tests cover auth adapter behavior without requiring live GitHub network access.
