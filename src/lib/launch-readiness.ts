export type ReadinessInput = {
  contactConfirmed: boolean;
  hoursConfirmed: boolean;
  workingHoursCount: number;
  postalCode: string | null;
};

export type ReadinessIssue = {
  id: "contact" | "hours" | "no_hours" | "postal";
  level: "blocker" | "warning";
  message: string;
};

/** Vad som återstår innan sajten kan gå live (speglar scripts/launch-status.mjs). */
export function evaluateReadiness(input: ReadinessInput): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  if (!input.contactConfirmed) {
    issues.push({ id: "contact", level: "blocker", message: "Kontaktuppgifterna (telefon, adress) är inte bekräftade." });
  }
  if (input.workingHoursCount === 0) {
    issues.push({ id: "no_hours", level: "blocker", message: "Inga arbetstider finns, så öppettider saknas på sajten." });
  } else if (!input.hoursConfirmed) {
    issues.push({ id: "hours", level: "blocker", message: "Öppettiderna är inte bekräftade." });
  }
  if (!input.postalCode) {
    issues.push({ id: "postal", level: "warning", message: "Postnummer saknas (påverkar lokal SEO)." });
  }
  return issues;
}
