import type { SafetyPlanSection } from "@/lib/account/types";

/** Section titles are the six prompts already shown on the crisis screen. */
export const SECTION_TITLE_KEYS: Record<SafetyPlanSection, string> = {
  warningSigns: "planWarningSigns",
  coping: "planCoping",
  distraction: "planDistraction",
  people: "planPeople",
  professionals: "planProfessionals",
  safeEnvironment: "planSafeEnvironment",
};
