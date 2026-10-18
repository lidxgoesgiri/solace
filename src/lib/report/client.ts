/**
 * Browser-side helpers for the PDF report. The renderer (pdf-lib, fontkit,
 * and the bundled fonts: about 600 KB compressed, mostly pdf-lib and
 * fontkit code) is loaded on demand instead of with the page.
 *
 * Pages that can download a PDF call `scheduleReportRenderer`: the module
 * loads a few seconds after the page has settled, when the browser is idle,
 * so it never competes with the user's first taps and keystrokes. Pointing
 * at or focusing a download button loads it at once. The download buttons
 * stay disabled until it has arrived, so building a PDF never makes a
 * network request (PDF-01).
 */

import type {
  RenderedReport,
  ReportLabels,
  SafetyPlanLabels,
  SafetyPlanPdfInput,
} from "./pdf";
import type { ReportModel } from "./model";

let renderer: Promise<typeof import("./pdf")> | null = null;
/** Pages waiting for the renderer, told as soon as any load settles. */
const waiting = new Set<() => void>();

/** Starts loading the renderer now (or returns the load in progress). */
export function preloadReportRenderer(): Promise<typeof import("./pdf")> {
  if (!renderer) {
    const load = import("./pdf").catch((error: unknown) => {
      // Offline or a failed fetch: allow a new attempt later.
      renderer = null;
      throw error;
    });
    renderer = load;
    const settle = () => {
      for (const notify of [...waiting]) notify();
    };
    load.then(settle, settle);
  }
  return renderer;
}

/** Whether loading has started (for tests). */
export function isReportRendererRequested(): boolean {
  return renderer !== null;
}

/** How long after the page has loaded the renderer may start loading. */
export const RENDERER_DELAY_MS = 3000;
const IDLE_TIMEOUT_MS = 2000;

/**
 * Loads the renderer once the page has settled and calls `onReady` when it
 * is usable (also after a failed load, so a button never stays stuck; the
 * download then retries). Returns a cleanup function.
 */
export function scheduleReportRenderer(onReady: () => void): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let idle: number | undefined;
  let done = false;
  const ready = () => {
    if (cancelled || done) return;
    done = true;
    waiting.delete(ready);
    onReady();
  };
  // A load started by pointing at a button also makes the page ready.
  waiting.add(ready);
  const start = () => {
    if (cancelled) return;
    clear();
    preloadReportRenderer().then(ready, ready);
  };
  const clear = () => {
    if (timer !== undefined) clearTimeout(timer);
    if (idle !== undefined && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
    window.removeEventListener("load", afterLoad);
  };
  const afterLoad = () => {
    timer = setTimeout(() => {
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(start, { timeout: IDLE_TIMEOUT_MS });
      } else {
        start();
      }
    }, RENDERER_DELAY_MS);
  };

  if (renderer) {
    renderer.then(ready, ready);
  } else if (document.readyState === "complete") {
    afterLoad();
  } else {
    window.addEventListener("load", afterLoad, { once: true });
  }
  return () => {
    cancelled = true;
    waiting.delete(ready);
    clear();
  };
}

/** Props for a download button: hovering or focusing it loads the renderer at once. */
export const loadRendererOnIntent = {
  onPointerEnter: () => void preloadReportRenderer().catch(() => {}),
  onFocus: () => void preloadReportRenderer().catch(() => {}),
  onTouchStart: () => void preloadReportRenderer().catch(() => {}),
};

export async function renderReport(model: ReportModel, labels: ReportLabels): Promise<RenderedReport> {
  const { renderReportPdf } = await preloadReportRenderer();
  return renderReportPdf(model, labels);
}

export async function renderSafetyPlan(
  input: SafetyPlanPdfInput,
  labels: SafetyPlanLabels,
): Promise<RenderedReport> {
  const { renderSafetyPlanPdf } = await preloadReportRenderer();
  return renderSafetyPlanPdf(input, labels);
}

/** Saves bytes as a file without any network request (PDF-01). */
export function saveFile(bytes: Uint8Array, fileName: string, type = "application/pdf") {
  // Copy into a plain ArrayBuffer-backed view, as Blob expects.
  const blob = new Blob([new Uint8Array(bytes)], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
