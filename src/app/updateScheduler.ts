export type UpdateInstallKind = "appimage" | "packaged";

export type UpdateState = "idle" | "checking" | "up-to-date" | "update-available" | "downloading" | "update-ready";

export interface UpdateCheckResult {
  updateAvailable: boolean;
  version?: string;
  notes?: string;
}

export interface UpdateSchedulerOptions {
  installKind: UpdateInstallKind;
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
  installKind,
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
      if (installKind === "appimage") {
        // Skips the update-available state: AppImage installs download
        // automatically in the background per the spec, so there's nothing
        // for the notice to show until downloading/update-ready.
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
      return installKind === "appimage";
    },

    dispose() {
      clearCheckTimer();
    },
  };
}
