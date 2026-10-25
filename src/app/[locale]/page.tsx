import { ArrowRight } from "@/components/icons/arrow-right";
import { CircleAlert } from "@/components/icons/circle-alert";
import { FileText } from "@/components/icons/file-text";
import { Info } from "@/components/icons/info";
import { Lock } from "@/components/icons/lock";
import { ShieldCheck } from "@/components/icons/shield-check";
import { LandingResume } from "@/components/landing-resume";
import { MotionProvider } from "@/components/motion/motion-provider";
import { SunriseMark } from "@/components/sunrise-mark";
import { Button } from "@/components/ui/button";
import { AnimatedUnderline } from "@/features/landing/animated-underline";
import { BreathingPreview } from "@/features/landing/breathing-preview";
import { GroundingPreview } from "@/features/landing/grounding-preview";
import { HeroWordmark } from "@/features/landing/hero-wordmark";
import heroStyles from "@/features/landing/hero-wordmark.module.css";
import { InteractiveSteps } from "@/features/landing/interactive-steps";
import { LandingReveal, LandingRevealItem } from "@/features/landing/landing-reveal";
import { MarqueeRibbon } from "@/features/landing/marquee-ribbon";
import { ResultSimulator } from "@/features/landing/result-simulator";
import { StarfieldBackground } from "@/features/landing/starfield-background";
import { StudentScenarios } from "@/features/landing/student-scenarios";
import { localeFromParams } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { PATHS } from "@/lib/flow";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFromParams(params);
  setRequestLocale(locale);
  const t = await getTranslations("landing");

  const trustFacts = ["instrument", "account", "local", "screening"] as const;
  const evidence = [
    { key: "privacy", icon: Lock },
    { key: "safety", icon: CircleAlert },
    { key: "useful", icon: FileText },
  ] as const;
  const faqs = ["diagnosis", "account", "privacy", "support", "duration"] as const;

  return (
    <MotionProvider>
      {/* Ambient Web3-style Starfield & Aurora Mesh Background */}
      <StarfieldBackground />

      <div className="landing-page relative z-10 space-y-20 sm:space-y-28 lg:space-y-32">
        <section
          aria-labelledby="hero-title"
          data-halftone-hero
          className={`${heroStyles.surface} relative isolate grid items-center gap-8 py-2 sm:gap-12 sm:py-8 md:min-h-[min(44rem,calc(100svh-10rem))] md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-10 lg:gap-14`}
        >
          <HeroWordmark />
          <div className="relative z-10 space-y-6">
            <p className="kicker max-w-xs">{t("eyebrow")}</p>
            <h1
              id="hero-title"
              className={`${heroStyles.slogan} max-w-[10ch] text-[clamp(3.25rem,6.8vw,5.75rem)] leading-[1.08] tracking-[-0.045em]`}
            >
              {t.rich("slogan", { emphasis: (words) => <AnimatedUnderline className={heroStyles.emphasis}>{words}</AnimatedUnderline> })}
            </h1>
            <div className="max-w-[35rem] space-y-3">
              <p className="font-heading text-xl leading-relaxed sm:text-2xl">{t("title")}</p>
              <p className="measure text-base leading-relaxed text-muted-foreground sm:text-lg">{t("subtitle")}</p>
            </div>
            <div className="flex flex-col items-stretch gap-3 pt-1 sm:flex-row sm:items-center" data-testid="landing-primary-action">
              <Button asChild size="lg" className="landing-cta">
                <Link href={PATHS.mulai} data-testid="start-screening">
                  {t("start")}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <a href="#how-it-works">{t("seeHow")}</a>
              </Button>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 border-t pt-4 text-xs text-muted-foreground sm:text-sm">
              <span>{t("microTime")}</span>
              <span aria-hidden="true">·</span>
              <span>{t("microAge")}</span>
              <span aria-hidden="true">·</span>
              <span>{t("microDiagnosis")}</span>
            </div>
          </div>
          <SunriseMark />
        </section>

        {/* Continuous looping ribbon banner */}
        <MarqueeRibbon />

        <LandingResume />

        <section id="why-solace" aria-labelledby="trust-title" className="scroll-mt-28 space-y-8">
          <h2 id="trust-title" className="sr-only">{t("trustTitle")}</h2>
          <LandingReveal stagger className="grid gap-5 border-y py-6 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x">
            {trustFacts.map((fact, index) => (
              <LandingRevealItem key={fact} className="flex gap-4 lg:px-6 lg:first:pl-0 lg:last:pr-0">
                <span aria-hidden="true" className="numeral text-sm text-sage-ink">0{index + 1}</span>
                <p className="text-sm leading-relaxed sm:text-base">{t(`trust.${fact}`)}</p>
              </LandingRevealItem>
            ))}
          </LandingReveal>
        </section>

        <section className="space-y-16">
          <LandingReveal as="div" aria-labelledby="story-title" className="grid gap-8 lg:grid-cols-[0.52fr_1fr] lg:gap-20">
            <p className="kicker self-start">{t("storyKicker")}</p>
            <div className="space-y-7">
              <h2 id="story-title" className="max-w-4xl text-[clamp(2.5rem,5vw,4.8rem)] leading-[1.03] tracking-[-0.035em]">
                {t("storyTitle")}
              </h2>
              <p className="measure ml-auto text-lg leading-relaxed text-muted-foreground sm:text-xl">
                {t("storyBody")}
              </p>
            </div>
          </LandingReveal>

          {/* Student scenarios grid for meaningful context and visual density */}
          <LandingReveal>
            <StudentScenarios />
          </LandingReveal>
        </section>

        <section id="how-it-works" data-testid="how-it-works" aria-labelledby="how-title" className="scroll-mt-28 space-y-10">
          <LandingReveal className="grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center lg:gap-14">
            <div className="space-y-3">
              <p className="kicker max-w-xs">{t("howKicker")}</p>
              <h2 id="how-title" className="text-3xl leading-[1.12] sm:text-4xl lg:text-5xl">{t("howTitle")}</h2>
            </div>
            <div className="md:border-l md:border-border/60 md:pl-8">
              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">{t("howIntro")}</p>
            </div>
          </LandingReveal>
          <LandingReveal><InteractiveSteps /></LandingReveal>
          <p className="flex max-w-2xl items-start gap-3 text-sm text-muted-foreground">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-sage-ink" />
            {t("notDiagnosis")}
          </p>
        </section>

        <section className="full-bleed bg-[#18333b] text-[#f3f6f3]" aria-labelledby="evidence-title">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <div className="grid gap-12 lg:grid-cols-[0.72fr_1fr] lg:gap-20">
              <LandingReveal className="space-y-5" data-testid="landing-evidence-intro">
                <p className="kicker kicker-plain !text-[#b8d0c0]">{t("evidenceKicker")}</p>
                <h2 id="evidence-title" className="text-4xl leading-tight sm:text-5xl">{t("evidenceTitle")}</h2>
                <p className="measure leading-relaxed text-[#c9d7d3]">{t("evidenceBody")}</p>
              </LandingReveal>
              <LandingReveal as="ul" stagger data-testid="privacy-points" className="divide-y divide-white/15 border-y border-white/15">
                {evidence.map(({ key, icon: Icon }) => (
                  <LandingRevealItem as="li" key={key} className="landing-evidence-row grid gap-3 py-7 sm:grid-cols-[2.75rem_1fr]">
                    <Icon aria-hidden="true" className="size-6 text-[#b8d0c0] sm:row-span-2 sm:mt-1" />
                    <h3 className="text-2xl text-white">{t(`evidence.${key}.title`)}</h3>
                    <p className="measure leading-relaxed text-[#c9d7d3]">{t(`evidence.${key}.body`)}</p>
                  </LandingRevealItem>
                ))}
              </LandingReveal>
            </div>
          </div>
        </section>

        <section aria-labelledby="results-preview-title" className="grid gap-12 lg:grid-cols-[0.78fr_1fr] lg:items-center lg:gap-20">
          <LandingReveal className="space-y-6">
            <p className="kicker max-w-xs">{t("resultsKicker")}</p>
            <h2 id="results-preview-title" className="text-4xl leading-tight sm:text-5xl">{t("resultsTitle")}</h2>
            <p className="measure text-lg leading-relaxed text-muted-foreground">{t("resultsBody")}</p>
            <div className="flex items-start gap-3 rounded-2xl border bg-sun-soft/60 p-4 text-sm">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-sage-ink" />
              <p>{t("resultsNote")}</p>
            </div>
          </LandingReveal>

          {/* Fully interactive Result Simulator */}
          <LandingReveal>
            <ResultSimulator />
          </LandingReveal>
        </section>

        <section id="features" aria-labelledby="toolkit-title" className="scroll-mt-28 space-y-10">
          <LandingReveal className="grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center lg:gap-14" data-testid="landing-toolkit-intro">
            <div className="space-y-3">
              <p className="kicker max-w-xs">{t("toolkitKicker")}</p>
              <h2 id="toolkit-title" className="text-3xl leading-[1.12] sm:text-4xl lg:text-5xl">{t("toolkitTitle")}</h2>
            </div>
            <div className="md:border-l md:border-border/60 md:pl-8">
              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">{t("toolkitBody")}</p>
            </div>
          </LandingReveal>
          <LandingReveal stagger className="grid items-stretch gap-5 md:grid-cols-2">
            <LandingRevealItem><BreathingPreview /></LandingRevealItem>
            <LandingRevealItem><GroundingPreview /></LandingRevealItem>
          </LandingReveal>
        </section>

        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-28 grid gap-10 lg:grid-cols-[0.62fr_1fr] lg:gap-20">
          <div className="space-y-4 lg:sticky lg:top-32 lg:self-start">
            <p className="kicker max-w-xs">{t("faqKicker")}</p>
            <h2 id="faq-title" className="text-4xl leading-tight sm:text-5xl">{t("faqTitle")}</h2>
            <p className="measure text-muted-foreground">{t("faqIntro")}</p>
          </div>
          {/* Only the list reveals: a transformed wrapper would break the sticky heading. */}
          <LandingReveal stagger className="border-y" data-testid="landing-faq-list">
            {faqs.map((faq, index) => (
              <LandingRevealItem key={faq}>
                <details
                  className="group rounded-2xl border border-transparent p-2 transition-colors hover:border-border/60 hover:bg-card/40 open:border-border open:bg-card/70 open:shadow-xs"
                  data-testid={`landing-faq-${faq}`}
                >
                  <summary className="flex min-h-16 cursor-pointer list-none items-center gap-5 px-3 py-3 font-heading text-xl marker:content-none sm:text-2xl">
                    <span aria-hidden="true" className="numeral text-sm text-sage-ink">0{index + 1}</span>
                    <span className="flex-1">{t(`faq.${faq}.question`)}</span>
                    <span aria-hidden="true" className="text-2xl font-light transition-transform duration-200 group-open:rotate-45">+</span>
                  </summary>
                  <div className="landing-faq-answer">
                    <p className="measure px-3 pb-6 pl-10 leading-relaxed text-muted-foreground">{t(`faq.${faq}.answer`)}</p>
                  </div>
                </details>
              </LandingRevealItem>
            ))}
          </LandingReveal>
        </section>

        <section className="full-bleed -mb-24 overflow-hidden bg-[#18333b] text-[#f3f6f3] sm:-mb-[7.5rem]" aria-labelledby="final-cta-title">
          <LandingReveal className="mx-auto grid max-w-6xl gap-8 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1fr_auto] lg:items-end" data-testid="landing-final-cta">
            <div className="space-y-5">
              <p className="kicker kicker-plain !text-[#b8d0c0]">{t("finalKicker")}</p>
              <h2 id="final-cta-title" className="max-w-4xl text-[clamp(2.8rem,6vw,5.5rem)] leading-[0.98] tracking-[-0.04em]">{t("finalTitle")}</h2>
              <p className="measure text-lg leading-relaxed text-[#c9d7d3]">{t("finalBody")}</p>
            </div>
            <Button asChild size="lg" className="mb-1 bg-[#f5d7a1] text-[#20313b] hover:bg-[#f0c97f]">
              <Link href={PATHS.mulai} data-testid="landing-final-start">
                {t("start")}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </LandingReveal>
        </section>
      </div>
    </MotionProvider>
  );
}
