/**
 * Browser-side helpers for the PDF report. The renderer (pdf-lib, fontkit,
 * and the bundled fonts, about 590 KB) is loaded on demand instead of with
 * the page, so /laporan and /riwayat stay light. Call `preloadReportRenderer`
 * when a page that can download a report opens: the module then arrives
 * before the user asks for a PDF, so building the PDF itself makes no
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

export function preloadReportRenderer(): Promise<typeof import("./pdf")> {
  renderer ??= import("./pdf");
  return renderer;
}

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
