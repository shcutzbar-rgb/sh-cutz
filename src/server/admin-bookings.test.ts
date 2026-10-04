import { beforeEach, describe, expect, it, vi } from "vitest";
import { canChangeStatus } from "@/lib/booking-rules";
import type { AdminContext } from "./admin-auth";

const state = vi.hoisted(() => ({
  row: null as Record<string, unknown> | null,
  updateRows: [{ id: "b1" }] as unknown[],
  updateError: null as { code?: string; message: string } | null,
  updates: [] as Record<string, unknown>[],
  availabilityCalls: [] as unknown[][],
  slots: [] as Date[],
}));

vi.mock("./availability", () => ({
  getAvailability: async (...args: unknown[]) => {
    state.availabilityCalls.push(args);
    return {
      service: { id: "s1", name: "Fade", durationMinutes: 30, priceSek: 350 },
      barber: { id: "b2", name: "Shabir" },
      slots: state.slots,
    };
  },
}));

import { changeBookingStatus, moveBooking, sanitizeSearch } from "./admin-bookings";

const admin = {
  userId: "u1",
  email: "a@example.com",
  role: "staff",
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.row, error: null }) }) }),
      update: (values: Record<string, unknown>) => {
        state.updates.push(values);
        const chain = {
          eq: () => chain,
          in: () => chain,
          select: async () => ({ data: state.updateRows, error: state.updateError }),
        };
        return chain;
      },
    }),
  },
} as unknown as AdminContext;

const now = new Date("2026-10-12T06:00:00Z");
const row = (over: Record<string, unknown> = {}) => ({
  id: "b1",
  status: "confirmed",
  start_at: "2026-10-12T08:00:00Z",
  end_at: "2026-10-12T08:30:00Z",
  barber_id: "b1",
  service_id: "s1",
  customer_name: "Anna",
  customer_phone: "070",
  customer_email: "anna@example.com",
  notes: null,
  services: { name: "Fade", price_sek: 350, duration_minutes: 30 },
  barbers: { name: "Shabir" },
  ...over,
});

beforeEach(() => {
  Object.assign(state, {
    row: row(),
    updateRows: [{ id: "b1" }],
    updateError: null,
    updates: [],
    availabilityCalls: [],
    slots: [],
  });
});

describe("canChangeStatus", () => {
  const past = new Date("2026-10-12T05:00:00Z");
  const future = new Date("2026-10-12T08:00:00Z");

  it("tillåter de definierade övergångarna", () => {
    expect(canChangeStatus("pending", "confirmed", future, now).ok).toBe(true);
    expect(canChangeStatus("pending", "cancelled", future, now).ok).toBe(true);
    expect(canChangeStatus("confirmed", "cancelled", future, now).ok).toBe(true);
    expect(canChangeStatus("confirmed", "completed", past, now).ok).toBe(true);
    expect(canChangeStatus("confirmed", "no_show", past, now).ok).toBe(true);
  });

  it("nekar övergångar från slutstatus och ogiltiga hopp", () => {
    for (const from of ["cancelled", "completed", "no_show"] as const) {
      expect(canChangeStatus(from, "confirmed", past, now).ok).toBe(false);
    }
    expect(canChangeStatus("pending", "completed", past, now).ok).toBe(false);
    expect(canChangeStatus("confirmed", "pending", past, now).ok).toBe(false);
  });

  it("kräver att tiden startat för genomförd och no-show", () => {
    expect(canChangeStatus("confirmed", "completed", future, now)).toMatchObject({ ok: false });
    expect(canChangeStatus("confirmed", "no_show", future, now)).toMatchObject({ ok: false });
  });
});

describe("changeBookingStatus", () => {
  it("avbokar och returnerar bokningen för mejlet", async () => {
    const result = await changeBookingStatus(admin, "b1", "cancelled", now);
    expect(result).toMatchObject({ ok: true, booking: { status: "cancelled", customerEmail: "anna@example.com" } });
    expect(state.updates).toEqual([{ status: "cancelled" }]);
  });

  it("uppdaterar inte vid otillåten övergång", async () => {
    state.row = row({ status: "cancelled" });
    expect(await changeBookingStatus(admin, "b1", "confirmed", now)).toMatchObject({ ok: false });
    expect(state.updates).toHaveLength(0);
  });

  it("hanterar okänd bokning och samtidig ändring", async () => {
    state.row = null;
    expect(await changeBookingStatus(admin, "x", "cancelled", now)).toMatchObject({ ok: false });
    state.row = row();
    state.updateRows = [];
    expect(await changeBookingStatus(admin, "b1", "cancelled", now)).toMatchObject({ ok: false });
  });
});

describe("moveBooking", () => {
  const target = "2026-10-13T09:00:00.000Z";

  it("flyttar till ledig tid med samma slot-logik, utan att blockera sig själv", async () => {
    state.slots = [new Date(target)];
    state.row = row({ barbers: { name: "Ali" } });
    const result = await moveBooking(admin, { bookingId: "b1", barberId: "b2", startAt: target }, now);

    expect(result).toMatchObject({
      ok: true,
      booking: { barberId: "b2", barberName: "Shabir" },
      previous: { barberName: "Ali", startAt: new Date("2026-10-12T08:00:00Z") },
    });
    expect(state.updates).toEqual([
      {
        start_at: target,
        end_at: "2026-10-13T09:30:00.000Z",
        barber_id: "b2",
        reminder_sent_at: null,
      },
    ]);
    const [params, , options] = state.availabilityCalls[0] as [Record<string, string>, Date, Record<string, unknown>];
    expect(params).toMatchObject({ serviceId: "s1", barberId: "b2", date: "2026-10-13" });
    expect(options).toEqual({ excludeBookingId: "b1", adminOverride: true });
  });

  it("nekar tid som inte finns bland lediga slots", async () => {
    state.slots = [new Date("2026-10-13T10:00:00.000Z")];
    const result = await moveBooking(admin, { bookingId: "b1", barberId: "b2", startAt: target }, now);
    expect(result).toMatchObject({ ok: false });
    expect(state.updates).toHaveLength(0);
  });

  it("översätter exclusion constraint-fel till begripligt svar", async () => {
    state.slots = [new Date(target)];
    state.updateRows = [];
    state.updateError = { code: "23P01", message: "conflicting key value violates exclusion constraint" };
    expect(await moveBooking(admin, { bookingId: "b1", barberId: "b2", startAt: target }, now)).toEqual({
      ok: false,
      error: "Tiden hann bli bokad. Välj en annan tid.",
    });
  });

  it("flyttar inte avbokade eller genomförda bokningar", async () => {
    for (const status of ["cancelled", "completed", "no_show"]) {
      state.row = row({ status });
      state.slots = [new Date(target)];
      expect(await moveBooking(admin, { bookingId: "b1", barberId: "b2", startAt: target }, now)).toMatchObject({ ok: false });
    }
    expect(state.updates).toHaveLength(0);
  });

  it("avvisar ogiltig starttid", async () => {
    expect(await moveBooking(admin, { bookingId: "b1", barberId: "b2", startAt: "inte-ett-datum" }, now)).toMatchObject({ ok: false });
  });
});

describe("sanitizeSearch", () => {
  it("tar bort tecken som styr PostgREST-filter", () => {
    expect(sanitizeSearch("anna,status.eq.x)")).toBe("anna status eq x");
    expect(sanitizeSearch("  a%b*c_d  ")).toBe("a b c d");
    expect(sanitizeSearch("x".repeat(80))).toHaveLength(50);
  });
});
