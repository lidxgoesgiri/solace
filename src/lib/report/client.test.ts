import { afterEach, describe, expect, it, vi } from "vitest";

/** A page that has finished loading, with the idle callback the scheduler uses. */
function stubLoadedPage() {
  vi.stubGlobal("window", {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    requestIdleCallback: (callback: () => void) => setTimeout(callback, 0),
    cancelIdleCallback: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
  });
  vi.stubGlobal("document", { readyState: "complete" });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("PDF engine loading (PRD 14, PDF-01)", () => {
  it("waits until the page has settled, then loads before any download", async () => {
    stubLoadedPage();
    vi.useFakeTimers();
    const client = await import("./client");
    const onReady = vi.fn();
    client.scheduleReportRenderer(onReady);

    vi.advanceTimersByTime(client.RENDERER_DELAY_MS - 1);
    expect(client.isReportRendererRequested()).toBe(false);

    vi.advanceTimersByTime(1);
    // Then the browser's idle callback runs.
    vi.runOnlyPendingTimers();
    expect(client.isReportRendererRequested()).toBe(true);

    vi.useRealTimers();
    await vi.waitFor(() => expect(onReady).toHaveBeenCalledTimes(1), { timeout: 20_000 });
  }, 30_000);

  it("leaving the page before then loads nothing", async () => {
    stubLoadedPage();
    vi.useFakeTimers();
    const client = await import("./client");
    const onReady = vi.fn();
    const cancel = client.scheduleReportRenderer(onReady);
    cancel();
    vi.advanceTimersByTime(client.RENDERER_DELAY_MS * 3);
    expect(client.isReportRendererRequested()).toBe(false);
    expect(onReady).not.toHaveBeenCalled();
  });

  it("pointing at a download button loads it at once and makes the page ready", async () => {
    stubLoadedPage();
    const client = await import("./client");
    const onReady = vi.fn();
    client.scheduleReportRenderer(onReady);
    expect(client.isReportRendererRequested()).toBe(false);
    client.loadRendererOnIntent.onPointerEnter();
    expect(client.isReportRendererRequested()).toBe(true);
    await client.preloadReportRenderer();
    await vi.waitFor(() => expect(onReady).toHaveBeenCalled());
  }, 30_000);
});
