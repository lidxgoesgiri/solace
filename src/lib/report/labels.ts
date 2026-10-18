/**
 * Builds the PDF labels from the app's messages. Kept pure so tests can
 * render the report with the real Indonesian and English text.
 */

import type { Country } from "@/lib/content";
import type { ReportLabels } from "./pdf";

/** A translator over full message keys, e.g. "report.pdf.docTitle". */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

export interface LabelContext {
  t: Translate;
  country: Country;
  formatDateTime: (iso: string) => string;
  formatDate: (iso: string) => string;
  now: Date;
}

export function buildReportLabels({ t, country, formatDateTime, formatDate, now }: LabelContext): ReportLabels {
  const pdf = (key: string, values?: Record<string, string | number>) => t(`report.pdf.${key}`, values);
  return {
    docTitle: pdf("docTitle"),
    screenedAt: pdf("screenedAt"),
    notRecorded: pdf("notRecorded"),
    instrumentLanguage: pdf("instrumentLanguage"),
    reportCode: pdf("reportCode"),
    reportCodeNote: pdf("reportCodeNote"),
    nickname: pdf("nickname"),
    summaryTitle: pdf("summaryTitle"),
    colDimension: pdf("colDimension"),
    colRaw: pdf("colRaw"),
    colScore: pdf("colScore"),
    colCategory: pdf("colCategory"),
    safetyTitle: pdf("safetyTitle"),
    safetyAnswer: pdf("safetyAnswer"),
    crisisShown: pdf("crisisShown"),
    yes: pdf("yes"),
    no: pdf("no"),
    safetyNote: pdf("safetyNote"),
    disclaimerTitle: pdf("disclaimerTitle"),
    disclaimer: pdf("disclaimer"),
    itemsTitle: pdf("itemsTitle"),
    colNumber: pdf("colNumber"),
    colStatement: pdf("colStatement"),
    colAnswer: pdf("colAnswer"),
    englishItemsNote: pdf("englishItemsNote"),
    answerScale: pdf("answerScale"),
    aboutTitle: pdf("aboutTitle"),
    aboutInstrument: pdf("aboutInstrument"),
    aboutLanguageSource: pdf("aboutLanguageSource"),
    officialForm: pdf("officialForm"),
    aboutPeriod: pdf("aboutPeriod"),
    periodValue: pdf("periodValue"),
    aboutScoring: pdf("aboutScoring"),
    scoringValue: pdf("scoringValue"),
    cutoffTitle: pdf("cutoffTitle"),
    colCategoryCutoff: pdf("colCategoryCutoff"),
    directoryTitle: pdf("directoryTitle"),
    directoryCountry: t(`countries.${country}`),
    emergency: t("directory.emergency"),
    support: t("directory.support"),
    call: (label) => t("directory.call", { label }),
    source: pdf("source"),
    verifiedAt: (date) => t("directory.verifiedAt", { date }),
    notVerified: pdf("notVerified"),
    footer: pdf("footer", { date: formatDateTime(now.toISOString()) }),
    page: (page, total) => pdf("page", { page, total }),
    notesTitle: pdf("notesTitle"),
    notesByUser: pdf("notesByUser"),
    notesByAi: pdf("notesByAi"),
    notesQuestion: {
      since: t("report.notes.questions.since"),
      hardest: t("report.notes.questions.hardest"),
      tried: t("report.notes.questions.tried"),
      ask: t("report.notes.questions.ask"),
      hope: t("report.notes.questions.hope"),
    },
    severity: {
      normal: t("severity.normal"),
      mild: t("severity.mild"),
      moderate: t("severity.moderate"),
      severe: t("severity.severe"),
      extremely_severe: t("severity.extremely_severe"),
    },
    subscale: {
      depression: t("subscale.depression"),
      anxiety: t("subscale.anxiety"),
      stress: t("subscale.stress"),
    },
    serviceType: {
      public: t("directory.type.public"),
      government: t("directory.type.government"),
      nonprofit: t("directory.type.nonprofit"),
    },
    languageName: { id: t("report.languageName.id"), en: t("report.languageName.en") },
    formatDateTime,
    formatDate,
  };
}
