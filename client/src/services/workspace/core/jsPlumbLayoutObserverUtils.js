export function createJsPlumbElementLayoutObserver({ getInstance } = {}) {
  const observedElements = new Set();
  const pendingElements = new Set();
  let resizeObserver = null;
  let flushTimer = null;

  function flushPendingElements() {
    flushTimer = null;

    if (pendingElements.size === 0) {
      return;
    }

    const instance = getInstance?.();
    const elements = Array.from(pendingElements);
    pendingElements.clear();

    if (!instance) {
      return;
    }

    elements.forEach((element) => {
      if (!element?.isConnected) {
        return;
      }
      instance.revalidate?.(element);
    });

    instance.repaintEverything?.();
  }

  function schedule(element) {
    if (!element) {
      return;
    }

    pendingElements.add(element);
    if (flushTimer !== null) {
      return;
    }

    flushTimer = setTimeout(flushPendingElements, 0);
  }

  function ensureResizeObserver() {
    if (resizeObserver || typeof ResizeObserver !== "function") {
      return;
    }

    resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => schedule(entry.target));
    });
  }

  function observe(element) {
    if (!element || observedElements.has(element)) {
      return;
    }

    observedElements.add(element);
    ensureResizeObserver();
    resizeObserver?.observe(element);
    schedule(element);
  }

  function unobserve(element) {
    if (!element || !observedElements.has(element)) {
      return;
    }

    observedElements.delete(element);
    pendingElements.delete(element);
    resizeObserver?.unobserve(element);
  }

  function disconnect() {
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }

    pendingElements.clear();
    observedElements.clear();
    resizeObserver?.disconnect();
    resizeObserver = null;
  }

  return {
    observe,
    unobserve,
    schedule,
    disconnect,
  };
}
