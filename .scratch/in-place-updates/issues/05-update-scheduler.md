Status: done

# updateScheduler state machine + tests

## Parent

.scratch/in-place-updates/spec.md

## What to build

Add `src/app/updateScheduler.ts`, a pure state machine structurally parallel to `src/app/automaticSyncScheduler.ts` — no React, no direct native calls, driven by explicit inputs and exposing callbacks the caller wires up (like `requestSync`/`markPending` in the sync scheduler).

Responsibilities:
- Decide when to fire an update check: shortly after app start (an `appOpened()`-style entry point), throttled so repeat checks within a short window (configurable, mirroring `debounceMs`/`periodicMs`-style options in the sync scheduler) are skipped.
- Track states: `idle` → `checking` → `up-to-date` | `update-available` → (when install kind allows) `downloading` → `update-ready`.
- Expose the current state to the caller, plus whatever install-kind-aware flag is needed so the UI (issue 07) knows whether to offer one-click install vs a link-out.
- Expose methods analogous to the sync scheduler's `syncSucceeded()`/`syncFailed()` for reporting the outcome of the (externally-performed) check/download calls back into the state machine.

This issue does NOT wire the scheduler into `App.tsx` or build any UI — that's issue 07. It also does not implement the actual native check/download calls — those are issue 06. This issue is the state machine alone, exercised via injected fake callbacks/timers in tests.

## Acceptance criteria

- [ ] `src/app/updateScheduler.ts` exports a factory (e.g. `createUpdateScheduler`) matching the shape described above, with injectable `setTimeout`/`clearTimeout` and check/download callbacks (mirroring how `automaticSyncScheduler` takes `requestSync`, `setTimeout`, `clearTimeout` as options).
- [ ] State transitions match the sequence: idle → checking → up-to-date, and idle → checking → update-available → downloading → update-ready.
- [ ] Throttling: calling the "app opened" entry point twice within the throttle window only triggers one real check.
- [ ] Unit tests (Vitest, colocated `updateScheduler.test.ts`) cover each transition and the throttling behavior, using fake timers and fake callbacks — no real native/network calls, following the same testing approach as `automaticSyncScheduler`'s existing tests.

## Blocked by

None - can start immediately
