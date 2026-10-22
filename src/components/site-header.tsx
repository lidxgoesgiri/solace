import { getTranslations } from "next-intl/server";
import { HelpNowButton } from "@/components/help-now-button";
import { LangSwitch } from "@/components/lang-switch";
import { Logo } from "@/components/logo";
import { QuickExit } from "@/components/quick-exit";
import { ThemeSwitch } from "@/components/theme-switch";
import { Link } from "@/i18n/navigation";

export async function SiteHeader() {
  const t = await getTranslations("header");
  const nav = [
    { href: "/#how-it-works", label: t("navHow") },
    { href: "/#features", label: t("navFeatures") },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/85">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-2 focus:shadow-(--shadow-soft)"
      >
        {t("skipToContent")}
      </a>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3 sm:gap-x-3 sm:px-8">
        <Link
          href="/"
          aria-label={t("homeLabel")}
          className="mr-auto flex min-h-11 items-center gap-2.5 rounded-full py-1 pr-2"
        >
          <Logo size={26} />
          <span className="font-heading text-[1.35rem] leading-none font-medium tracking-tight">
            Solace
          </span>
        </Link>
        <nav aria-label={t("primaryNav")} className="mr-3 hidden lg:block">
          <ul className="flex items-center gap-5 text-sm text-muted-foreground">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="nav-editorial-link inline-flex min-h-11 items-center rounded-sm transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <LangSwitch className="border-transparent bg-transparent px-3 hover:bg-muted" />
        <QuickExit className="border-transparent bg-transparent px-3 hover:bg-muted" />
        <ThemeSwitch compact className="size-11 border-transparent bg-transparent px-0 hover:bg-muted" />
        <HelpNowButton className="grow basis-48 sm:grow-0 sm:basis-auto" />
      </div>
    </header>
  );
}
