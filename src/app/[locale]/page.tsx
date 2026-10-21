import { ArrowRight } from "@/components/icons/arrow-right";
import { Info } from "@/components/icons/info";
import { Lock } from "@/components/icons/lock";
import { MailX } from "@/components/icons/mail-x";
import { UserRoundX } from "@/components/icons/user-round-x";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeFromParams } from "@/i18n/locale";
import { LandingResume } from "@/components/landing-resume";
import { MotionProvider } from "@/components/motion/motion-provider";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { SunriseMark } from "@/components/sunrise-mark";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { PATHS } from "@/lib/flow";

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFromParams(params);
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const common = await getTranslations("common");

  const privacy = [
    { icon: UserRoundX, title: t("privacyNoAccountTitle"), body: t("privacyNoAccountBody") },
    { icon: MailX, title: t("privacyNoEmailTitle"), body: t("privacyNoEmailBody") },
    { icon: Lock, title: t("privacyEncryptedTitle"), body: t("privacyEncryptedBody") },
  ];

  const steps = [t("howQuestions"), t("howTime"), t("howPeriod"), t("howResult")];

  return (
    <MotionProvider>
      <div className="space-y-20 sm:space-y-28">
        <section
          aria-labelledby="hero-title"
          className="grid items-center gap-10 md:grid-cols-[1.15fr_1fr] md:gap-14"
        >
          <div className="space-y-6">
            <p className="kicker max-w-xs">{t("eyebrow")}</p>
            <h1
              id="hero-title"
              className="text-[2.15rem] leading-[1.12] tracking-[-0.02em] sm:text-6xl md:text-5xl lg:text-[4.1rem]"
            >
              {t("title")}
            </h1>
            <p className="font-heading text-xl text-sage-ink italic sm:text-2xl">
              {common("tagline")}
            </p>
            <p className="measure text-lg leading-relaxed text-muted-foreground">{t("subtitle")}</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1" data-testid="landing-primary-action">
              <Button asChild size="lg">
                <Link href={PATHS.mulai} data-testid="start-screening">
                  {t("start")}
                  <ArrowRight
                    aria-hidden="true"
                    className="transition-transform duration-(--duration-base) ease-(--ease-calm) group-hover/button:translate-x-0.5"
                  />
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">{t("startHint")}</p>
            </div>
          </div>
          <SunriseMark />
        </section>

        <LandingResume />

        <section
          aria-labelledby="privacy-title"
          className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-14"
        >
          <h2 id="privacy-title" className="text-3xl leading-tight sm:text-4xl">
            {t("privacyTitle")}
          </h2>
          <Stagger as="ul" inView data-testid="privacy-points" className="divide-y border-y">
            {privacy.map(({ icon: Icon, title, body }) => (
              <StaggerItem
                as="li"
                key={title}
                className="grid gap-x-5 gap-y-1.5 py-6 sm:grid-cols-[2.5rem_minmax(0,1fr)]"
              >
                <Icon aria-hidden="true" className="size-6 text-sage-ink sm:row-span-2 sm:mt-1" />
                <h3 className="text-xl">{title}</h3>
                <p className="measure text-muted-foreground">{body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section aria-labelledby="how-title" className="space-y-10">
          <h2 id="how-title" className="text-3xl leading-tight sm:text-4xl">
            {t("howTitle")}
          </h2>
          <Stagger
            as="ol"
            inView
            data-testid="how-it-works"
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8"
          >
            {steps.map((text, index) => (
              <StaggerItem
                as="li"
                key={text}
                className="flex gap-4 border-t border-ink/20 pt-5 lg:flex-col lg:gap-3"
              >
                <span aria-hidden="true" className="numeral text-4xl leading-none text-sage-ink">
                  {index + 1}
                </span>
                <span className="leading-relaxed">{text}</span>
              </StaggerItem>
            ))}
          </Stagger>
          <p className="flex max-w-2xl items-start gap-3 text-sm text-muted-foreground">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-sage-ink" />
            {t("notDiagnosis")}
          </p>
        </section>
      </div>
    </MotionProvider>
  );
}
