import { db } from "./db";

const TIMEOUT_MS = 3000;

/** true om databasen svarar i tid. Detaljer om fel loggas men lämnas aldrig ut. */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    const query = db().from("shop_settings").select("id").eq("id", 1).maybeSingle();
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS));
    const { error } = await Promise.race([query, timeout]);
    if (error) console.error("Hälsokontroll: databasfel:", error.message);
    return !error;
  } catch (err) {
    console.error("Hälsokontroll misslyckades:", err instanceof Error ? err.message : err);
    return false;
  }
}
