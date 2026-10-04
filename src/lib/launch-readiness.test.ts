import { describe, expect, it } from "vitest";
import { evaluateReadiness } from "./launch-readiness";

const ready = { contactConfirmed: true, hoursConfirmed: true, workingHoursCount: 6, postalCode: "116 31" };

describe("evaluateReadiness", () => {
  it("ger inga anmärkningar när allt är bekräftat", () => {
    expect(evaluateReadiness(ready)).toEqual([]);
  });

  it("blockerar på obekräftade kontaktuppgifter och öppettider", () => {
    const ids = evaluateReadiness({ ...ready, contactConfirmed: false, hoursConfirmed: false }).map((i) => i.id);
    expect(ids).toEqual(["contact", "hours"]);
  });

  it("blockerar utan arbetstider och nämner inte bekräftelse i det fallet", () => {
    const issues = evaluateReadiness({ ...ready, workingHoursCount: 0, hoursConfirmed: false });
    expect(issues.map((i) => i.id)).toEqual(["no_hours"]);
    expect(issues[0].level).toBe("blocker");
  });

  it("varnar bara för saknat postnummer", () => {
    expect(evaluateReadiness({ ...ready, postalCode: null })).toEqual([
      { id: "postal", level: "warning", message: expect.any(String) },
    ]);
  });
});
