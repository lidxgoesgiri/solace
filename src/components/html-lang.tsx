"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

/** Keeps <html lang> in sync after a client-side language switch (GL-03). */
export function HtmlLang() {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
