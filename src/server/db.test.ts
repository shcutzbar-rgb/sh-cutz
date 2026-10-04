import { afterEach, describe, expect, it, vi } from "vitest";
import { BookingError } from "./errors";

vi.mock("@/lib/supabase", () => ({ createServiceClient: vi.fn() }));

import { db } from "./db";

describe("db", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a useful configuration error when server Supabase credentials are missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    expect(() => db()).toThrowError(
      new BookingError(
        "unavailable",
        "Onlinebokning är inte konfigurerad i den här miljön. Kontakta verksamhetens administratör.",
        503,
      ),
    );
  });
});