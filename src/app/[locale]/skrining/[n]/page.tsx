import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeFromParams } from "@/i18n/locale";
import { ScreeningQuestion } from "@/components/screening-question";
import { DASS21_ITEM_COUNT } from "@/lib/scoring";

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
  return <ScreeningQuestion key={question} n={question} />;
}
