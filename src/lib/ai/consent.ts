/** No health data: explicit opt-in is scoped to feature, model, and copy version. */
export const AI_CONSENT_VERSION = 2;
export type AiFeature = "notes" | "tips";
export interface AiConsent {
  version: number;
  feature: AiFeature;
  model: string;
}

export function aiConsent(feature: AiFeature, model: string): AiConsent {
  return { version: AI_CONSENT_VERSION, feature, model };
}

export function validAiConsent(value: unknown, feature: AiFeature, model: string): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const consent = value as Record<string, unknown>;
  return consent.version === AI_CONSENT_VERSION && consent.feature === feature && consent.model === model;
}
