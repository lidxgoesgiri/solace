"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import {
  PATHS,
  answeredCount,
  hasDraft,
  isScreeningFinished,
  resumePath,
} from "@/lib/flow";
import { useFlow, useFlowDispatch, useFlowHydrated } from "@/store/flow-store";

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
      <section
        data-testid="resume-card"
        aria-labelledby="resume-title"
        className="space-y-3 rounded-2xl border bg-sky-soft p-5"
      >
        <h2 id="resume-title" className="text-xl">
          {t("resumeTitle")}
        </h2>
        <p>{t("resumeBody", { answered: answeredCount(flow) })}</p>
        <div className="flex flex-wrap gap-3">
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
      </section>
    );
  }

  if (isScreeningFinished(flow)) {
    return (
      <section
        data-testid="last-result-card"
        aria-labelledby="last-result-title"
        className="space-y-3 rounded-2xl border bg-sage-soft p-5"
      >
        <h2 id="last-result-title" className="text-xl">
          {t("lastResultTitle")}
        </h2>
        <p>{t("lastResultBody")}</p>
        <Button asChild variant="outline">
          <Link href={PATHS.hasil} data-testid="view-results">
            {t("viewResults")}
          </Link>
        </Button>
      </section>
    );
  }

  return null;
}
