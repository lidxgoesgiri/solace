import { describe, expect, it } from "vitest";
import { localDay, newlySevere, reminderDue, snoozeUntil, trendBetween } from "./history";
import { scoreDass21, type AnswerValue } from "./scoring";

const result = (value: AnswerValue) => scoreDass21(Array(21).fill(value))!;
const NOW = new Date("2026-10-31T12:00:00.000Z");

describe("re-screening reminder (RW-03)", () => {
  it("appears 14 days after the last screening", () => {
    expect(reminderDue("2026-10-18T12:00:00.000Z", NOW, null)).toBe(false); // 13 days
    expect(reminderDue("2026-10-17T12:00:00.000Z", NOW, null)).toBe(true); // 14 days
    expect(reminderDue(null, NOW, null)).toBe(false);
  });

  it("can be put off for a week", () => {
    const until = snoozeUntil(NOW);
    expect(Date.parse(until) - NOW.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    expect(reminderDue("2026-10-01T12:00:00.000Z", NOW, until)).toBe(false);
    expect(
      reminderDue("2026-10-01T12:00:00.000Z", new Date("2026-11-08T12:00:00.000Z"), until),
    ).toBe(true);
  });
});

describe("trend feedback (RW-02)", () => {
  it("compares categories, not raw numbers", () => {
    const trend = trendBetween(result(1), result(2));
    expect(trend.depression).toEqual({ from: "moderate", to: "extremely_severe", direction: "up" });
    expect(trend.stress).toEqual({ from: "normal", to: "severe", direction: "up" });
    expect(trendBetween(result(2), result(0)).anxiety.direction).toBe("down");
    expect(trendBetween(result(1), result(1)).anxiety.direction).toBe("same");
  });
});

describe("worsening warning (RW-05)", () => {
  it("names subscales that rose into severe or above", () => {
    expect(newlySevere(result(1), result(2))).toEqual(["depression", "anxiety", "stress"]);
    expect(newlySevere(result(2), result(3))).toEqual(["stress"]);
    expect(newlySevere(result(2), result(2))).toEqual([]);
    expect(newlySevere(result(3), result(1))).toEqual([]);
  });
});

describe("check-in day (RW-04)", () => {
  it("uses the local calendar day", () => {
    expect(localDay(new Date(2026, 9, 5, 23, 59))).toBe("2026-10-05");
    expect(localDay(new Date(2026, 0, 1, 0, 0))).toBe("2026-01-01");
  });
});
