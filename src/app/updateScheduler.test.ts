import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUpdateScheduler } from "./updateScheduler";

describe("update scheduler", () => {
  const checkDelayMs = 5_000;
  const throttleMs = 60_000;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("checks for an update shortly after the app opens", () => {
    const requestCheck = vi.fn();
    const scheduler = createUpdateScheduler({
      installKind: "appimage",
      checkDelayMs,
      throttleMs,
      requestCheck,
      requestDownload: vi.fn(),
    });

    scheduler.appOpened();
    expect(requestCheck).not.toHaveBeenCalled();
    expect(scheduler.getState()).toBe("idle");

    vi.advanceTimersByTime(checkDelayMs);

    expect(requestCheck).toHaveBeenCalledTimes(1);
    expect(scheduler.getState()).toBe("checking");
  });

  it("throttles repeat checks within the throttle window", () => {
    const requestCheck = vi.fn();
    const scheduler = createUpdateScheduler({
      installKind: "appimage",
      checkDelayMs,
      throttleMs,
      requestCheck,
      requestDownload: vi.fn(),
    });

    scheduler.appOpened();
    vi.advanceTimersByTime(checkDelayMs);
    scheduler.checkSucceeded({ updateAvailable: false });

    scheduler.appOpened();
    vi.advanceTimersByTime(checkDelayMs);

    expect(requestCheck).toHaveBeenCalledTimes(1);
  });

  it("allows a check again once the throttle window has elapsed", () => {
    const requestCheck = vi.fn();
    const scheduler = createUpdateScheduler({
      installKind: "appimage",
      checkDelayMs,
      throttleMs,
      requestCheck,
      requestDownload: vi.fn(),
    });

    scheduler.appOpened();
    vi.advanceTimersByTime(checkDelayMs);
    scheduler.checkSucceeded({ updateAvailable: false });

    vi.advanceTimersByTime(throttleMs);
    scheduler.appOpened();
    vi.advanceTimersByTime(checkDelayMs);

    expect(requestCheck).toHaveBeenCalledTimes(2);
  });

  it("stays idle (no visible notice) when already up to date", () => {
    const requestCheck = vi.fn();
    const scheduler = createUpdateScheduler({
      installKind: "appimage",
      checkDelayMs,
      throttleMs,
      requestCheck,
      requestDownload: vi.fn(),
    });

    scheduler.appOpened();
    vi.advanceTimersByTime(checkDelayMs);
    scheduler.checkSucceeded({ updateAvailable: false });

    expect(scheduler.getState()).toBe("up-to-date");
  });

  it("on AppImage installs, automatically downloads in the background when an update is found", () => {
    const requestDownload = vi.fn();
    const scheduler = createUpdateScheduler({
      installKind: "appimage",
      checkDelayMs,
      throttleMs,
      requestCheck: vi.fn(),
      requestDownload,
    });

    scheduler.appOpened();
    vi.advanceTimersByTime(checkDelayMs);
    scheduler.checkSucceeded({ updateAvailable: true, version: "1.2.0" });

    expect(scheduler.getState()).toBe("downloading");
    expect(requestDownload).toHaveBeenCalledTimes(1);

    scheduler.downloadSucceeded();

    expect(scheduler.getState()).toBe("update-ready");
  });

  it("on packaged (deb/rpm) installs, shows the notice without downloading", () => {
    const requestDownload = vi.fn();
    const scheduler = createUpdateScheduler({
      installKind: "packaged",
      checkDelayMs,
      throttleMs,
      requestCheck: vi.fn(),
      requestDownload,
    });

    scheduler.appOpened();
    vi.advanceTimersByTime(checkDelayMs);
    scheduler.checkSucceeded({ updateAvailable: true, version: "1.2.0" });

    expect(scheduler.getState()).toBe("update-available");
    expect(scheduler.canInstallDirectly()).toBe(false);
    expect(requestDownload).not.toHaveBeenCalled();
  });

  it("reports install-kind-aware guidance for appimage installs", () => {
    const scheduler = createUpdateScheduler({
      installKind: "appimage",
      checkDelayMs,
      throttleMs,
      requestCheck: vi.fn(),
      requestDownload: vi.fn(),
    });

    expect(scheduler.canInstallDirectly()).toBe(true);
  });

  it("a failed check silently returns to idle and produces no visible notice", () => {
    const scheduler = createUpdateScheduler({
      installKind: "appimage",
      checkDelayMs,
      throttleMs,
      requestCheck: vi.fn(),
      requestDownload: vi.fn(),
    });

    scheduler.appOpened();
    vi.advanceTimersByTime(checkDelayMs);
    scheduler.checkFailed();

    expect(scheduler.getState()).toBe("idle");
  });

  it("a failed download keeps the app usable and reports update-available for retry", () => {
    const scheduler = createUpdateScheduler({
      installKind: "appimage",
      checkDelayMs,
      throttleMs,
      requestCheck: vi.fn(),
      requestDownload: vi.fn(),
    });

    scheduler.appOpened();
    vi.advanceTimersByTime(checkDelayMs);
    scheduler.checkSucceeded({ updateAvailable: true, version: "1.2.0" });
    scheduler.downloadFailed();

    expect(scheduler.getState()).toBe("update-available");
  });

  it("dispose cancels a pending scheduled check", () => {
    const requestCheck = vi.fn();
    const scheduler = createUpdateScheduler({
      installKind: "appimage",
      checkDelayMs,
      throttleMs,
      requestCheck,
      requestDownload: vi.fn(),
    });

    scheduler.appOpened();
    scheduler.dispose();
    vi.advanceTimersByTime(checkDelayMs);

    expect(requestCheck).not.toHaveBeenCalled();
  });
});
