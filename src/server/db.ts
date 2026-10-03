import { createServiceClient } from "@/lib/supabase";
import { BookingError } from "./errors";

export const UNAVAILABLE_MESSAGE = "Bokning är tillfälligt otillgänglig.";

export function db() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new BookingError("unavailable", UNAVAILABLE_MESSAGE, 503);
  }
  return createServiceClient();
}

export function failOnError(error: { message: string } | null) {
  if (error) {
    console.error("Databasfel:", error.message);
    throw new BookingError("unavailable", UNAVAILABLE_MESSAGE, 503);
  }
}
