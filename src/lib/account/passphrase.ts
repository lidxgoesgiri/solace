/**
 * Passphrase rules (AK-01): at least 12 characters, with a simple strength
 * estimate shown as words, not only colour. Pure, so it is unit-tested.
 */

export const PASSPHRASE_MIN_LENGTH = 12;

export type PassphraseStrength = "too_short" | "weak" | "fair" | "strong";

const COMMON = ["password", "passphrase", "123456", "qwerty", "solace", "katasandi", "rahasia"];

export function passphraseStrength(passphrase: string): PassphraseStrength {
  const value = passphrase.normalize("NFKC");
  if ([...value].length < PASSPHRASE_MIN_LENGTH) return "too_short";

  const lower = value.toLowerCase();
  const words = lower.split(/\s+/).filter((word) => word.length >= 3);
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9\s]/].filter((re) => re.test(value)).length;
  const unique = new Set(lower.replace(/\s/g, "")).size;

  if (unique < 6 || COMMON.some((word) => lower.includes(word)) || /(.)\1{3,}/.test(lower))
    return "weak";

  let score = 0;
  if ([...value].length >= 16) score += 1;
  if ([...value].length >= 24) score += 1;
  if (words.length >= 3) score += 1;
  if (words.length >= 4) score += 1;
  if (classes >= 3) score += 1;
  if (score >= 3) return "strong";
  if (score >= 1) return "fair";
  return "weak";
}

/** Strong enough to accept: long enough and not weak. */
export function isAcceptablePassphrase(passphrase: string): boolean {
  const strength = passphraseStrength(passphrase);
  return strength === "fair" || strength === "strong";
}
