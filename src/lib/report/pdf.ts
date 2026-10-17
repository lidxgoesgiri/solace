/**
 * Renders the report for a psychologist as a PDF, entirely in the browser
 * (PRD 12). Fonts and logo come from ./assets, so nothing is fetched (PDF-01).
 * Categories are written as words, so the report prints well in black and
 * white.
 */

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import type { Locale, ServiceType } from "@/lib/content";
import type { Severity, Subscale } from "@/lib/scoring";
import { INTER_REGULAR, INTER_SEMIBOLD, LOGO_PNG, LORA_SEMIBOLD } from "./assets";
import type { ReportModel } from "./model";

/** Every string the PDF needs, already translated by the caller. */
export interface ReportLabels {
  docTitle: string;
  screenedAt: string;
  notRecorded: string;
  instrumentLanguage: string;
  reportCode: string;
  reportCodeNote: string;
  nickname: string;
  summaryTitle: string;
  colDimension: string;
  colRaw: string;
  colScore: string;
  colCategory: string;
  safetyTitle: string;
  safetyAnswer: string;
  crisisShown: string;
  yes: string;
  no: string;
  safetyNote: string;
  disclaimerTitle: string;
  disclaimer: string;
  itemsTitle: string;
  colNumber: string;
  colStatement: string;
  colAnswer: string;
  englishItemsNote: string;
  answerScale: string;
  aboutTitle: string;
  aboutInstrument: string;
  aboutLanguageSource: string;
  officialForm: string;
  aboutPeriod: string;
  periodValue: string;
  aboutScoring: string;
  scoringValue: string;
  cutoffTitle: string;
  colCategoryCutoff: string;
  directoryTitle: string;
  directoryCountry: string;
  emergency: string;
  support: string;
  call: (label: string) => string;
  source: string;
  verifiedAt: (date: string) => string;
  notVerified: string;
  footer: string;
  page: (page: number, total: number) => string;
  severity: Record<Severity, string>;
  subscale: Record<Subscale, string>;
  serviceType: Record<ServiceType, string>;
  languageName: Record<Locale, string>;
  formatDateTime: (iso: string) => string;
  formatDate: (iso: string) => string;
}

export interface RenderedReport {
  bytes: Uint8Array;
  /** Text drawn on each page, in drawing order (used to verify K7 and K8). */
  pages: string[][];
}

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const FOOTER_SPACE = 30;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const INK: RGB = rgb(0.12, 0.16, 0.22);
const MUTED: RGB = rgb(0.33, 0.36, 0.41);
const RULE: RGB = rgb(0.8, 0.8, 0.8);

const REPLACEMENTS: Record<string, string> = {
  "\u00a0": " ", // no-break space
  "\u202f": " ", // narrow no-break space (used by some time formats)
  "\u2009": " ", // thin space
  "\u2265": ">=",
  "\u2264": "<=",
};

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

interface Fonts {
  regular: PDFFont;
  semibold: PDFFont;
  heading: PDFFont;
}

class Writer {
  readonly pages: PDFPage[] = [];
  readonly texts: string[][] = [];
  private page!: PDFPage;
  y = 0;
  private readonly supported = new Map<PDFFont, Set<number>>();

  constructor(
    private readonly doc: PDFDocument,
    readonly fonts: Fonts,
  ) {}

  addPage() {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.pages.push(this.page);
    this.texts.push([]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  /** Starts a new page when `height` no longer fits; returns true if it did. */
  ensure(height: number): boolean {
    if (this.y - height < MARGIN + FOOTER_SPACE) {
      this.addPage();
      return true;
    }
    return false;
  }

  /** Replaces characters the embedded font cannot draw. */
  clean(font: PDFFont, text: string): string {
    let set = this.supported.get(font);
    if (!set) {
      set = new Set(font.getCharacterSet());
      this.supported.set(font, set);
    }
    let out = "";
    for (const char of text) {
      const replaced = REPLACEMENTS[char] ?? char;
      for (const c of replaced) {
        const code = c.codePointAt(0) ?? 0;
        out += /\s/.test(c) ? " " : set.has(code) ? c : "?";
      }
    }
    return out;
  }

  width(font: PDFFont, size: number, text: string): number {
    return font.widthOfTextAtSize(this.clean(font, text), size);
  }

  text(text: string, x: number, y: number, font: PDFFont, size: number, color: RGB = INK) {
    const clean = this.clean(font, text);
    if (!clean) return;
    this.page.drawText(clean, { x, y, font, size, color });
    this.texts[this.texts.length - 1]?.push(clean);
  }

  textRight(text: string, right: number, y: number, font: PDFFont, size: number, color: RGB = INK) {
    this.text(text, right - this.width(font, size, text), y, font, size, color);
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB = RULE, thickness = 0.6) {
    this.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color, thickness });
  }

