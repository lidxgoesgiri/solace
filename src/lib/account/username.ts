/** 3–32 characters: lower-case letters, digits, dot, dash, underscore. No email (AK-01). */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

/** NFKC, trimmed, lower case; null when it does not fit the pattern. */
export function normalizeUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const username = value.normalize("NFKC").trim().toLowerCase();
  return USERNAME_PATTERN.test(username) ? username : null;
}
