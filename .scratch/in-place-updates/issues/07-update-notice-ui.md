Status: done

`updateScheduler` wired into `App.tsx` (mount-time effect: fetches install kind, creates the scheduler, calls `appOpened()`, and reflects scheduler state into `appState.updateNotice`). `ClassicShell.tsx` renders a non-blocking `role="status"` notice in the footer: "Downloading update…" while downloading, "Install & Restart" button once ready (AppImage), "View Release" link to the GitHub Release page for packaged (deb/rpm) installs, nothing for idle/checking/up-to-date. Added a `restart-to-apply-update` native action (calls `app.restart()`) for the button. Tests added in `ClassicShell.test.tsx` covering all four notice states.

# Update notice wired end-to-end in the UI

## Parent

.scratch/in-place-updates/spec.md

## What to build

Wire `updateScheduler` (issue 05) into `App.tsx`, connecting its `requestCheck`/`requestDownload`-style callbacks to the native command wrappers from issue 06 (`checkForUpdate`, `downloadAndInstallUpdate`, `getInstallKind`), the same way `automaticSyncScheduler` is wired to `gitSync` today.

Add a small notice to the existing UI shell (`ClassicShell.tsx`, placement near the existing sync status is a reasonable default) reflecting the scheduler's state:

- `update-available` / `downloading` (AppImage installs): non-blocking notice, no forced restart.
- `update-ready` (AppImage installs): notice with an "Install & Restart" action that triggers `downloadAndInstallUpdate`'s install/restart step.
- `update-available` (packaged `deb`/`rpm` installs, determined via `getInstallKind`): notice with a "View Release" link out to the GitHub Release page instead of an install action.
- `up-to-date`/`idle`: no notice shown.

The notice must never block the user from using the app — dismissing or ignoring it leaves the app fully usable, and the update installs whenever the user does eventually restart (for AppImage) or click through (for deb/rpm).

## Acceptance criteria

- [ ] On app open, `updateScheduler` triggers a check via the wired native command, throttled per issue 05's behavior.
- [ ] AppImage install, update available: notice appears, download proceeds in the background, and once ready shows "Install & Restart".
- [ ] Clicking "Install & Restart" triggers the install/restart flow.
- [ ] Packaged (deb/rpm) install, update available: notice appears with a link to the GitHub Release page, no install action offered.
- [ ] No update available: no notice shown, no interruption to normal app use.
- [ ] Ignoring/dismissing the notice doesn't block any other app functionality.
- [ ] Tests (Vitest/Testing Library) cover the notice rendering for each scheduler state and install kind, following existing `App.test.tsx`-style conventions.

## Blocked by

- 05-update-scheduler.md
- 06-native-update-commands.md
