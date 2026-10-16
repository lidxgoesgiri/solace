import type { Metadata, Viewport } from "next";
import { Inter, Lora } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { FlowGuard } from "@/components/flow-guard";
import { HtmlLang } from "@/components/html-lang";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { routing } from "@/i18n/routing";
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
  themeColor: "#fbfaf6",
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${inter.variable} ${lora.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <HtmlLang />
          <SiteHeader />
          <main
            id="content"
            tabIndex={-1}
            className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 outline-none sm:py-12"
          >
            <FlowGuard>{children}</FlowGuard>
          </main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
