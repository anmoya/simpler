export interface LocalSaveSchedulerOptions {
  debounceMs?: number;
  write: (content: string) => void | Promise<void>;
  setTimeout?: typeof window.setTimeout;
  clearTimeout?: typeof window.clearTimeout;
}

export interface LocalSaveScheduler {
  /** Records a content change and schedules a debounced write. */
  edit(content: string): void;
  /**
   * Immediately writes any pending edit, bypassing the debounce window.
   * Resolves once that write settles (or immediately if nothing was pending),
   * so callers that need the write to be visible before proceeding — e.g.
   * checking for pending changes before closing — can await it.
   */
  flush(): Promise<void>;
  dispose(): void;
  hasPendingChanges(): boolean;
}

const defaultDebounceMs = 800;
type TimerId = number;

export function createLocalSaveScheduler({
  debounceMs = defaultDebounceMs,
  write,
  setTimeout: scheduleTimeout = window.setTimeout.bind(window),
  clearTimeout: cancelTimeout = window.clearTimeout.bind(window),
}: LocalSaveSchedulerOptions): LocalSaveScheduler {
  let debounceTimer: TimerId | null = null;
  let pendingContent: string | null = null;

  const clearDebounce = () => {
    if (debounceTimer !== null) {
      cancelTimeout(debounceTimer);
      debounceTimer = null;
    }
  };

  const flush = () => {
    clearDebounce();
    if (pendingContent === null) {
      return Promise.resolve();
    }
    const content = pendingContent;
    pendingContent = null;
    return Promise.resolve(write(content));
  };

  return {
    edit(content) {
      pendingContent = content;
      clearDebounce();
      debounceTimer = scheduleTimeout(() => {
        debounceTimer = null;
        void flush();
      }, debounceMs);
    },

    flush,

    dispose() {
      clearDebounce();
    },

    hasPendingChanges() {
      return pendingContent !== null;
    },
  };
}
