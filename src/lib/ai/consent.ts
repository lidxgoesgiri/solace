/**
 * No health data: explicit opt-in is scoped to feature, model, and copy
 * version. The tips copy changed when the AI began writing a reflection,
 * so tips consent was asked again; notes consent was not.
 */
export const AI_CONSENT_VERSIONS = { notes: 2, tips: 3 } as const;
export type AiFeature = keyof typeof AI_CONSENT_VERSIONS;
export interface AiConsent {
  version: number;
  feature: AiFeature;
  model: string;
}

export function aiConsent(feature: AiFeature, model: string): AiConsent {
  return { version: AI_CONSENT_VERSIONS[feature], feature, model };
}

export function validAiConsent(value: unknown, feature: AiFeature, model: string): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const consent = value as Record<string, unknown>;
  return consent.version === AI_CONSENT_VERSIONS[feature] && consent.feature === feature && consent.model === model;
}
