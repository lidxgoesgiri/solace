import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeFromParams } from "@/i18n/locale";
import { SafetyPlanEditor } from "@/components/safety-plan/safety-plan-editor";
import { accountsEnabled } from "@/server/db";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "plan" });
  return { title: t("title") };
}

/** The safety plan works with or without an account (SP-01, SP-03). */
export default async function SafetyPlanPage({ params }: PageProps) {
  const locale = await localeFromParams(params);
  setRequestLocale(locale);
  return <SafetyPlanEditor accountsAvailable={accountsEnabled()} />;
}
