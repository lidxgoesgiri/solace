import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeFromParams } from "@/i18n/locale";
import { PRIVACY_SECTIONS } from "@/lib/privacy";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "privacy" });
  return { title: t("title") };
}

const REPOSITORY = "https://github.com/lidxgoesgiri/solace";

/** What Solace stores, where, and who can see it (PRD 13). */
export default async function PrivacyPage({ params }: PageProps) {
  const locale = await localeFromParams(params);
  setRequestLocale(locale);
  const t = await getTranslations("privacy");
  const common = await getTranslations("common");

  return (
    <article className="mx-auto max-w-2xl space-y-10" data-testid="privacy-page">
      <header className="space-y-4">
        <h1 className="text-4xl leading-tight sm:text-5xl">{t("title")}</h1>
        <p className="measure text-lg leading-relaxed text-muted-foreground">{t("intro")}</p>
        <p className="text-sm text-muted-foreground">{t("updated")}</p>
      </header>

      {PRIVACY_SECTIONS.map(({ id, title, items }) => (
        <section
          key={id}
          aria-labelledby={`privacy-${id}`}
          className="space-y-3"
          data-testid={`privacy-${id}`}
        >
          <h2 id={`privacy-${id}`} className="text-2xl">
            {t(title)}
          </h2>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            {items.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
          {id === "contact" ? (
            <a
              href={REPOSITORY}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-medium underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
            >
              {t("contactLink")}
              <span className="sr-only"> {common("opensInNewTab")}</span>
            </a>
          ) : null}
        </section>
      ))}
    </article>
  );
}
