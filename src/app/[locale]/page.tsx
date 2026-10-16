import {
  ArrowRight,
  CalendarDays,
  Clock,
  ListChecks,
  Lock,
  MailX,
  UserRoundX,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeFromParams } from "@/i18n/locale";
import { LandingResume } from "@/components/landing-resume";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { PATHS } from "@/lib/flow";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await localeFromParams(params);
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const common = await getTranslations("common");

  const privacy = [
    { icon: UserRoundX, title: t("privacyNoAccountTitle"), body: t("privacyNoAccountBody") },
    { icon: MailX, title: t("privacyNoEmailTitle"), body: t("privacyNoEmailBody") },
    { icon: Lock, title: t("privacyEncryptedTitle"), body: t("privacyEncryptedBody") },
  ];

  const steps = [
    { icon: ListChecks, text: t("howQuestions") },
    { icon: Clock, text: t("howTime") },
    { icon: CalendarDays, text: t("howPeriod") },
    { icon: ArrowRight, text: t("howResult") },
  ];

  return (
    <div className="space-y-12">
      <section
        aria-labelledby="hero-title"
        className="flex flex-col items-center gap-3 text-center sm:gap-4"
      >
        <Logo size={72} priority />
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          {t("eyebrow")}
        </p>
        <h1 id="hero-title" className="max-w-2xl text-3xl leading-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="font-heading text-lg italic">{common("tagline")}</p>
        <Button asChild size="lg" className="mt-1">
          <Link href={PATHS.mulai} data-testid="start-screening">
            {t("start")}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">{t("startHint")}</p>
        <p className="mt-2 max-w-xl text-base text-muted-foreground">{t("subtitle")}</p>
      </section>

      <LandingResume />

      <section aria-labelledby="privacy-title" className="space-y-4">
        <h2 id="privacy-title" className="text-2xl">
          {t("privacyTitle")}
        </h2>
        <ul data-testid="privacy-points" className="grid gap-3 sm:grid-cols-3">
          {privacy.map(({ icon: Icon, title, body }) => (
            <li key={title} className="space-y-2 rounded-2xl border bg-card p-5">
              <Icon aria-hidden="true" className="size-6 text-primary" />
              <h3 className="text-lg">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how-title" className="space-y-4">
        <h2 id="how-title" className="text-2xl">
          {t("howTitle")}
        </h2>
        <ul data-testid="how-it-works" className="space-y-3">
          {steps.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-sage-soft">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <p className="rounded-xl bg-sun-soft p-4 text-sm">{t("notDiagnosis")}</p>
      </section>
    </div>
  );
}
