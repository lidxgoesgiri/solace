import { describe, expect, it } from "vitest";
import { breathAt, shouldPulse } from "./breathing";

describe("TP-05: elapsed-time breathing clock", () => {
  it("counts every second of a complete 4/6 cycle and starts the next inhale without a hold", () => {
    expect(Array.from({ length: 11 }, (_, second) => {
      const { phase, seconds } = breathAt(second * 1_000);
      return [phase, seconds];
    })).toEqual([
      ["in", 4], ["in", 3], ["in", 2], ["in", 1],
      ["out", 6], ["out", 5], ["out", 4], ["out", 3], ["out", 2], ["out", 1],
      ["in", 4],
    ]);
  });

  it.each([
    [0, "in", 4, 0], [999, "in", 4, 0], [1_000, "in", 3, 0],
    [3_999, "in", 1, 0], [4_000, "out", 6, 1], [9_999, "out", 1, 1],
    [10_000, "in", 4, 2], [64_500, "out", 6, 13],
  ])("at %i ms: phase %s, countdown %i, segment %i", (elapsed, phase, seconds, segment) => {
    expect(breathAt(elapsed)).toEqual({ phase, seconds, segment });
  });

  it("catches up immediately after lag, without adding a hold phase", () => {
    expect(breathAt(36_200)).toEqual({ phase: "out", seconds: 4, segment: 7 });
    expect(breathAt(-10)).toEqual(breathAt(0));
    expect(breathAt(Number.NaN)).toEqual(breathAt(0));
  });

  it("only pulses at a recent single phase boundary", () => {
    expect(shouldPulse(0, 1, 100)).toBe(true);
    expect(shouldPulse(1, 1, 100)).toBe(false);
    expect(shouldPulse(0, 3, 100)).toBe(false);
    expect(shouldPulse(0, 1, 800)).toBe(false);
  });
});
