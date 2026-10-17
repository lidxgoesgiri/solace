"use client";

import { createTranslator, useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/content";
import type { Translate } from "@/lib/report/labels";

type Messages = Record<string, unknown>;

// Imports of messages/*.json are precompiled by the next-intl plugin, so the
// other language can be formatted without shipping the ICU parser.
const loadMessages = (locale: Locale): Promise<Messages> =>
  (locale === "en"
    ? import("../../messages/en.json")
    : import("../../messages/id.json")
  ).then((module) => module.default as Messages);

export interface ReportTranslator {
  t: Translate;
  /** False while the other language's messages are still loading. */
  ready: boolean;
}

/**
 * Translator for a report language that may differ from the interface
 * language (PDF-03). Falls back to the interface language while loading.
 */
export function useReportTranslator(reportLocale: Locale): ReportTranslator {
  const appLocale = useLocale();
  const all = useTranslations();
  const [loaded, setLoaded] = useState<{ locale: Locale; t: Translate } | null>(null);

  useEffect(() => {
    if (reportLocale === appLocale) return;
    let cancelled = false;
    void loadMessages(reportLocale).then((messages) => {
      if (cancelled) return;
      const translator = createTranslator({ locale: reportLocale, messages });
      setLoaded({
        locale: reportLocale,
        t: (key, values) => translator(key as never, values as never) as string,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [reportLocale, appLocale]);

  const uiTranslate: Translate = (key, values) =>
    all(key as Parameters<typeof all>[0], values as never);

  if (reportLocale === appLocale) return { t: uiTranslate, ready: true };
  if (loaded?.locale === reportLocale) return { t: loaded.t, ready: true };
  return { t: uiTranslate, ready: false };
}

/** Date formatting in the report language, independent of the interface. */
export function reportDateFormatters(locale: Locale) {
  const tag = locale;
  const dateTime = new Intl.DateTimeFormat(tag, { dateStyle: "long", timeStyle: "short" });
  const date = new Intl.DateTimeFormat(tag, { dateStyle: "long" });
  return {
    formatDateTime: (iso: string) => dateTime.format(new Date(iso)),
    formatDate: (iso: string) => date.format(new Date(iso)),
  };
}
