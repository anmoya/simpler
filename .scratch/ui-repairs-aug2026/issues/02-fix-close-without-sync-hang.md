Status: done

## What to build

Fix the confirmed root cause (from issue 01) preventing "Cerrar sin sync" from
closing the window on Linux/Wayland .deb builds. The fix must preserve the
existing behavior for the other two close paths, which already work correctly:
window-manager-initiated close (GTK `delete-event` handler in
`src-tauri/src/lib.rs`) and the normal in-app close-with-sync flow.

The exact change depends entirely on issue 01's findings — do not guess at a fix
before that diagnosis lands (e.g. it may turn out `currentWindow.close()` never
resolves under `decorations: false` in this Tauri version, requiring a direct
`destroy()` call instead of `close()`, or the `skipCloseRequestedSyncRef` guard
may be misfiring).

## Acceptance criteria

- [ ] Clicking "Cerrar sin sync" reliably closes the window on Ubuntu/Wayland
      within a couple seconds
- [ ] Alt+F4 / window-manager close still works as before (no regression)
- [ ] Normal close-with-pending-sync flow still works as before (no regression)
- [ ] Existing `App.test.tsx` close-flow tests still pass; new test added for the
      failure mode found in issue 01 if feasible without a real Tauri window

## Blocked by

- `.scratch/ui-repairs-aug2026/issues/01-diagnose-close-without-sync-hang.md`
