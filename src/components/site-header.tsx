import { getTranslations } from "next-intl/server";
import { HelpNowButton } from "@/components/help-now-button";
import { LangSwitch } from "@/components/lang-switch";
import { Logo } from "@/components/logo";
import { QuickExit } from "@/components/quick-exit";
import { Link } from "@/i18n/navigation";

export async function SiteHeader() {
  const t = await getTranslations("header");

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow"
      >
        {t("skipToContent")}
      </a>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-2">
        <Link
          href="/"
          aria-label={t("homeLabel")}
          className="mr-auto flex items-center gap-2 rounded-md"
        >
          <Logo size={28} />
          <span className="font-heading text-xl font-semibold tracking-tight">Solace</span>
        </Link>
        <LangSwitch />
        <QuickExit />
        <HelpNowButton className="order-last w-full sm:order-none sm:w-auto" />
      </div>
    </header>
  );
}
