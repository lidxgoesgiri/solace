import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeFromParams } from "@/i18n/locale";
import { SafetyQuestion } from "@/components/safety-question";
import { getSafetyQuestion, isTodoPlaceholder } from "@/lib/content";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "safety" });
  return { title: t("title") };
}

export default async function SafetyPage({ params }: PageProps) {
  const locale = await localeFromParams(params);
  setRequestLocale(locale);
  // Read on the server, so the question data stays out of the browser bundle.
  const content = getSafetyQuestion(locale);
  return (
    <SafetyQuestion
      locale={locale}
      stem={content.stem}
      text={content.text}
      isPlaceholder={isTodoPlaceholder(content.text)}
      options={content.options}
    />
  );
}
