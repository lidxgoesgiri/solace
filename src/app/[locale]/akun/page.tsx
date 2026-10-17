import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountHome } from "@/components/account/account-home";
import { AccountsUnavailable } from "@/components/account/accounts-unavailable";
import { localeFromParams } from "@/i18n/locale";
import { accountsEnabled } from "@/server/db";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("title") };
}

export default async function AccountPage({ params }: PageProps) {
  const locale = await localeFromParams(params);
  setRequestLocale(locale);
  return accountsEnabled() ? <AccountHome /> : <AccountsUnavailable />;
}
