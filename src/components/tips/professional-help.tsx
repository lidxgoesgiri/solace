"use client";

import { useTranslations } from "next-intl";
import { Download } from "@/components/icons/download";
import { HeartHandshake } from "@/components/icons/heart-handshake";
import { LifeBuoy } from "@/components/icons/life-buoy";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { PATHS } from "@/lib/flow";
import { cn } from "@/lib/utils";
import { useFlowDispatch } from "@/store/flow-store";

/**
 * "When and where to get professional help" (TP-03), in every plan and at
 * the top for severe results. Places are kinds of public services, never a
 * named clinic or practice (DL-04, DL-05).
 */
export function ProfessionalHelp({
  emphasis,
  canReport,
}: {
  emphasis: boolean;
  canReport: boolean;
}) {
  const t = useTranslations("tips");
  const pathname = usePathname();
  const dispatch = useFlowDispatch();
  return (
    <section
      aria-labelledby="professional-title"
      data-testid="professional-help"
      data-emphasis={emphasis}
      className={cn(
        "space-y-4 rounded-3xl border p-6 sm:p-8",
        emphasis ? "border-sev-severe-edge bg-sev-severe shadow-(--shadow-soft)" : "bg-card",
      )}
    >
      <h2 id="professional-title" className="flex items-center gap-3 text-2xl sm:text-3xl">
        <HeartHandshake aria-hidden="true" className="size-6 shrink-0 text-sage-ink" />
        {t("professionalTitle")}
      </h2>
      <p className="measure leading-relaxed">{t("professionalBody")}</p>
      <div className="space-y-2">
        <p className="font-medium">{t("professionalWhere")}</p>
        <ul className="space-y-1.5" data-testid="non-crisis-services">
          {(["placePuskesmas", "placeCampus", "placePsychologist"] as const).map((key) => (
            <li key={key} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-2 size-1.5 shrink-0 rounded-full bg-sage-ink"
              />
              {t(key)}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-3">
        {canReport ? (
          <Button asChild>
            <Link href={PATHS.laporan} data-testid="tips-download-report">
              <Download aria-hidden="true" />
              {t("professionalReport")}
            </Link>
          </Button>
        ) : null}
        {/* The label is long; on a phone it wraps instead of widening the page. */}
        <Button asChild variant="outline" className="max-w-full">
          <Link
            href={PATHS.krisis}
            data-testid="tips-help-now"
            onClick={() => dispatch({ type: "REQUEST_HELP", from: pathname })}
          >
            <LifeBuoy aria-hidden="true" />
            {t("professionalUrgent")}
          </Link>
        </Button>
      </div>
    </section>
  );
}
