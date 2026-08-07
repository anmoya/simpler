import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAutomaticSyncScheduler, type AutomaticSyncTrigger } from "./automaticSyncScheduler";

describe("automatic Sync scheduler", () => {
  const debounceMs = 30_000;
  const periodicMs = 120_000;
  const retryMs = 45_000;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("groups Local Save changes behind an inactivity debounce", () => {
    const requestSync = vi.fn<(trigger: AutomaticSyncTrigger) => void>();
    const markPending = vi.fn();
    const scheduler = createAutomaticSyncScheduler({ debounceMs, periodicMs, retryMs, requestSync, markPending });

    scheduler.localSave();
    vi.advanceTimersByTime(20_000);
    scheduler.localSave();
    vi.advanceTimersByTime(29_999);

    expect(markPending).toHaveBeenCalledTimes(2);
    expect(requestSync).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(requestSync).toHaveBeenCalledExactlyOnceWith("debounce");
  });

  it("runs periodically during continued writing even when the debounce keeps moving", () => {
    const requestSync = vi.fn<(trigger: AutomaticSyncTrigger) => void>();
    const scheduler = createAutomaticSyncScheduler({ debounceMs, periodicMs, retryMs, requestSync });

    scheduler.localSave();
    for (let elapsed = 0; elapsed < periodicMs; elapsed += 20_000) {
      vi.advanceTimersByTime(20_000);
      scheduler.localSave();
    }

    expect(requestSync).toHaveBeenCalledExactlyOnceWith("periodic");
  });

  it("requests Sync on Workspace open when local changes are protected", () => {
    const requestSync = vi.fn<(trigger: AutomaticSyncTrigger) => void>();
    const scheduler = createAutomaticSyncScheduler({ debounceMs, periodicMs, retryMs, requestSync });

    scheduler.workspaceOpened(false);
    scheduler.workspaceOpened(true);

    expect(requestSync).toHaveBeenCalledExactlyOnceWith("open");
  });

  it("retries after a failed Sync and keeps close available for pending work", () => {
    const requestSync = vi.fn<(trigger: AutomaticSyncTrigger) => void>();
    const scheduler = createAutomaticSyncScheduler({ debounceMs, periodicMs, retryMs, requestSync });

    scheduler.localSave();
    scheduler.syncFailed();
    vi.advanceTimersByTime(retryMs - 1);
    expect(requestSync).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    scheduler.appClosing();

    expect(requestSync).toHaveBeenNthCalledWith(1, "retry");
    expect(requestSync).toHaveBeenNthCalledWith(2, "close");
  });

  it("keeps changes saved during an in-flight Sync scheduled after that Sync succeeds", () => {
    const requestSync = vi.fn<(trigger: AutomaticSyncTrigger) => void>();
    const scheduler = createAutomaticSyncScheduler({ debounceMs, periodicMs, retryMs, requestSync });

    scheduler.localSave();
    vi.advanceTimersByTime(debounceMs);
    scheduler.localSave();
    scheduler.syncSucceeded();
    vi.advanceTimersByTime(debounceMs);

    expect(requestSync).toHaveBeenNthCalledWith(1, "debounce");
    expect(requestSync).toHaveBeenNthCalledWith(2, "debounce");
  });

  it("pauses automatic and manual Sync requests until a conflict is resolved", () => {
    const requestSync = vi.fn<(trigger: AutomaticSyncTrigger) => void>();
    const scheduler = createAutomaticSyncScheduler({ debounceMs, periodicMs, retryMs, requestSync });

    scheduler.localSave();
    scheduler.syncConflicted();
    vi.advanceTimersByTime(periodicMs);
    scheduler.manualSync();

    expect(requestSync).not.toHaveBeenCalled();

    scheduler.syncSucceeded();
    scheduler.manualSync();

    expect(requestSync).toHaveBeenCalledExactlyOnceWith("manual");
  });

  it("prepareManualSync clears pending timers without dispatching requestSync, and refuses while paused for a conflict", () => {
    const requestSync = vi.fn<(trigger: AutomaticSyncTrigger) => void>();
    const scheduler = createAutomaticSyncScheduler({ debounceMs, periodicMs, retryMs, requestSync });

    scheduler.localSave();
    expect(scheduler.prepareManualSync()).toBe(true);
    vi.advanceTimersByTime(debounceMs);
    expect(requestSync).not.toHaveBeenCalled();

    scheduler.syncConflicted();
    expect(scheduler.prepareManualSync()).toBe(false);
  });
});
