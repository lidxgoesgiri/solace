import type { Metadata, Viewport } from "next";
import { Inter, Lora } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { FlowGuard } from "@/components/flow-guard";
import { LazyCursorSpotlight } from "@/components/motion/lazy-cursor-spotlight";
import { HtmlLang } from "@/components/html-lang";
import { PageTransition } from "@/components/motion/page-transition";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { routing } from "@/i18n/routing";
import { serviceWorkerScript } from "@/lib/pwa";
import { themeScript } from "@/lib/theme";
import "../globals.css";

// Self-hosted by next/font at build time: no request to Google Fonts at runtime.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: { default: t("title"), template: "%s · Solace" },
    description: t("description"),
    applicationName: "Solace",
    referrer: "no-referrer",
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f5ef" },
    { media: "(prefers-color-scheme: dark)", color: "#12171d" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    // The theme script may set data-theme on <html> before React hydrates.
    <html lang={locale} className={`${inter.variable} ${lora.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies a pinned light or dark mode before the first paint (src/lib/theme.ts). */}
        <script dangerouslySetInnerHTML={{ __html: themeScript() }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <HtmlLang />
          <LazyCursorSpotlight />
          <SiteHeader />
          <main
            id="content"
            tabIndex={-1}
            className="mx-auto min-h-[calc(100svh-7rem)] w-full min-w-0 max-w-6xl flex-1 px-5 py-8 outline-none sm:px-8 sm:py-14"
          >
            <FlowGuard>
              <PageTransition>{children}</PageTransition>
            </FlowGuard>
          </main>
          <SiteFooter />
          {process.env.NODE_ENV === "production" ? (
            // Offline support (PRD 14), outside React so screening pages ship no extra JS.
            <script dangerouslySetInnerHTML={{ __html: serviceWorkerScript(locale) }} />
          ) : null}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
