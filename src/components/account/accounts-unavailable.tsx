import { getTranslations } from "next-intl/server";
import { Lock } from "@/components/icons/lock";

/** Shown instead of account pages when no database is configured. */
export async function AccountsUnavailable() {
  const t = await getTranslations("account");
  return (
    <section data-testid="accounts-unavailable" className="mx-auto max-w-2xl space-y-4">
      <Lock aria-hidden="true" className="size-6 text-sage-ink" />
      <h1 className="text-4xl leading-tight sm:text-5xl">{t("unavailableTitle")}</h1>
      <p className="measure text-lg leading-relaxed text-muted-foreground">
        {t("unavailableBody")}
      </p>
    </section>
  );
}
