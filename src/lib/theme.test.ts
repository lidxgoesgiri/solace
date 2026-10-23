import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY, THEME_TOGGLE_ATTRIBUTE, themeScript } from "./theme";

/** Runs the inline script against small stand-ins for the page APIs it uses. */
function page({
  systemDark,
  storage = new Map<string, string>(),
  denyReads = false,
  denyWrites = false,
  legacyMedia = false,
}: {
  systemDark: boolean;
  storage?: Map<string, string>;
  denyReads?: boolean;
  denyWrites?: boolean;
  legacyMedia?: boolean;
}) {
  const attributes = new Map<string, string>();
  let onClick: ((event: { target: unknown }) => void) | undefined;
  let onAttributeChange: (() => void) | undefined;
  let onSystemChange: (() => void) | undefined;
  let observedAttributes: string[] = [];
  let mutationPending = false;
  let attributeWrites = 0;

  const html = {
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => {
      attributes.set(name, value);
      attributeWrites++;
      if (observedAttributes.includes(name)) mutationPending = true;
    },
    removeAttribute: (name: string) => {
      if (attributes.delete(name) && observedAttributes.includes(name)) mutationPending = true;
    },
  };
  const document = {
    documentElement: html,
    addEventListener: (type: string, listener: typeof onClick) => {
      if (type === "click") onClick = listener;
    },
  };
  const localStorage = {
    getItem: (key: string) => {
      if (denyReads) throw new Error("Storage read denied");
      return storage.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (denyWrites) throw new Error("Storage write denied");
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      if (denyWrites) throw new Error("Storage write denied");
      storage.delete(key);
    },
  };
  const media = {
    matches: systemDark,
    addEventListener: legacyMedia ? undefined : (type: string, listener: () => void) => {
      if (type === "change") onSystemChange = listener;
    },
    addListener: legacyMedia ? (listener: () => void) => {
      onSystemChange = listener;
    } : undefined,
  };
  const window = {
    matchMedia: () => media,
    MutationObserver: class {
      constructor(callback: () => void) {
        onAttributeChange = callback;
      }
      observe(target: unknown, options: { attributes: boolean; attributeFilter: string[] }) {
        if (target === html && options.attributes) observedAttributes = options.attributeFilter;
      }
    },
  };

  new Function("document", "window", "localStorage", themeScript())(document, window, localStorage);

  const toggle = { closest: (selector: string) => (selector === `[${THEME_TOGGLE_ATTRIBUTE}]` ? {} : null) };
  const elsewhere = { closest: () => null };
  return {
    theme: () => attributes.get("data-theme") ?? null,
    stored: () => storage.get(THEME_STORAGE_KEY) ?? null,
    attributeWrites: () => attributeWrites,
    clickSwitch: () => onClick?.({ target: toggle }),
    clickElsewhere: () => onClick?.({ target: elsewhere }),
    changeSystem: (dark: boolean) => {
      media.matches = dark;
      onSystemChange?.();
    },
    removeThemeAttribute: () => html.removeAttribute("data-theme"),
    replaceThemeAttribute: (theme: string) => html.setAttribute("data-theme", theme),
    /** Deliver queued mutations, including any caused by the observer's repair. */
    flushMutations: () => {
      let deliveries = 0;
      while (mutationPending) {
        if (++deliveries > 10) throw new Error("Theme observer did not settle");
        mutationPending = false;
        onAttributeChange?.();
      }
    },
  };
}

