import { redirect } from "next/navigation";
import { AdminAuthError, requireAdminAction, type AdminContext, type AdminRole } from "./admin-auth";

function withParam(path: string, key: string, value: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
}

/** Skickar tillbaka till sidan med ett lyckat-meddelande. Kastar (Next redirect). */
export function done(path: string, message: string): never {
  redirect(withParam(path, "ok", message));
}

/** Skickar tillbaka till sidan med ett felmeddelande. Kastar (Next redirect). */
export function fail(path: string, message: string): never {
  redirect(withParam(path, "error", message));
}

/** Första raden i varje server action: kontrollerar inloggning och roll på nytt. */
export async function guardAction(required: AdminRole, failPath: string): Promise<AdminContext> {
  try {
    return await requireAdminAction(required);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      if (err.code === "unauthenticated") redirect("/admin/login");
      fail(failPath, "Du saknar behörighet för den här åtgärden.");
    }
    throw err;
  }
}

export function formObject(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData);
}

export function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Kontrollera uppgifterna.";
}
