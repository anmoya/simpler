export type AutomaticSyncTrigger = "open" | "debounce" | "periodic" | "manual" | "close" | "retry";

export interface AutomaticSyncSchedulerOptions {
  debounceMs?: number;
  periodicMs?: number;
  retryMs?: number;
  requestSync: (trigger: AutomaticSyncTrigger) => void;
  markPending?: () => void;
  setTimeout?: typeof window.setTimeout;
  clearTimeout?: typeof window.clearTimeout;
}

export interface AutomaticSyncScheduler {
  workspaceOpened(hasProtectedChanges: boolean): void;
  localSave(): void;
  manualSync(): void;
  /**
   * Clears pending debounce/periodic/retry timers and marks a manual Sync
   * in flight, without dispatching through `requestSync` — for callers that
   * need to await the Sync result directly instead of firing-and-forgetting
   * through the scheduler. Returns false (and does nothing) if paused for
   * an unresolved conflict, matching manualSync()'s pause behavior.
   */
  prepareManualSync(): boolean;
  syncSucceeded(): void;
  syncFailed(): void;
  syncConflicted(): void;
  appClosing(): void;
  dispose(): void;
  /** Whether there are changes that haven't made it through a successful Sync yet. */
  hasPendingChanges(): boolean;
  /** Whether automatic Sync is paused because of an unresolved conflict. */
  isPausedForConflict(): boolean;
}

const defaultDebounceMs = 45_000;
const defaultPeriodicMs = 5 * 60_000;
const defaultRetryMs = 60_000;
type TimerId = number;

export function createAutomaticSyncScheduler({
  debounceMs = defaultDebounceMs,
  periodicMs = defaultPeriodicMs,
  retryMs = defaultRetryMs,
  requestSync,
  markPending = () => undefined,
  setTimeout: scheduleTimeout = window.setTimeout.bind(window),
  clearTimeout: cancelTimeout = window.clearTimeout.bind(window),
}: AutomaticSyncSchedulerOptions): AutomaticSyncScheduler {
  let hasPendingChanges = false;
  let debounceTimer: TimerId | null = null;
  let periodicTimer: TimerId | null = null;
  let retryTimer: TimerId | null = null;
  let changeVersion = 0;
  let inFlightChangeVersion = 0;
  let isPausedForConflict = false;

  const clearTimer = (timer: TimerId | null) => {
    if (timer !== null) {
      cancelTimeout(timer);
    }
  };

  const clearDebounce = () => {
    clearTimer(debounceTimer);
    debounceTimer = null;
  };

  const clearPeriodic = () => {
    clearTimer(periodicTimer);
    periodicTimer = null;
  };

  const clearRetry = () => {
    clearTimer(retryTimer);
    retryTimer = null;
  };

  const scheduleDebounce = () => {
    clearDebounce();
    debounceTimer = scheduleTimeout(() => {
      debounceTimer = null;
      clearPeriodic();
      requestScheduledSync("debounce");
    }, debounceMs);
  };

  const schedulePeriodic = () => {
    if (periodicTimer !== null) {
      return;
    }

    periodicTimer = scheduleTimeout(() => {
      periodicTimer = null;
      clearDebounce();
      inFlightChangeVersion = changeVersion;
      requestSync("periodic");
    }, periodicMs);
  };

  const requestScheduledSync = (trigger: AutomaticSyncTrigger) => {
    if (isPausedForConflict) {
      return;
    }
    inFlightChangeVersion = changeVersion;
    requestSync(trigger);
  };

  return {
    workspaceOpened(hasProtectedChanges) {
      clearRetry();
      if (hasProtectedChanges) {
        requestScheduledSync("open");
      }
    },

    localSave() {
      hasPendingChanges = true;
      changeVersion += 1;
      clearRetry();
      markPending();
      if (!isPausedForConflict) {
        scheduleDebounce();
        schedulePeriodic();
      }
    },

    manualSync() {
      clearDebounce();
      clearPeriodic();
      clearRetry();
      requestScheduledSync("manual");
    },

    prepareManualSync() {
      if (isPausedForConflict) {
        return false;
      }
      clearDebounce();
      clearPeriodic();
      clearRetry();
      inFlightChangeVersion = changeVersion;
      return true;
    },

    syncSucceeded() {
      isPausedForConflict = false;
      if (inFlightChangeVersion !== changeVersion) {
        hasPendingChanges = true;
        return;
      }

      hasPendingChanges = false;
      clearDebounce();
      clearPeriodic();
      clearRetry();
    },

    syncFailed() {
      hasPendingChanges = true;
      clearDebounce();
      clearPeriodic();
      clearRetry();
      retryTimer = scheduleTimeout(() => {
        retryTimer = null;
        requestScheduledSync("retry");
      }, retryMs);
    },

    syncConflicted() {
      isPausedForConflict = true;
      hasPendingChanges = true;
      clearDebounce();
      clearPeriodic();
      clearRetry();
    },

    appClosing() {
      clearDebounce();
      clearPeriodic();
      clearRetry();
      if (hasPendingChanges) {
        requestScheduledSync("close");
      }
    },

    dispose() {
      clearDebounce();
      clearPeriodic();
      clearRetry();
    },

    hasPendingChanges() {
      return hasPendingChanges;
    },

    isPausedForConflict() {
      return isPausedForConflict;
    },
  };
}
