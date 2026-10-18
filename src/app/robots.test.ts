import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots.txt", () => {
  it("lets crawlers read the pages but not the API", () => {
    expect(robots().rules).toEqual({ userAgent: "*", allow: "/", disallow: "/api/" });
  });
});
