import { getTranslations } from "next-intl/server";

/** Disclaimer on every page (GL-04). */
export async function SiteFooter() {
  const t = await getTranslations("footer");
  const common = await getTranslations("common");

  return (
    <footer className="mt-12 border-t bg-muted/60">
      <div className="mx-auto max-w-5xl space-y-2 px-4 py-6 text-sm text-muted-foreground">
        <p data-testid="footer-disclaimer" className="font-medium text-foreground">
          {t("disclaimer")}
        </p>
        <p>{t("disclaimerDetail")}</p>
        <p>{t("independence")}</p>
        <p className="hidden sm:block">{t("quickExitHint")}</p>
        <p className="pt-2 font-heading italic">{common("tagline")}</p>
      </div>
    </footer>
  );
}
