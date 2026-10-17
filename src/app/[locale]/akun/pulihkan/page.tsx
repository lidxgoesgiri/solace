import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountsUnavailable } from "@/components/account/accounts-unavailable";
import { RecoverForm } from "@/components/account/recover-form";
import { localeFromParams } from "@/i18n/locale";
import { accountsEnabled } from "@/server/db";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("recoverTitle") };
}

export default async function Page({ params }: PageProps) {
  const locale = await localeFromParams(params);
  setRequestLocale(locale);
  if (!accountsEnabled()) return <AccountsUnavailable />;
  const t = await getTranslations("account");
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <header className="space-y-3">
        <h1 className="text-4xl leading-tight sm:text-5xl">{t("recoverTitle")}</h1>
        <p className="leading-relaxed text-muted-foreground">{t("recoverIntro")}</p>
      </header>
      <RecoverForm />
    </div>
  );
}
