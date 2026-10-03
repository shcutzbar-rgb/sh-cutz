import { describe, expect, it } from "vitest";
import { retentionCutoff } from "./retention";

describe("retentionCutoff", () => {
  it("räknar 12 månader bakåt som standard", () => {
    expect(retentionCutoff(new Date("2026-10-03T12:00:00Z")).toISOString()).toBe("2025-10-03T12:00:00.000Z");
  });

  it("stöder annat antal månader och årsskifte", () => {
    expect(retentionCutoff(new Date("2026-02-15T00:00:00Z"), 3).toISOString()).toBe("2025-11-15T00:00:00.000Z");
  });

  it("muterar inte indatan", () => {
    const now = new Date("2026-10-03T12:00:00Z");
    retentionCutoff(now);
    expect(now.toISOString()).toBe("2026-10-03T12:00:00.000Z");
  });
});
