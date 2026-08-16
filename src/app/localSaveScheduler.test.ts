import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalSaveScheduler } from "./localSaveScheduler";

describe("Local Save scheduler", () => {
  const debounceMs = 800;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces rapid keystrokes into a single write after a pause", () => {
    const write = vi.fn<(content: string) => void>();
    const scheduler = createLocalSaveScheduler({ debounceMs, write });

    scheduler.edit("h");
    vi.advanceTimersByTime(100);
    scheduler.edit("he");
    vi.advanceTimersByTime(100);
    scheduler.edit("hel");
    vi.advanceTimersByTime(100);
    scheduler.edit("hell");
    vi.advanceTimersByTime(100);
    scheduler.edit("hello");

    expect(write).not.toHaveBeenCalled();

    vi.advanceTimersByTime(debounceMs - 1);
    expect(write).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(write).toHaveBeenCalledExactlyOnceWith("hello");
  });

  it("flushes after a pause in typing, not before", () => {
    const write = vi.fn<(content: string) => void>();
    const scheduler = createLocalSaveScheduler({ debounceMs, write });

    scheduler.edit("draft");
    vi.advanceTimersByTime(debounceMs - 1);
    expect(write).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(write).toHaveBeenCalledExactlyOnceWith("draft");
  });

  it("flushes immediately on note switch, without waiting out the debounce window", () => {
    const write = vi.fn<(content: string) => void>();
    const scheduler = createLocalSaveScheduler({ debounceMs, write });

    scheduler.edit("switching away");
    scheduler.flush();

    expect(write).toHaveBeenCalledExactlyOnceWith("switching away");

    vi.advanceTimersByTime(debounceMs);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("flushes immediately on close", () => {
    const write = vi.fn<(content: string) => void>();
    const scheduler = createLocalSaveScheduler({ debounceMs, write });

    scheduler.edit("closing now");
    scheduler.flush();

    expect(write).toHaveBeenCalledExactlyOnceWith("closing now");
  });

  it("does nothing on flush when there is no pending edit", () => {
    const write = vi.fn<(content: string) => void>();
    const scheduler = createLocalSaveScheduler({ debounceMs, write });

    scheduler.flush();

    expect(write).not.toHaveBeenCalled();
  });

  it("reports whether there are pending changes", () => {
    const write = vi.fn<(content: string) => void>();
    const scheduler = createLocalSaveScheduler({ debounceMs, write });

    expect(scheduler.hasPendingChanges()).toBe(false);

    scheduler.edit("in progress");
    expect(scheduler.hasPendingChanges()).toBe(true);

    scheduler.flush();
    expect(scheduler.hasPendingChanges()).toBe(false);
  });

  it("flush resolves only once an async write settles", async () => {
    let resolveWrite!: () => void;
    const write = vi.fn(() => new Promise<void>((resolve) => (resolveWrite = resolve)));
    const scheduler = createLocalSaveScheduler({ debounceMs, write });

    scheduler.edit("in flight");
    let flushed = false;
    const flushPromise = scheduler.flush().then(() => {
      flushed = true;
    });

    await Promise.resolve();
    expect(flushed).toBe(false);

    resolveWrite();
    await flushPromise;
    expect(flushed).toBe(true);
  });

  it("dispose cancels a pending debounce without writing", () => {
    const write = vi.fn<(content: string) => void>();
    const scheduler = createLocalSaveScheduler({ debounceMs, write });

    scheduler.edit("unsaved");
    scheduler.dispose();
    vi.advanceTimersByTime(debounceMs);

    expect(write).not.toHaveBeenCalled();
  });
});
