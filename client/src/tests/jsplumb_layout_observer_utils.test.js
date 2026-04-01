import { afterEach, expect, test, vi } from "vitest";
import { createJsPlumbElementLayoutObserver } from "@/services/workspace/core/jsPlumbLayoutObserverUtils";

const originalResizeObserver = globalThis.ResizeObserver;

afterEach(() => {
  vi.useRealTimers();
  if (originalResizeObserver === undefined) {
    delete globalThis.ResizeObserver;
    return;
  }
  globalThis.ResizeObserver = originalResizeObserver;
});

test("observes elements and revalidates them in a single flush", () => {
  vi.useFakeTimers();

  const observe = vi.fn();
  const resizeObserverInstances = [];
  globalThis.ResizeObserver = class ResizeObserverMock {
    constructor(callback) {
      this.callback = callback;
      this.observe = observe;
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
      resizeObserverInstances.push(this);
    }
  };

  const instance = {
    revalidate: vi.fn(),
    repaintEverything: vi.fn(),
  };
  const observer = createJsPlumbElementLayoutObserver({
    getInstance: () => instance,
  });
  const element = { isConnected: true };

  observer.observe(element);
  expect(observe).toHaveBeenCalledWith(element);

  vi.runAllTimers();

  expect(instance.revalidate).toHaveBeenCalledTimes(1);
  expect(instance.revalidate).toHaveBeenCalledWith(element);
  expect(instance.repaintEverything).toHaveBeenCalledTimes(1);
  expect(resizeObserverInstances).toHaveLength(1);
});

test("batches resize callbacks and ignores disconnected elements", () => {
  vi.useFakeTimers();

  let resizeCallback = null;
  globalThis.ResizeObserver = class ResizeObserverMock {
    constructor(callback) {
      resizeCallback = callback;
      this.observe = vi.fn();
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
    }
  };

  const instance = {
    revalidate: vi.fn(),
    repaintEverything: vi.fn(),
  };
  const observer = createJsPlumbElementLayoutObserver({
    getInstance: () => instance,
  });
  const connectedElement = { isConnected: true };
  const disconnectedElement = { isConnected: false };

  observer.observe(connectedElement);
  observer.observe(disconnectedElement);
  vi.runAllTimers();

  instance.revalidate.mockClear();
  instance.repaintEverything.mockClear();

  resizeCallback([
    { target: connectedElement },
    { target: connectedElement },
    { target: disconnectedElement },
  ]);
  vi.runAllTimers();

  expect(instance.revalidate).toHaveBeenCalledTimes(1);
  expect(instance.revalidate).toHaveBeenCalledWith(connectedElement);
  expect(instance.repaintEverything).toHaveBeenCalledTimes(1);
});
