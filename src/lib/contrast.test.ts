import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

/** The value of a custom property in the block that starts with `selector {`. */
function cssVar(selector: string, name: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThan(-1);
  const body = css.slice(start, css.indexOf("}", start));
  const match = body.match(new RegExp(`${name}:\\s*([^;]+);`));
  expect(match, `${name} in ${selector}`).not.toBeNull();
  return match![1]!.trim();
}

type Rgb = [number, number, number];

function hex(value: string): Rgb {
  const h = value.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

/** `rgb(r g b / a)` laid over an opaque background. */
function over(value: string, background: Rgb): Rgb {
  const [r, g, b, a] = value.match(/[\d.]+/g)!.map(Number) as [number, number, number, number];
  return [r, g, b].map((c, i) => c * a + background[i]! * (1 - a)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe("breathing pacer label contrast (WCAG 1.4.3, PRD 14)", () => {
  it.each([
    ["light", ":root", ":root"],
    ["dark (system)", ':root:not([data-theme="light"])', ':root:not([data-theme="light"])'],
    ["dark (switch)", ':root[data-theme="dark"]', ':root[data-theme="dark"]'],
  ])("%s: the label on the circle reaches 4.5:1", (_mode, block) => {
    const card = hex(cssVar(block, "--card"));
    const ink = hex(cssVar(block, "--brand-ink"));
    const fill = over(cssVar(block, "--pacer-fill"), card);
    expect(contrast(ink, fill)).toBeGreaterThanOrEqual(4.5);
  });
});
