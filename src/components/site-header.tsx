import { getTranslations } from "next-intl/server";
import { HelpNowButton } from "@/components/help-now-button";
import { LangSwitch } from "@/components/lang-switch";
import { Logo } from "@/components/logo";
import { QuickExit } from "@/components/quick-exit";
import { ThemeSwitch } from "@/components/theme-switch";
import { Link } from "@/i18n/navigation";

export async function SiteHeader() {
  const t = await getTranslations("header");

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-2 focus:shadow-(--shadow-soft)"
      >
        {t("skipToContent")}
      </a>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2.5 sm:gap-3 sm:px-8">
        <Link
          href="/"
          aria-label={t("homeLabel")}
          className="mr-auto flex items-center gap-2.5 rounded-full py-1 pr-2"
        >
          <Logo size={26} />
          <span className="font-heading text-[1.35rem] leading-none font-medium tracking-tight">
            Solace
          </span>
        </Link>
        <LangSwitch />
        {/* On phones the switch shares the second row with "help now", so the
            first row keeps the logo, language, and quick exit. */}
        <ThemeSwitch className="max-sm:order-[10000]" />
        <QuickExit />
        <HelpNowButton className="order-last grow basis-48 sm:order-none sm:grow-0 sm:basis-auto" />
      </div>
    </header>
  );
}
