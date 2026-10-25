import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import id from "../../messages/id.json";

type Messages = { [key: string]: string | Messages };

/** Flattens nested messages into "a.b.c" → value. */
function flatten(messages: Messages, prefix = ""): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of Object.entries(messages)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      result.set(path, value);
    } else {
      for (const [nestedKey, nestedValue] of flatten(value, path)) {
        result.set(nestedKey, nestedValue);
      }
    }
  }
  return result;
}

/** ICU argument names, e.g. "Score {score} of 42" → ["score"]. */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? "").sort();
}

const flatId = flatten(id as Messages);
const flatEn = flatten(en as Messages);

describe("messages (PRD 14: no missing keys in ID or EN)", () => {
  it("id.json and en.json have identical keys", () => {
    expect([...flatId.keys()].sort()).toEqual([...flatEn.keys()].sort());
  });

  it("no message is empty", () => {
    for (const [key, value] of [...flatId, ...flatEn]) {
      expect(value.trim(), key).not.toBe("");
    }
  });

  it("both languages use the same placeholders for every key", () => {
    for (const [key, value] of flatId) {
      expect(placeholders(value), key).toEqual(placeholders(flatEn.get(key) ?? ""));
    }
  });

  it("UI text never claims a diagnosis (PRD 17)", () => {
    for (const value of flatId.values()) expect(value).not.toMatch(/kamu mengidap/i);
    for (const value of flatEn.values()) expect(value).not.toMatch(/you (have|suffer from) (depression|an anxiety disorder)/i);
  });

  it("keeps the required footer disclaimer (GL-04)", () => {
    expect(flatId.get("footer.disclaimer")).toBe("Solace adalah alat skrining, bukan diagnosis.");
  });

  it("credits the developer in the copyright line, with the name as the only link", () => {
    expect(flatId.get("footer.copyright")).toBe("© 2026 Solace · Ruang aman kesehatan mental mahasiswa. Diciptakan oleh <author>Ida Bagus Giri Krisnabhawa</author>.");
    expect(flatEn.get("footer.copyright")).toBe("© 2026 Solace · A safe space for student mental health. Created by <author>Ida Bagus Giri Krisnabhawa</author>.");
  });
});
