export type UpdateState = "idle" | "checking" | "up-to-date" | "update-available" | "downloading" | "update-ready";

export interface UpdateCheckResult {
  updateAvailable: boolean;
  version?: string;
  notes?: string;
}

export interface UpdateSchedulerOptions {
  // Named for the capability (can this install replace itself in place?)
  // rather than the format (AppImage vs. deb/rpm vs. macOS .app), since a
  // macOS .app can self-update too (ADR 0015) — the scheduler only ever
  // needed to know which behavior to run, never the format that implies it.
  // The format itself is still reported over the native command bus as
  // `InstallKind` (src/native/commands.ts) for anything that wants it.
  canSelfUpdate: boolean;
  /** Delay after appOpened() before the first check fires. */
  checkDelayMs?: number;
  /** Minimum time between the start of one check and the next being allowed. */
  throttleMs?: number;
  requestCheck: () => void;
  requestDownload: () => void;
  setTimeout?: typeof window.setTimeout;
  clearTimeout?: typeof window.clearTimeout;
  now?: () => number;
}

export interface UpdateScheduler {
  appOpened(): void;
  checkSucceeded(result: UpdateCheckResult): void;
  checkFailed(): void;
  downloadSucceeded(): void;
  downloadFailed(): void;
  getState(): UpdateState;
  getAvailableVersion(): string | undefined;
  /** Whether the current install kind can install the update directly (AppImage) vs. only linking out (deb/rpm). */
  canInstallDirectly(): boolean;
  dispose(): void;
}

const defaultCheckDelayMs = 10_000;
const defaultThrottleMs = 6 * 60 * 60_000;
type TimerId = number;

export function createUpdateScheduler({
  canSelfUpdate,
  checkDelayMs = defaultCheckDelayMs,
  throttleMs = defaultThrottleMs,
  requestCheck,
  requestDownload,
  setTimeout: scheduleTimeout = window.setTimeout.bind(window),
  clearTimeout: cancelTimeout = window.clearTimeout.bind(window),
  now = () => Date.now(),
}: UpdateSchedulerOptions): UpdateScheduler {
  let state: UpdateState = "idle";
  let availableVersion: string | undefined;
  let checkTimer: TimerId | null = null;
  let lastCheckStartedAt: number | null = null;

  const clearCheckTimer = () => {
    if (checkTimer !== null) {
      cancelTimeout(checkTimer);
      checkTimer = null;
    }
  };

  return {
    appOpened() {
      if (checkTimer !== null) {
        return;
      }
      if (lastCheckStartedAt !== null && now() - lastCheckStartedAt < throttleMs) {
        return;
      }
      checkTimer = scheduleTimeout(() => {
        checkTimer = null;
        lastCheckStartedAt = now();
        state = "checking";
        requestCheck();
      }, checkDelayMs);
    },

    checkSucceeded(result) {
      if (!result.updateAvailable) {
        state = "up-to-date";
        availableVersion = undefined;
        return;
      }

      availableVersion = result.version;
      if (canSelfUpdate) {
        // Skips the update-available state: self-updating installs (AppImage,
        // macOS .app) download automatically in the background per the spec,
        // so there's nothing for the notice to show until downloading/update-ready.
        state = "downloading";
        requestDownload();
      } else {
        state = "update-available";
      }
    },

    checkFailed() {
      state = "idle";
    },

    downloadSucceeded() {
      state = "update-ready";
    },

    downloadFailed() {
      state = "update-available";
    },

    getState() {
      return state;
    },

    getAvailableVersion() {
      return availableVersion;
    },

    canInstallDirectly() {
      return canSelfUpdate;
    },

    dispose() {
      clearCheckTimer();
    },
  };
}
