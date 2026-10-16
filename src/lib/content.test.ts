import { describe, expect, it } from "vitest";
import {
  COUNTRIES,
  LOCALES,
  SERVICE_TYPES,
  getDass21,
  getSafetyQuestion,
  helpDirectory,
  isTodoPlaceholder,
  servicesFor,
} from "./content";

describe("DASS-21 data (SK-01, SK-02)", () => {
  it.each(LOCALES)("%s has 21 items in the original order", (locale) => {
    const { items } = getDass21(locale);
    expect(items.map((item) => item.number)).toEqual(
      Array.from({ length: 21 }, (_, i) => i + 1),
    );
    for (const item of items) expect(item.text.trim()).not.toBe("");
  });

  it.each(LOCALES)("%s has four options scored 0–3", (locale) => {
    expect(getDass21(locale).options.map((o) => o.value)).toEqual([0, 1, 2, 3]);
  });

  it("English text is final (no placeholders)", () => {
    const en = getDass21("en");
    expect(en.status).toBe("verified");
    for (const text of [en.instructions, ...en.items.map((i) => i.text), ...en.options.map((o) => o.label)]) {
      expect(isTodoPlaceholder(text)).toBe(false);
    }
  });

  it("every Indonesian text is either final or an explicit TODO(verify)", () => {
    const id = getDass21("id");
    const texts = [...id.items.map((i) => i.text), ...id.options.map((o) => o.label)];
    // Until the translator's permission arrives, these are placeholders.
    // Once filled, the status must say so and no placeholder may remain.
    if (id.status === "verified") {
      for (const text of texts) expect(isTodoPlaceholder(text)).toBe(false);
    } else {
      expect(isTodoPlaceholder(id.status)).toBe(true);
    }
  });
});

describe("safety question data (PRD 9.1)", () => {
  it.each(LOCALES)("%s is PHQ-9 item 9 with four options scored 0–3", (locale) => {
    const question = getSafetyQuestion(locale);
    expect(question.instrument).toBe("PHQ-9");
    expect(question.item).toBe(9);
    expect(question.options.map((o) => o.value)).toEqual([0, 1, 2, 3]);
  });

  it("English text is final", () => {
    const en = getSafetyQuestion("en");
    expect(en.status).toBe("verified");
    expect(isTodoPlaceholder(en.text)).toBe(false);
  });
});

describe("help directory (DL-01, DL-02, DL-05, P2)", () => {
  it("defaults to Indonesia and covers ID, US, GB", () => {
    expect(helpDirectory.defaultCountry).toBe("ID");
    expect([...helpDirectory.countries].sort()).toEqual([...COUNTRIES].sort());
  });

  it("only lists public, government, or nonprofit services", () => {
    for (const service of helpDirectory.services) {
      expect(SERVICE_TYPES).toContain(service.type);
    }
  });

  it("every entry has an https source and a verifiedAt field", () => {
    for (const service of helpDirectory.services) {
      expect(service.sourceUrl).toMatch(/^https:\/\//);
      expect("verifiedAt" in service).toBe(true);
      if (service.verifiedAt !== null) {
        expect(service.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("phone numbers are dialable and web links are https", () => {
    for (const service of helpDirectory.services) {
      expect(service.channels.length).toBeGreaterThan(0);
      for (const channel of service.channels) {
        if (channel.kind === "phone") expect(channel.number).toMatch(/^\d+$/);
        else expect(channel.url).toMatch(/^https:\/\//);
      }
    }
  });

  it.each(COUNTRIES)("%s has emergency and support services", (country) => {
    expect(servicesFor(country, "emergency").length).toBeGreaterThan(0);
    expect(servicesFor(country, "support").length).toBeGreaterThan(0);
  });

  it("K6: Indonesia → Healing119, United Kingdom → Samaritans", () => {
    expect(servicesFor("ID", "support").map((s) => s.name)).toContain("Healing119");
    expect(servicesFor("GB", "support").map((s) => s.name)).toContain("Samaritans");
  });

  it("Healing119 lists the website before the phone queue (PRD 9.4)", () => {
    const healing = servicesFor("ID", "support").find((s) => s.id === "id-healing119");
    expect(healing?.channels[0]?.kind).toBe("web");
  });

  it("service ids are unique", () => {
    const ids = helpDirectory.services.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
