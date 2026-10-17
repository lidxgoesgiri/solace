"use client";

import { useTranslations } from "next-intl";
import { SECTION_TITLE_KEYS } from "@/components/safety-plan/sections";
import { Link } from "@/i18n/navigation";
import { SAFETY_PLAN_SECTIONS, type StoredRecord } from "@/lib/account/types";
import { PATHS } from "@/lib/flow";
import { useAccountRecords, useAccountUsername } from "@/store/account-store";

/**
 * SP-02: a signed-in user's own safety plan on the crisis screen. It is read
 * from memory only: the crisis screen never sends or fetches anything
 * (PRD 9.6), so the plan shows when it was already opened this session.
 */
export function CrisisPlanPanel() {
  const t = useTranslations("plan");
  const crisis = useTranslations("crisis");
  const username = useAccountUsername();
  const records = useAccountRecords();
  const plan = username
    ? records?.find(
        (record): record is StoredRecord<"safety_plan"> => record.kind === "safety_plan",
      )
    : undefined;
  if (!plan) return null;

  const filled = SAFETY_PLAN_SECTIONS.filter((section) => plan.value.sections[section]?.trim());
  if (filled.length === 0) return null;

  return (
    <div
      className="space-y-4 rounded-2xl border border-sage bg-sage-soft p-5"
      data-testid="crisis-own-plan"
    >
      <p className="font-heading text-xl">{t("crisisYourPlan")}</p>
      <dl className="space-y-3">
        {filled.map((section) => (
          <div key={section}>
            <dt className="text-sm font-semibold">
              {crisis(SECTION_TITLE_KEYS[section] as "planCoping")}
            </dt>
            <dd className="whitespace-pre-line">{plan.value.sections[section]}</dd>
          </div>
        ))}
      </dl>
      <Link
        href={PATHS.rencana}
        className="text-sm font-medium text-primary underline underline-offset-4"
      >
        {t("crisisEditPlan")}
      </Link>
    </div>
  );
}
