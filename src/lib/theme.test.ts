import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY, THEME_TOGGLE_ATTRIBUTE, themeScript } from "./theme";

/** Runs the inline script against small stand-ins for the page APIs it uses. */
function page({ systemDark, stored }: { systemDark: boolean; stored?: string }) {
  const attributes = new Map<string, string>();
  const storage = new Map<string, string>(stored ? [[THEME_STORAGE_KEY, stored]] : []);
  let onClick: ((event: { target: unknown }) => void) | undefined;
  let onAttributeChange: (() => void) | undefined;

  const html = {
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => void attributes.set(name, value),
    removeAttribute: (name: string) => void attributes.delete(name),
  };
  const document = {
    documentElement: html,
    addEventListener: (type: string, listener: typeof onClick) => {
      if (type === "click") onClick = listener;
    },
  };
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
  };
  const window = {
    matchMedia: () => ({ matches: systemDark }),
    MutationObserver: class {
      constructor(callback: () => void) {
        onAttributeChange = callback;
      }
      observe() {}
    },
  };

  new Function("document", "window", "localStorage", themeScript())(document, window, localStorage);

  const toggle = { closest: (selector: string) => (selector === `[${THEME_TOGGLE_ATTRIBUTE}]` ? {} : null) };
  const elsewhere = { closest: () => null };
  return {
    theme: () => attributes.get("data-theme") ?? null,
    stored: () => storage.get(THEME_STORAGE_KEY) ?? null,
    clickSwitch: () => onClick?.({ target: toggle }),
    clickElsewhere: () => onClick?.({ target: elsewhere }),
    /** What React does to <html> when the language changes. */
    reRenderHtml: () => {
      attributes.delete("data-theme");
      onAttributeChange?.();
    },
  };
}

describe("theme switch (PRD 6)", () => {
  it("follows the system until the user picks a mode", () => {
    expect(page({ systemDark: false }).theme()).toBeNull();
    expect(page({ systemDark: true }).theme()).toBeNull();
  });

  it("pins the other mode and remembers it on this device", () => {
    const light = page({ systemDark: false });
    light.clickSwitch();
    expect(light.theme()).toBe("dark");
    expect(light.stored()).toBe("dark");

    const dark = page({ systemDark: true });
    dark.clickSwitch();
    expect(dark.theme()).toBe("light");
    expect(dark.stored()).toBe("light");
  });

  it("switching back to the system's mode follows the system again", () => {
    const p = page({ systemDark: false });
    p.clickSwitch();
    p.clickSwitch();
    expect(p.theme()).toBeNull();
    expect(p.stored()).toBeNull();
  });

  it("applies a remembered mode before the page paints, and ignores anything else", () => {
    expect(page({ systemDark: false, stored: "dark" }).theme()).toBe("dark");
    expect(page({ systemDark: true, stored: "light" }).theme()).toBe("light");
    expect(page({ systemDark: false, stored: "<script>" }).theme()).toBeNull();
  });

  it("keeps a pinned mode when the page re-renders <html> (language switch)", () => {
    const p = page({ systemDark: true });
    p.clickSwitch();
    expect(p.theme()).toBe("light");
    p.reRenderHtml();
    expect(p.theme()).toBe("light");

    const following = page({ systemDark: true });
    following.reRenderHtml();
    expect(following.theme()).toBeNull();
  });

  it("reacts only to the switch", () => {
    const p = page({ systemDark: false });
    p.clickElsewhere();
    expect(p.theme()).toBeNull();
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
