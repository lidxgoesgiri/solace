import { describe, expect, it } from "vitest";
import { buttonVariants } from "./button";

/**
 * cn() joins classes without Tailwind conflict merging (PRD 14 budget), so
 * when two classes set the same property the stylesheet order wins, not
 * the order in the code. A button look must set each property once.
 */
const GROUPS: [string, RegExp][] = [
  ["font size", /^text-(xs|sm|base|lg|xl|\dxl)$/],
  ["text colour", /^text-(?!(xs|sm|base|lg|xl|\dxl|left|center|right)$)/],
  ["background", /^bg-(?!clip-)/],
  ["border colour", /^border-(?!\d|[xytrbl]-|[xytrbl]$|solid|dashed)/],
  ["min height", /^min-h-/],
  ["padding x", /^px-/],
  ["padding y", /^py-/],
  ["gap", /^gap-/],
];

const VARIANTS = ["default", "outline", "ghost", "destructive", "warm"] as const;
const SIZES = ["default", "sm", "lg"] as const;

describe("button looks", () => {
  it.each(VARIANTS.flatMap((variant) => SIZES.map((size) => [variant, size] as const)))(
    "%s/%s sets each property once",
    (variant, size) => {
      // Only unprefixed classes compete; hover:, focus-visible: etc. layer on top.
      const classes = buttonVariants({ variant, size }).split(/\s+/).filter((c) => !c.includes(":"));
      for (const [group, pattern] of GROUPS) {
        expect(classes.filter((c) => pattern.test(c)), group).toHaveLength(
          classes.some((c) => pattern.test(c)) ? 1 : 0,
        );
      }
    },
  );

  it("every look has a visible or deliberately transparent border colour", () => {
    for (const variant of VARIANTS) {
      const classes = buttonVariants({ variant }).split(/\s+/);
      expect(classes.some((c) => /^border-(?!\d)/.test(c)), variant).toBe(true);
    }
  });
});
