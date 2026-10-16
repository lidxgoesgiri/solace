import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeFromParams } from "@/i18n/locale";
import { CrisisScreen } from "@/components/crisis-screen";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "header" });
  return { title: t("helpNow") };
}

export default async function CrisisPage({ params }: PageProps) {
  const locale = await localeFromParams(params);
  setRequestLocale(locale);
  return <CrisisScreen />;
}
