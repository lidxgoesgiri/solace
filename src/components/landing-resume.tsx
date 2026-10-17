"use client";

import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import { EASE_CALM, fadeUp } from "@/components/motion/tokens";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import {
  PATHS,
  answeredCount,
  hasDraft,
  isScreeningFinished,
  resumePath,
} from "@/lib/flow";
import { DASS21_ITEM_COUNT } from "@/lib/scoring";
import { useFlow, useFlowDispatch, useFlowHydrated } from "@/store/flow-store";

const RING_RADIUS = 26;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** How far the saved screening got; the text beside it says the same. */
function ProgressRing({ answered }: { answered: number }) {
  return (
    <svg viewBox="0 0 64 64" className="size-20 -rotate-90" aria-hidden="true">
      <circle
        cx="32"
        cy="32"
        r={RING_RADIUS}
        fill="none"
        strokeWidth="5"
        className="stroke-sky-soft"
      />
      <m.circle
        cx="32"
        cy="32"
        r={RING_RADIUS}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        className="stroke-primary"
        strokeDasharray={RING_LENGTH}
        initial={{ strokeDashoffset: RING_LENGTH }}
        animate={{
          strokeDashoffset: RING_LENGTH * (1 - answered / DASS21_ITEM_COUNT),
        }}
        transition={{ duration: 0.9, ease: EASE_CALM, delay: 0.15 }}
      />
      <text
        x="32"
        y="32"
        dominantBaseline="central"
        textAnchor="middle"
        transform="rotate(90 32 32)"
        className="fill-ink font-heading text-[15px] font-medium"
      >
        {answered}/{DASS21_ITEM_COUNT}
      </text>
    </svg>
  );
}

/** Continue an unfinished screening or reopen the last result (SK-05). */
export function LandingResume() {
  const t = useTranslations("landing");
  const hydrated = useFlowHydrated();
  const flow = useFlow();
  const dispatch = useFlowDispatch();
  const router = useRouter();

  if (!hydrated) return null;

  if (hasDraft(flow)) {
    return (
      <m.section
        data-testid="resume-card"
        aria-labelledby="resume-title"
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="surface grid gap-5 p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-8 sm:p-8"
      >
        <ProgressRing answered={answeredCount(flow)} />
        <div className="space-y-3">
          <h2 id="resume-title" className="text-2xl">
            {t("resumeTitle")}
          </h2>
          <p className="text-muted-foreground">
            {t("resumeBody", { answered: answeredCount(flow) })}
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild>
              <Link href={resumePath(flow)} data-testid="resume-screening">
                {t("resume")}
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              data-testid="restart-screening"
              onClick={() => {
                dispatch({ type: "CLEAR_DEVICE_DATA" });
                router.push(PATHS.mulai);
              }}
            >
              {t("restart")}
            </Button>
          </div>
        </div>
      </m.section>
    );
  }

  if (isScreeningFinished(flow)) {
    return (
      <m.section
        data-testid="last-result-card"
        aria-labelledby="last-result-title"
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="surface space-y-3 p-6 sm:p-8"
      >
        <h2 id="last-result-title" className="text-2xl">
          {t("lastResultTitle")}
        </h2>
        <p className="text-muted-foreground">{t("lastResultBody")}</p>
        <Button asChild variant="outline">
          <Link href={PATHS.hasil} data-testid="view-results">
            {t("viewResults")}
          </Link>
        </Button>
      </m.section>
    );
  }

  return null;
}