describe("theme switch (PRD 6)", () => {
  const systems = [
    { systemDark: false, systemTheme: "light", otherTheme: "dark" },
    { systemDark: true, systemTheme: "dark", otherTheme: "light" },
  ] as const;

  it.each(systems)("synchronously exposes system $systemTheme without saving a choice", ({ systemDark, systemTheme }) => {
    const p = page({ systemDark });
    expect(p.theme()).toBe(systemTheme);
    expect(p.stored()).toBeNull();
  });

  it.each(systems)("follows system changes from $systemTheme until the first choice", ({ systemDark, systemTheme, otherTheme }) => {
    const p = page({ systemDark });
    p.changeSystem(!systemDark);
    expect(p.theme()).toBe(otherTheme);
    expect(p.stored()).toBeNull();

    p.clickSwitch();
    expect(p.theme()).toBe(systemTheme);
    expect(p.stored()).toBe(systemTheme);
    p.changeSystem(systemDark);
    p.changeSystem(!systemDark);
    p.flushMutations();
    expect(p.theme()).toBe(systemTheme);
    expect(p.stored()).toBe(systemTheme);
  });

  it.each(systems)("persists both choices, including matching system $systemTheme", ({ systemDark, systemTheme, otherTheme }) => {
    const p = page({ systemDark });
    p.clickSwitch();
    p.flushMutations();
    expect(p.theme()).toBe(otherTheme);
    expect(p.stored()).toBe(otherTheme);

    p.clickSwitch();
    p.flushMutations();
    expect(p.theme()).toBe(systemTheme);
    expect(p.stored()).toBe(systemTheme);
    p.changeSystem(!systemDark);
    expect(p.theme()).toBe(systemTheme);
    expect(p.stored()).toBe(systemTheme);
  });

  it.each(systems)("restores either choice across reloads with shared storage (system $systemTheme)", ({ systemDark, systemTheme, otherTheme }) => {
    for (const clicks of [1, 2]) {
      const storage = new Map<string, string>();
      const original = page({ systemDark, storage });
      for (let click = 0; click < clicks; click++) original.clickSwitch();
      original.flushMutations();
      const chosen = clicks === 1 ? otherTheme : systemTheme;
      expect(storage.get(THEME_STORAGE_KEY)).toBe(chosen);

      const reloaded = page({ systemDark, storage });
      expect(reloaded.theme()).toBe(chosen);
      const changedSystem = page({ systemDark: !systemDark, storage });
      expect(changedSystem.theme()).toBe(chosen);
      changedSystem.changeSystem(systemDark);
      changedSystem.flushMutations();
      expect(changedSystem.theme()).toBe(chosen);
      expect(changedSystem.stored()).toBe(chosen);
    }
  });

  it.each(systems)("ignores an invalid saved choice and keeps following system $systemTheme", ({ systemDark, systemTheme, otherTheme }) => {
    const storage = new Map([[THEME_STORAGE_KEY, "<script>"]]);
    const p = page({ systemDark, storage });
    expect(p.theme()).toBe(systemTheme);
    p.changeSystem(!systemDark);
    expect(p.theme()).toBe(otherTheme);
    expect(p.stored()).toBe("<script>");
  });

  it.each(systems)("repairs removed or incorrect attributes and settles (system $systemTheme)", ({ systemDark, systemTheme, otherTheme }) => {
    for (const pinned of [false, true]) {
      const p = page({ systemDark });
      if (pinned) p.clickSwitch();
      p.flushMutations();
      const expected = pinned ? otherTheme : systemTheme;

      p.removeThemeAttribute();
      expect(p.theme()).toBeNull();
      const beforeRemovalRepair = p.attributeWrites();
      p.flushMutations();
      expect(p.theme()).toBe(expected);
      expect(p.attributeWrites()).toBe(beforeRemovalRepair + 1);

      p.replaceThemeAttribute(expected === "dark" ? "light" : "dark");
      const beforeReplacementRepair = p.attributeWrites();
      p.flushMutations();
      expect(p.theme()).toBe(expected);
      expect(p.attributeWrites()).toBe(beforeReplacementRepair + 1);
      expect(p.stored()).toBe(pinned ? expected : null);
    }
  });

  it("keeps both choices in memory when storage reads and writes are denied", () => {
    const p = page({ systemDark: true, denyReads: true, denyWrites: true });
    expect(p.theme()).toBe("dark");
    p.clickSwitch();
    p.flushMutations();
    expect(p.theme()).toBe("light");
    p.removeThemeAttribute();
    p.flushMutations();
    p.changeSystem(false);
    p.changeSystem(true);
    expect(p.theme()).toBe("light");
    p.clickSwitch();
    p.flushMutations();
    expect(p.theme()).toBe("dark");
    expect(p.stored()).toBeNull();
  });

  it("does not restore a stale saved choice when a storage write is denied", () => {
    const storage = new Map([[THEME_STORAGE_KEY, "dark"]]);
    const p = page({ systemDark: false, storage, denyWrites: true });
    expect(p.theme()).toBe("dark");
    p.clickSwitch();
    p.flushMutations();
    expect(p.theme()).toBe("light");
    p.removeThemeAttribute();
    p.flushMutations();
    p.changeSystem(true);
    expect(p.theme()).toBe("light");
    expect(p.stored()).toBe("dark");
  });

  it("follows system changes through the legacy media listener", () => {
    const p = page({ systemDark: false, legacyMedia: true });
    p.changeSystem(true);
    expect(p.theme()).toBe("dark");
    expect(p.stored()).toBeNull();
  });

  it("reacts only to the switch", () => {
    const p = page({ systemDark: false });
    p.clickElsewhere();
    expect(p.theme()).toBe("light");
    expect(p.stored()).toBeNull();
  });
});

describe("dark palette", () => {
  const css = readFileSync("src/app/globals.css", "utf8");

  function declarations(selectorStart: string): string[] {
    const start = css.indexOf(selectorStart);
    expect(start, selectorStart).toBeGreaterThan(-1);
    const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
    return body
      .split(";")
      .map((line) => line.replace(/\/\*[\s\S]*?\*\//g, "").trim())
      .filter((line) => line.startsWith("--"));
  }

  it("is the same for the system setting and for the switch", () => {
    const system = declarations(':root:not([data-theme="light"]) {');
    const pinned = declarations(':root[data-theme="dark"] {');
    expect(system.length).toBeGreaterThan(20);
    expect(pinned).toEqual(system);
  });
});
