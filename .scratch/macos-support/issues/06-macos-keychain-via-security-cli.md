# macOS keychain through the `security` CLI

Status: ready-for-agent

## Parent

`.scratch/macos-support/spec.md` — reasoning in ADR 0014 ("Keychain").

## What to build

A macOS implementation of the existing `GitHubCredentialStore` trait in `src-tauri/src/lib.rs`, selected by `cfg(target_os)`, shelling out to the `security` CLI the way `SystemCredentialStore` shells out to `secret-tool` today:

| Trait method | Linux (`secret-tool`) | macOS (`security`) |
| --- | --- | --- |
| `access_token` | `lookup service simpler account github` | `find-generic-password -s simpler -a github -w` |
| `store_access_token` | `store --label=... service simpler account github` (token on stdin) | `add-generic-password -s simpler -a github -w <token> -U` |
| `clear_access_token` | `clear service simpler account github` | `delete-generic-password -s simpler -a github` |

Points to get right:

- **"Not found" is not an error.** The Linux path treats exit code 1 from `secret-tool lookup` as `Ok(None)`; `security find-generic-password` exits 44 (`errSecItemNotFound`) for the same situation. Mapping that to `Err` would make a Mac with no stored token look like a broken keychain.
- `add-generic-password` needs `-U` to overwrite an existing item instead of failing on duplicate.
- Passing the token as an argv flag makes it visible in `ps`. Prefer whatever avoids that; if there's no way around it on `security`, say so in the code comment rather than leaving it silently.
- The trait, its call sites and the fake-based tests do not change. Only a second implementation is added.

Stakes, so this isn't over-engineered: this token does **not** authenticate Sync (ADR 0010 — `git` uses System Git Credentials). It backs the GitHub connection state and the GitHub Connection Wizard.

## Acceptance criteria

- [ ] A macOS `GitHubCredentialStore` implementation exists behind `cfg(target_os = "macos")`; the Linux implementation is untouched
- [ ] Item-not-found on macOS returns `Ok(None)`, not `Err`
- [ ] Storing a token twice overwrites rather than failing
- [ ] Existing fake-based native tests still pass unchanged on both platforms
- [ ] Live on the Mac: connecting GitHub stores a token that survives an app restart, and disconnecting removes it (verify with `security find-generic-password -s simpler -a github`)
- [ ] `npm run test:native` passes

## Blocked by

- 01

## Comments

Implemented as a second `impl GitHubCredentialStore for SystemCredentialStore`, gated `#[cfg(target_os = "macos")]` alongside the existing Linux impl (now gated to Linux/BSD); the trait, its call sites, and `StubCredentialStore`-based tests are all untouched, per the ticket. `access_token` maps `security find-generic-password`'s exit 44 to `Ok(None)`; `store_access_token` uses `add-generic-password -U` to overwrite; `clear_access_token` uses `delete-generic-password`. The token-visible-in-`ps` limitation is real and undodgeable on `security` (no stdin form for `-w`, unlike `secret-tool store`) — documented in a code comment rather than left silent, as asked.

Verified live on this Mac by running the exact `security` invocations my Rust code shells out to, against the real `simpler`/`github` service/account keys, confirming the whole cycle: `find-generic-password` on a not-yet-connected keychain exits 44; `add-generic-password -U` succeeds and a second `add-generic-password -U` overwrites rather than erroring; `find-generic-password` afterward reads the stored value back; `delete-generic-password` removes it; `find-generic-password` afterward exits 44 again, not some other error. That closes the loop on the CLI mechanics this code depends on.

**Not independently re-verified**: driving an actual GitHub OAuth Device Flow connect/disconnect through the running app's UI, which needs a real GitHub account login in a browser — out of scope for this agent to do unattended. Given the CLI-mechanics verification above and that this is a straight port of the already-tested Linux pattern to a different CLI tool, that gap is low-risk, but a human doing one real connect → restart-the-app → disconnect pass is still worth it before calling this fully closed.

`npm run test:native`: 71/71 pass (up from 69 pre-round; no regressions from this change specifically — see ticket 02/05 comments for the other new tests).
