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
  syncSucceeded(): void;
  syncFailed(): void;
  syncConflicted(): void;
  appClosing(): void;
  dispose(): void;
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
  };
}
