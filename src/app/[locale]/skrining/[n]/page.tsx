import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeFromParams } from "@/i18n/locale";
import { ScreeningQuestion } from "@/components/screening-question";
import { getDass21, isTodoPlaceholder } from "@/lib/content";
import { DASS21_ITEM_COUNT } from "@/lib/answers";

interface PageProps {
  params: Promise<{ locale: string; n: string }>;
}

export function generateStaticParams() {
  return Array.from({ length: DASS21_ITEM_COUNT }, (_, i) => ({ n: String(i + 1) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { n } = await params;
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "screening" });
  return { title: t("progressLabel", { current: n, total: DASS21_ITEM_COUNT }) };
}

export default async function ScreeningPage({ params }: PageProps) {
  const { n } = await params;
  const locale = await localeFromParams(params);
  setRequestLocale(locale);
  // The flow guard redirects malformed or out-of-order numbers before render.
  const question = /^\d+$/.test(n) ? Number(n) : Number.NaN;
  // Item text is read here, on the server, so the DASS-21 data of both
  // languages stays out of the browser bundle (PRD 14).
  const content = getDass21(locale);
  const item = content.items[question - 1];
  return (
    <ScreeningQuestion
      key={question}
      n={question}
      text={item?.text ?? null}
      isPlaceholder={item ? isTodoPlaceholder(item.text) : false}
      options={content.options}
    />
  );
}
