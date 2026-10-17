import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/logo";

/** Disclaimer on every page (GL-04). */
export async function SiteFooter() {
  const t = await getTranslations("footer");
  const common = await getTranslations("common");

  return (
    <footer className="mt-16 border-t bg-muted/50">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1fr_1.4fr] md:gap-16">
        <div className="flex items-start gap-4">
          <Logo size={36} />
          <p className="font-heading text-2xl leading-snug italic">{common("tagline")}</p>
        </div>
        <div className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
          <p data-testid="footer-disclaimer" className="text-base font-medium text-foreground">
            {t("disclaimer")}
          </p>
          <p>{t("disclaimerDetail")}</p>
          <p>{t("independence")}</p>
          <p className="hidden sm:block">{t("quickExitHint")}</p>
        </div>
      </div>
    </footer>
  );
}
