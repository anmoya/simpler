# Live check: does the updater replace an unsigned `.app` and still launch?

Status: ready-for-agent

## Parent

`.scratch/macos-support/spec.md` — reasoning in ADR 0015.

## What to build

Nothing, unless it fails. This is the hypothesis the whole macOS distribution plan rests on, and it was accepted as a hypothesis, not a fact.

The claim: an unsigned Simpler installed from `.dmg` (quarantine cleared once by hand) can download and install a signed `.app.tar.gz` through `tauri-plugin-updater`, and the replaced bundle still launches — because the updater fetches and unpacks the archive itself, so LaunchServices never applies the quarantine attribute the browser download got.

Test it end to end, with two real releases:

1. Install version N from `.dmg` on the Mac, clearing quarantine as the README describes.
2. Tag and publish version N+1.
3. Let the running app find, download and install the update, then restart.
4. Confirm it launches with **no** Gatekeeper prompt and reports the new version.
5. Confirm `xattr -p com.apple.quarantine /Applications/Simpler.app` finds no attribute after the update.
6. Confirm the Workspace, active note and per-device preferences survived the swap.

If it fails, macOS falls back to manual `.dmg` installs: change ADR 0015 to record the finding, make the macOS install kind report the "link out to the Release page" branch, and open a separate ticket for self-update. Do not work around it inline.

## Acceptance criteria

- [ ] A real N → N+1 self-update has been performed on the Mac and the outcome recorded in the Comments below
- [ ] If it works: ADR 0015 is amended from hypothesis to verified, with what was observed
- [ ] If it fails: ADR 0015 records the failure, macOS drops to manual updates, and a follow-up ticket exists
- [ ] Either way, the Linux AppImage self-update path is confirmed still working on the same release (regression check)

## Blocked by

- 08, 09

## Comments

Not performed. This requires two real, tagged releases published through GitHub Actions (ticket 08's release job, itself not yet run for real — see its comments) and a running installed copy of the app self-updating between them, which means pushing tags and publishing releases. This agent treats pushing tags/releases as an action needing the user's explicit go-ahead rather than something to trigger unattended mid-implementation, and there are no signing secrets available in this environment to produce a real signed artifact locally as a substitute.

What this round *did* establish, from ticket 08's local build check: `npm run tauri build -- --bundles dmg,app` on this Mac genuinely produces `Simpler.app.tar.gz` (Tauri's bundler logs it as an `(updater)` artifact) alongside the `.dmg`, and attempted to auto-sign it (failing only because no private key was present locally) — so the artifact this whole hypothesis depends on does get built the way ADR 0015 assumes. That is evidence the pipeline produces the right *shape* of output, not evidence that an already-installed unsigned `.app` can be replaced in place and still launch without a Gatekeeper prompt — which remains exactly the hypothesis ADR 0015 states it is, unverified, until someone runs the real N → N+1 cycle by hand.
