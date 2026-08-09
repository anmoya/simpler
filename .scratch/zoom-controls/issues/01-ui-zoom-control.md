# UI zoom control

Status: done

## Parent

`.scratch/zoom-controls/spec.md`

## What to build

Add a whole-app-shell zoom level, independent of the editor font size (issue 02). Scale via a CSS custom property on the root (e.g. `--ui-zoom`, applied as a `transform: scale()` or a `font-size`/`rem`-based multiplier on `.app-shell` — pick whichever doesn't break the existing responsive layout at the 720px breakpoint in `styles.css`) rather than editing every fixed pixel value.

- Discrete steps, e.g. 80%/90%/100%/110%/120%, default 100%.
- Persist per device in `localStorage`, following the exact pattern of `themeModeStorageKey`/`readThemeMode`/`saveThemeMode` in `src/app/App.tsx` (new key, e.g. `simpler.uiZoom`).
- Keyboard shortcuts: Ctrl/Cmd+`=`/`+` (increase), Ctrl/Cmd+`-` (decrease), Ctrl/Cmd+`0` (reset to 100%) — add to the existing `handleKeyDown` in `ClassicShell.tsx` following the pattern of the other modifier-key branches there.
- Add corresponding entries to the `commands` array (`ShellCommand` shape) so they also show up in the Command Palette and Command Help, same as `theme`/`sync-workspace`/etc.

## Acceptance criteria

- [ ] Ctrl/Cmd+`+` increases UI zoom one step, up to a sane max (e.g. 150%)
- [ ] Ctrl/Cmd+`-` decreases UI zoom one step, down to a sane min (e.g. 70%)
- [ ] Ctrl/Cmd+`0` resets UI zoom to 100%
- [ ] Zoom level persists across app restarts (localStorage) and is per-device (not written to `.simpler/workspace.json`)
- [ ] The three zoom actions appear in the Command Palette and Command Help with their shortcuts
- [ ] At non-100% zoom, the existing 720px responsive breakpoint and sidebar layout still don't visually break (manual check acceptable, no new automated visual test required)
- [ ] An App/component test exercises: pressing the shortcuts changes zoom state, and it round-trips through the storage layer
- [ ] `npm run test` passes

## Blocked by

- None — can start immediately.