  rect(x: number, y: number, width: number, height: number) {
    this.page.drawRectangle({ x, y, width, height, borderColor: INK, borderWidth: 0.8 });
  }

  image(image: PDFImage, x: number, y: number, width: number, height: number) {
    this.page.drawImage(image, { x, y, width, height });
  }

  /** Splits text into lines that fit `maxWidth`, breaking long words too. */
  wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const lines: string[] = [];
    let current = "";
    const words = text.split(/\s+/).filter(Boolean);
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (this.width(font, size, candidate) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      if (this.width(font, size, word) <= maxWidth) {
        current = word;
        continue;
      }
      // A single word (for example a URL) wider than the column.
      let chunk = "";
      for (const char of word) {
        if (this.width(font, size, chunk + char) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      current = chunk;
    }
    if (current) lines.push(current);
    return lines;
  }

  paragraph(text: string, x: number, maxWidth: number, font: PDFFont, size: number, color: RGB = INK) {
    const lineHeight = size * 1.4;
    for (const line of this.wrap(text, font, size, maxWidth)) {
      this.ensure(lineHeight);
      this.text(line, x, this.y - size, font, size, color);
      this.y -= lineHeight;
    }
  }

  heading(text: string) {
    this.ensure(36);
    this.y -= 6;
    this.text(text, MARGIN, this.y - 12, this.fonts.heading, 12.5);
    this.y -= 20;
  }

  keyValue(key: string, value: string, keyWidth = 150, size = 9.5) {
    const lineHeight = size * 1.38;
    // Both columns wrap, so a long label never runs into its value.
    const keyLines = this.wrap(key, this.fonts.semibold, size, keyWidth - 12);
    const valueLines = this.wrap(value, this.fonts.regular, size, CONTENT_WIDTH - keyWidth);
    const rows = Math.max(keyLines.length, valueLines.length);
    this.ensure(rows * lineHeight);
    keyLines.forEach((line, i) =>
      this.text(line, MARGIN, this.y - size - i * lineHeight, this.fonts.semibold, size, MUTED),
    );
    valueLines.forEach((line, i) =>
      this.text(line, MARGIN + keyWidth, this.y - size - i * lineHeight, this.fonts.regular, size),
    );
    this.y -= rows * lineHeight;
  }
}

function drawHeader(w: Writer, logo: PDFImage, model: ReportModel, labels: ReportLabels) {
  const top = PAGE_HEIGHT - MARGIN;
  const logoSize = 30;
  w.image(logo, MARGIN, top - logoSize, logoSize, logoSize * (logo.height / logo.width));
  w.text("Solace", MARGIN + logoSize + 8, top - 21, w.fonts.heading, 16);
  w.textRight(`${labels.reportCode}: ${model.code}`, PAGE_WIDTH - MARGIN, top - 18, w.fonts.regular, 8.5, MUTED);
  w.y = top - logoSize - 22;
  w.text(labels.docTitle, MARGIN, w.y - 18, w.fonts.heading, 18);
  w.y -= 34;

  w.keyValue(
    labels.screenedAt,
    model.completedAt ? labels.formatDateTime(model.completedAt) : labels.notRecorded,
  );
  w.keyValue(
    labels.instrumentLanguage,
    model.instrumentLocale ? labels.languageName[model.instrumentLocale] : labels.notRecorded,
  );
  w.keyValue(labels.reportCode, `${model.code} (${labels.reportCodeNote})`);
  if (model.nickname) w.keyValue(labels.nickname, model.nickname);
}

function drawSummary(w: Writer, model: ReportModel, labels: ReportLabels) {
  w.heading(labels.summaryTitle);
  const columns = [MARGIN, MARGIN + 150, MARGIN + 265, MARGIN + 380];
  const headers = [labels.colDimension, labels.colRaw, labels.colScore, labels.colCategory];
  headers.forEach((header, i) => w.text(header, columns[i] ?? MARGIN, w.y - 9, w.fonts.semibold, 9, MUTED));
  w.y -= 15;
  w.line(MARGIN, w.y, PAGE_WIDTH - MARGIN, w.y, INK);

  for (const row of model.scores) {
    w.y -= 20;
    w.text(labels.subscale[row.subscale], columns[0] ?? MARGIN, w.y + 6, w.fonts.semibold, 10.5);
    w.text(String(row.raw), columns[1] ?? MARGIN, w.y + 6, w.fonts.regular, 10.5);
    w.text(String(row.score), columns[2] ?? MARGIN, w.y + 6, w.fonts.regular, 10.5);
    w.text(labels.severity[row.severity], columns[3] ?? MARGIN, w.y + 6, w.fonts.semibold, 10.5);
    w.line(MARGIN, w.y, PAGE_WIDTH - MARGIN, w.y);
  }
  w.y -= 8;
}

function drawSafety(w: Writer, model: ReportModel, labels: ReportLabels) {
  if (!model.safety) return;
  w.heading(labels.safetyTitle);
  w.keyValue(labels.safetyAnswer, `${model.safety.answer} – ${model.safety.optionLabel}`, 230);
  w.keyValue(labels.crisisShown, model.safety.crisisShown ? labels.yes : labels.no, 230);
  w.y -= 2;
  w.paragraph(labels.safetyNote, MARGIN, CONTENT_WIDTH, w.fonts.regular, 8.5, MUTED);
}

function drawDisclaimer(w: Writer, labels: ReportLabels) {
  const size = 10;
  const inner = CONTENT_WIDTH - 24;
  const lines = w.wrap(labels.disclaimer, w.fonts.regular, size, inner);
  const height = 20 + 14 + lines.length * 14;
  w.ensure(height + 16);
  w.y -= 14;
  w.rect(MARGIN, w.y - height, CONTENT_WIDTH, height);
  let y = w.y - 12 - 10;
  w.text(labels.disclaimerTitle, MARGIN + 12, y, w.fonts.semibold, 10.5);
  y -= 16;
  for (const line of lines) {
    w.text(line, MARGIN + 12, y, w.fonts.regular, size);
    y -= 14;
  }
  w.y -= height + 6;
}

function drawItems(w: Writer, model: ReportModel, labels: ReportLabels) {
  w.heading(labels.itemsTitle);
  const col = { number: MARGIN, statement: MARGIN + 30, subscale: MARGIN + 362, answer: MARGIN + 448 };
  const statementWidth = 320;
  const size = 8.5;
  const lineHeight = 10.5;

  const drawTableHeader = () => {
    w.text(labels.colNumber, col.number, w.y - 9, w.fonts.semibold, 9, MUTED);
    w.text(labels.colStatement, col.statement, w.y - 9, w.fonts.semibold, 9, MUTED);
    w.text(labels.colDimension, col.subscale, w.y - 9, w.fonts.semibold, 9, MUTED);
    w.text(labels.colAnswer, col.answer, w.y - 9, w.fonts.semibold, 9, MUTED);
    w.y -= 14;
    w.line(MARGIN, w.y, PAGE_WIDTH - MARGIN, w.y, INK);
  };
  drawTableHeader();

  for (const item of model.items) {
    const lines = w.wrap(item.text, w.fonts.regular, size, statementWidth);
    const rowHeight = lines.length * lineHeight + 4;
    if (w.ensure(rowHeight)) drawTableHeader();
    const top = w.y - 3 - size;
    w.text(String(item.number), col.number, top, w.fonts.semibold, size);
    lines.forEach((line, i) => w.text(line, col.statement, top - i * lineHeight, w.fonts.regular, size));
    w.text(labels.subscale[item.subscale], col.subscale, top, w.fonts.regular, size);
    w.text(String(item.answer), col.answer + 12, top, w.fonts.semibold, size);
    w.y -= rowHeight;
    w.line(MARGIN, w.y, PAGE_WIDTH - MARGIN, w.y);
  }

  w.y -= 8;
  if (model.usesEnglishItemText) {
    w.paragraph(labels.englishItemsNote, MARGIN, CONTENT_WIDTH, w.fonts.regular, 8.5, MUTED);
  }
  const scale = model.answerScale.map((option) => `${option.value} = ${option.label}`).join("; ");
  w.paragraph(`${labels.answerScale}: ${scale}.`, MARGIN, CONTENT_WIDTH, w.fonts.regular, 8.5, MUTED);
}

function drawInstrument(w: Writer, model: ReportModel, labels: ReportLabels) {
  w.heading(labels.aboutTitle);
  const kv = (key: string, value: string) => w.keyValue(key, value, 150, 8.5);
  kv(labels.aboutInstrument, [model.instrument.text, model.instrument.url].filter(Boolean).join(" "));
  const source = model.languageSource;
  kv(
    labels.aboutLanguageSource,
    source === null
      ? labels.notRecorded
      : source.kind === "official"
        ? [labels.officialForm, source.url].filter(Boolean).join(" ")
        : [source.text, source.url].filter(Boolean).join(" "),
  );
  kv(labels.aboutPeriod, labels.periodValue);
  kv(labels.aboutScoring, labels.scoringValue);

  w.ensure(26 + model.cutoffs.length * 12);
  w.y -= 4;
  w.text(labels.cutoffTitle, MARGIN, w.y - 8.5, w.fonts.semibold, 8.5, MUTED);
  w.y -= 14;
  const columns = [MARGIN, MARGIN + 150, MARGIN + 265, MARGIN + 380];
  const headers = [labels.colCategoryCutoff, labels.subscale.depression, labels.subscale.anxiety, labels.subscale.stress];
  headers.forEach((header, i) => w.text(header, columns[i] ?? MARGIN, w.y - 8.5, w.fonts.semibold, 8.5, MUTED));
  w.y -= 12;
  w.line(MARGIN, w.y, PAGE_WIDTH - MARGIN, w.y, INK);
  for (const row of model.cutoffs) {
    w.y -= 12;
    w.text(labels.severity[row.severity], columns[0] ?? MARGIN, w.y + 3, w.fonts.regular, 8.5);
    w.text(row.ranges.depression, columns[1] ?? MARGIN, w.y + 3, w.fonts.regular, 8.5);
    w.text(row.ranges.anxiety, columns[2] ?? MARGIN, w.y + 3, w.fonts.regular, 8.5);
    w.text(row.ranges.stress, columns[3] ?? MARGIN, w.y + 3, w.fonts.regular, 8.5);
  }
  w.y -= 6;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function drawDirectory(w: Writer, model: ReportModel, labels: ReportLabels) {
  w.heading(`${labels.directoryTitle} · ${labels.directoryCountry}`);
  for (const service of model.services) {
    w.ensure(30);
    const category = service.category === "emergency" ? labels.emergency : labels.support;
    const channels = service.channels
      .map((channel) => (channel.kind === "phone" ? labels.call(channel.label) : hostOf(channel.url)))
      .join(" · ");
    w.paragraph(`${service.name} (${category}): ${channels}`, MARGIN, CONTENT_WIDTH, w.fonts.semibold, 9);
    const verified = service.verifiedAt
      ? labels.verifiedAt(labels.formatDate(service.verifiedAt))
      : labels.notVerified;
    w.paragraph(
      `${labels.serviceType[service.type]} · ${labels.source}: ${hostOf(service.sourceUrl)} · ${verified}`,
      MARGIN + 12,
      CONTENT_WIDTH - 12,
      w.fonts.regular,
      7.5,
      MUTED,
    );
    w.y -= 3;
  }
}

function drawFooters(w: Writer, labels: ReportLabels) {
  const total = w.pages.length;
  w.pages.forEach((page, index) => {
    const y = MARGIN - 18;
    page.drawLine({
      start: { x: MARGIN, y: y + 12 },
      end: { x: PAGE_WIDTH - MARGIN, y: y + 12 },
      color: RULE,
      thickness: 0.5,
    });
    const footer = w.clean(w.fonts.regular, labels.footer);
    const pageLabel = w.clean(w.fonts.regular, labels.page(index + 1, total));
    page.drawText(footer, { x: MARGIN, y, size: 8, font: w.fonts.regular, color: MUTED });
    page.drawText(pageLabel, {
      x: PAGE_WIDTH - MARGIN - w.fonts.regular.widthOfTextAtSize(pageLabel, 8),
      y,
      size: 8,
      font: w.fonts.regular,
      color: MUTED,
    });
    w.texts[index]?.push(footer, pageLabel);
  });
}

export async function renderReportPdf(
  model: ReportModel,
  labels: ReportLabels,
  now: Date = new Date(),
): Promise<RenderedReport> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const fonts: Fonts = {
    regular: await doc.embedFont(decodeBase64(INTER_REGULAR), { subset: true }),
    semibold: await doc.embedFont(decodeBase64(INTER_SEMIBOLD), { subset: true }),
    heading: await doc.embedFont(decodeBase64(LORA_SEMIBOLD), { subset: true }),
  };
  const logo = await doc.embedPng(decodeBase64(LOGO_PNG));

  // No personal information in the metadata (PRD 12).
  doc.setTitle(labels.docTitle, { showInWindowTitleBar: true });
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.setCreator("Solace");
  doc.setProducer("Solace");
  doc.setLanguage(model.locale === "id" ? "id-ID" : "en");
  doc.setCreationDate(now);
  doc.setModificationDate(now);

  const w = new Writer(doc, fonts);

  // Page 1: summary.
  w.addPage();
  drawHeader(w, logo, model, labels);
  drawSummary(w, model, labels);
  drawSafety(w, model, labels);
  drawDisclaimer(w, labels);

  // Page 2: details.
  w.addPage();
  drawItems(w, model, labels);
  drawInstrument(w, model, labels);
  drawDirectory(w, model, labels);

  drawFooters(w, labels);

  return { bytes: await doc.save(), pages: w.texts };
}
