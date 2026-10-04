import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateBookingInput } from "@/lib/validation/booking";
import { createPgliteSupabase } from "@/test/pglite-supabase";
import type { AdminContext } from "./admin-auth";

const state = vi.hoisted(() => ({ client: null as unknown, reminderMail: true }));

vi.mock("@/lib/supabase", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/supabase")>()),
  createServiceClient: () => state.client,
}));
vi.mock("./notifications", () => ({
  sendReminderEmail: vi.fn(async () => state.reminderMail),
  sendConfirmationEmail: vi.fn(async () => true),
  sendCancelledEmail: vi.fn(async () => true),
}));

import { moveBooking } from "./admin-bookings";
import { getAvailability, getMonthAvailability } from "./availability";
import { createBooking } from "./bookings";
import { cancelBookingByToken } from "./cancellation";
import { BookingError } from "./errors";
import { sendDueReminders } from "./reminders";
import { anonymizeOldBookings } from "./retention";
import { hashToken } from "./tokens";
import { claimSlotHold } from "./slot-holds";

// Hela flödet mot riktiga migreringar i PGlite (Postgres), med riktiga constraints.
const SERVICE = "00000000-0000-4000-8000-000000000001"; // Fade, 30 min
const BARBER = "00000000-0000-4000-8000-0000000000b1"; // Alla dagar 10-20
const DATE = "2026-10-12"; // måndag, CEST (UTC+2)
const NOW = new Date("2026-10-05T08:00:00Z");
const at = (hhmmUtc: string) => `${DATE}T${hhmmUtc}:00.000Z`; // 10:00 CEST = 08:00Z

let pg: PGlite;
let client: ReturnType<typeof createPgliteSupabase>;

const input = (startAt: string, over: Partial<CreateBookingInput> = {}): CreateBookingInput => ({
  serviceId: SERVICE,
  barberId: BARBER,
  startAt,
  holdToken: "00000000-0000-4000-8000-000000000099",
  customerName: "Anna Svensson",
  customerPhone: "0701234567",
  customerEmail: "anna@example.com",
  notes: "",
  consent: true,
  ...over,
});

const slotsAt = async (now = NOW) =>
  (await getAvailability({ serviceId: SERVICE, barberId: BARBER, date: DATE }, now)).slots.map((s) => s.toISOString());

const rows = async (sql = "select * from bookings order by start_at") => (await pg.query<Record<string, any>>(sql)).rows; // eslint-disable-line @typescript-eslint/no-explicit-any

const rejection = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (err) {
    return err;
  }
  return null;
};

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";

  pg = new PGlite({ extensions: { btree_gist } });
  // Minimal ersättning för Supabases auth-schema som migreringarna refererar till.
  await pg.exec(`create role anon;
    create role authenticated;
    create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;`);
  const dir = path.resolve(__dirname, "../../supabase/migrations");
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await pg.exec(fs.readFileSync(path.join(dir, file), "utf8"));
  }
  client = createPgliteSupabase(pg);
  state.client = client;
}, 60_000);

afterAll(async () => {
  await pg.close();
});

beforeEach(async () => {
  await pg.exec("delete from bookings; delete from time_off; delete from booking_slot_holds;");
  state.reminderMail = true;
});

describe("tillgänglighet och bokning", () => {
  it("visar lediga tider inom arbetstid i 15-minuterssteg", async () => {
    const slots = await slotsAt();
    expect(slots).toHaveLength(39); // 10:00-19:30 start för 30 min
    expect(slots[0]).toBe(at("08:00"));
    expect(slots.at(-1)).toBe(at("17:30"));
  });

  it("har samma öppettider på helgen och släpper inte igenom tid efter stängning", async () => {
    const sunday = await getAvailability({ serviceId: SERVICE, barberId: BARBER, date: "2026-10-11" }, NOW);
    expect(sunday.slots).toHaveLength(39);
    expect(sunday.slots.at(-1)?.toISOString()).toBe("2026-10-11T17:30:00.000Z");

    const afterClose = await rejection(createBooking(input(at("17:45")), NOW)); // 19:45 lokal tid
    expect(afterClose).toMatchObject({ code: "slot_unavailable", status: 409 });
  });

  it("markerar en hel frånvarodag som otillgänglig i månadskalendern", async () => {
    await pg.exec(
      `insert into time_off (barber_id, start_at, end_at, reason) values ('${BARBER}', '2026-10-06T08:00:00Z', '2026-10-06T18:00:00Z', 'Ledig')`,
    );
    const days = await getMonthAvailability({ serviceId: SERVICE, barberId: BARBER, month: "2026-10" }, NOW);
    expect(days.find((day) => day.date === "2026-10-05")?.available).toBe(true);
    expect(days.find((day) => day.date === "2026-10-06")?.available).toBe(false);
  });

  it("nekar gårdagens datum både i tillgänglighet och vid bokning", async () => {
    const afterDay = new Date("2026-10-13T08:00:00Z");
    expect(await slotsAt(afterDay)).toEqual([]);
    const err = await rejection(createBooking(input(at("08:00")), afterDay));
    expect(err).toMatchObject({ code: "slot_unavailable", status: 409 });
  });

  it("sparar bokningen med hashad token, aldrig rå token", async () => {
    const booking = await createBooking(input(at("08:00")), NOW);

    const [row] = await rows();
    expect(row).toMatchObject({ status: "confirmed", customer_name: "Anna Svensson" });
    expect(row.cancel_token_hash).toBe(await hashToken(booking.cancelToken));
    expect(JSON.stringify(row)).not.toContain(booking.cancelToken);
    expect(new Date(row.end_at).toISOString()).toBe(at("08:30"));
  });

  it("tillåter bokning utan telefon när e-post finns och lagrar telefon som null", async () => {
    const booking = await createBooking(input(at("08:00"), { customerPhone: "" }), NOW);
    const [row] = await rows();
    expect(row.customer_phone).toBeNull();
    expect(row.customer_email).toBe("anna@example.com");
    expect(booking.id).toBe(row.id);
  });

  it("tar bort överlappande tider ur tillgängligheten", async () => {
    await createBooking(input(at("09:00")), NOW); // 11:00-11:30 CEST
    const slots = await slotsAt();
    expect(slots).not.toContain(at("08:45")); // 10:45 CEST överlappar
    expect(slots).not.toContain(at("09:00"));
    expect(slots).not.toContain(at("09:15"));
    expect(slots).toContain(at("08:30")); // slutar exakt när bokningen börjar
    expect(slots).toContain(at("09:30"));
  });

  it("nekar dubbelbokning och delvis överlapp med 409", async () => {
    await createBooking(input(at("08:00")), NOW);
    for (const start of [at("08:00"), at("08:15")]) {
      const err = await rejection(createBooking(input(start, { customerName: "Bo" }), NOW));
      expect(err).toBeInstanceOf(BookingError);
      expect(err).toMatchObject({ code: "slot_unavailable", status: 409 });
    }
    expect(await rows()).toHaveLength(1);
  });

  it("reserverar valt datum för första kunden medan hen fyller i formuläret", async () => {
    const firstCustomer = input(at("08:00"), { holdToken: "00000000-0000-4000-8000-000000000101" });
    const secondCustomer = input(at("08:00"), { holdToken: "00000000-0000-4000-8000-000000000102" });
    await claimSlotHold({
      serviceId: SERVICE,
      barberId: BARBER,
      startAt: firstCustomer.startAt,
      holdToken: firstCustomer.holdToken,
    }, NOW);

    await expect(slotsAt()).resolves.not.toContain(at("08:00"));
    await expect(claimSlotHold({
      serviceId: SERVICE,
      barberId: BARBER,
      startAt: secondCustomer.startAt,
      holdToken: secondCustomer.holdToken,
    }, NOW)).rejects.toMatchObject({ code: "slot_unavailable", status: 409 });

    await expect(createBooking(firstCustomer, NOW)).resolves.toBeDefined();
    expect(await rows()).toHaveLength(1);
  });

  it("ger bara en av två samtidiga kunder en reservation för samma tid", async () => {
    const claims = ["00000000-0000-4000-8000-000000000111", "00000000-0000-4000-8000-000000000112"].map((holdToken) =>
      claimSlotHold({ serviceId: SERVICE, barberId: BARBER, startAt: at("08:00"), holdToken }, NOW),
    );
    const result = await Promise.allSettled(claims);
    expect(result.filter((entry) => entry.status === "fulfilled")).toHaveLength(1);
    expect(result.filter((entry) => entry.status === "rejected")).toHaveLength(1);
  });

  it("släpper igenom exakt en av två samtidiga bokningar av samma tid", async () => {
    const results = await Promise.allSettled([
      createBooking(input(at("09:00"), { customerName: "A" }), NOW),
      createBooking(input(at("09:00"), { customerName: "B" }), NOW),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(failed.reason).toMatchObject({ code: "slot_unavailable" });
    expect(await rows("select * from bookings where start_at = '" + at("09:00") + "'")).toHaveLength(1);
  });

  it("databasens exclusion constraint stoppar överlapp även utan serverkontroll", async () => {
    await createBooking(input(at("08:00")), NOW);
    const { error } = await client
      .from("bookings")
      .insert({
        service_id: SERVICE,
        barber_id: BARBER,
        start_at: at("08:15"),
        end_at: at("08:45"),
        customer_name: "X",
        customer_phone: "1",
        cancel_token_hash: "direct-insert",
      })
      .select("id");
    expect(error?.code).toBe("23P01");
  });

  it("respekterar frånvaro och avvisar tider utanför arbetstid", async () => {
    await pg.exec(
      `insert into time_off (barber_id, start_at, end_at) values ('${BARBER}', '${at("11:00")}', '${at("12:00")}')`,
    );
    const slots = await slotsAt();
    expect(slots).not.toContain(at("11:00"));
    expect(slots).not.toContain(at("11:45"));
    expect(slots).toContain(at("12:00"));

    const early = await rejection(createBooking(input(at("06:00")), NOW)); // 08:00 CEST, före öppning
    expect(early).toMatchObject({ code: "slot_unavailable" });
  });

  it("kräver minst 2 timmars framförhållning för publik bokning", async () => {
    const now = new Date(at("07:00")); // 09:00 CEST samma dag
    const slots = await slotsAt(now);
    expect(slots[0]).toBe(at("09:00")); // tidigast 11:00 CEST
  });
});

describe("avbokning", () => {
  it("avbokar med rå token, frigör tiden och kan inte återanvändas", async () => {
    const { cancelToken } = await createBooking(input(at("08:00")), NOW);

    expect(await cancelBookingByToken(cancelToken, NOW)).toMatchObject({ ok: true });
    expect((await rows())[0].status).toBe("cancelled");
    expect(await slotsAt()).toContain(at("08:00"));

    expect(await cancelBookingByToken(cancelToken, NOW)).toEqual({ ok: false, reason: "invalid" });
  });

  it("ger samma neutrala svar för okänd token", async () => {
    await createBooking(input(at("08:00")), NOW);
    const result = await cancelBookingByToken("A".repeat(43), NOW);
    expect(result).toEqual({ ok: false, reason: "invalid" });
    expect((await rows())[0].status).toBe("confirmed");
  });

  it("nekar avbokning inom 3 timmar före tiden", async () => {
    const { cancelToken } = await createBooking(input(at("08:00")), NOW);
    const late = new Date(at("05:30")); // 2,5 h före
    expect(await cancelBookingByToken(cancelToken, late)).toEqual({ ok: false, reason: "too_late" });
    expect((await rows())[0].status).toBe("confirmed");

    const ok = new Date(at("05:00")); // exakt 3 h före
    expect(await cancelBookingByToken(cancelToken, ok)).toMatchObject({ ok: true });
  });

  it("en avbokad tid kan bokas av någon annan", async () => {
    const first = await createBooking(input(at("08:00")), NOW);
    await cancelBookingByToken(first.cancelToken, NOW);
    await expect(createBooking(input(at("08:00"), { customerName: "Bo" }), NOW)).resolves.toBeDefined();
  });
});

describe("påminnelser och lagringstid", () => {
  const REMIND_AT = new Date("2026-10-11T09:00:00Z"); // 23 h före 2026-10-12 08:00Z

  const bookEarly = async () => {
    await createBooking(input(at("08:00")), NOW);
    await pg.exec("update bookings set created_at = '2026-10-01T00:00:00Z'");
  };

  it("skickar påminnelse en gång och markerar reminder_sent_at", async () => {
    await bookEarly();
    expect(await sendDueReminders(REMIND_AT)).toEqual({ due: 1, sent: 1, failed: 0 });
    expect((await rows())[0].reminder_sent_at).not.toBeNull();
    expect(await sendDueReminders(REMIND_AT)).toEqual({ due: 0, sent: 0, failed: 0 });
  });

  it("släpper claimen vid mejlfel så att nästa körning försöker igen", async () => {
    await bookEarly();
    state.reminderMail = false;
    expect(await sendDueReminders(REMIND_AT)).toEqual({ due: 1, sent: 0, failed: 1 });
    expect((await rows())[0].reminder_sent_at).toBeNull();
    state.reminderMail = true;
    expect(await sendDueReminders(REMIND_AT)).toMatchObject({ sent: 1 });
  });

  it("påminner inte för avbokade bokningar eller för tidigt", async () => {
    await bookEarly();
    expect(await sendDueReminders(new Date("2026-10-10T08:00:00Z"))).toMatchObject({ due: 0 });
    await pg.exec("update bookings set status = 'cancelled'");
    expect(await sendDueReminders(REMIND_AT)).toMatchObject({ due: 0 });
  });

  it("anonymiserar personuppgifter efter lagringstiden men behåller statistiken", async () => {
    await pg.exec(`insert into bookings (service_id, barber_id, start_at, end_at, customer_name, customer_phone, customer_email, notes, status, cancel_token_hash)
      values ('${SERVICE}', '${BARBER}', '2024-01-10T09:00:00Z', '2024-01-10T09:30:00Z', 'Gammal Kund', '0701111111', 'gammal@example.com', 'anteckning', 'completed', 'old-hash')`);
    await createBooking(input(at("08:00")), NOW);

    expect(await anonymizeOldBookings(NOW)).toBe(1);
    const [old, recent] = await rows();
    expect(old).toMatchObject({ customer_name: "Raderad", customer_phone: "", customer_email: null, notes: null, status: "completed" });
    expect(new Date(old.start_at).toISOString()).toBe("2024-01-10T09:00:00.000Z");
    expect(recent.customer_name).toBe("Anna Svensson");
    expect(await anonymizeOldBookings(NOW)).toBe(0);
  });
});

describe("admin flyttar bokning", () => {
  const admin = () => ({ userId: "u1", email: "a@example.com", role: "staff", supabase: client }) as unknown as AdminContext;

  it("flyttar till ledig tid och nollställer påminnelsen", async () => {
    const { id } = await createBooking(input(at("08:00")), NOW);
    await pg.exec("update bookings set reminder_sent_at = now()");

    const result = await moveBooking(admin(), { bookingId: id, barberId: BARBER, startAt: at("10:00") }, NOW);
    expect(result).toMatchObject({ ok: true });
    const [row] = await rows();
    expect(new Date(row.start_at).toISOString()).toBe(at("10:00"));
    expect(new Date(row.end_at).toISOString()).toBe(at("10:30"));
    expect(row.reminder_sent_at).toBeNull();
  });

  it("blockerar inte sig själv: flytt 15 minuter framåt går bra", async () => {
    const { id } = await createBooking(input(at("08:00")), NOW);
    expect(await moveBooking(admin(), { bookingId: id, barberId: BARBER, startAt: at("08:15") }, NOW)).toMatchObject({ ok: true });
  });

  it("nekar flytt till upptagen tid och lämnar bokningen orörd", async () => {
    const { id } = await createBooking(input(at("08:00")), NOW);
    await createBooking(input(at("09:00"), { customerName: "Bo" }), NOW);

    const result = await moveBooking(admin(), { bookingId: id, barberId: BARBER, startAt: at("09:00") }, NOW);
    expect(result).toMatchObject({ ok: false });
    expect(new Date((await rows())[0].start_at).toISOString()).toBe(at("08:00"));
  });

  it("tillåter admin att flytta närmare än 2 timmar före, vilket publik bokning inte gör", async () => {
    const { id } = await createBooking(input(at("10:00")), NOW); // 12:00 CEST
    const now = new Date(at("09:00")); // 11:00 CEST, 1 h före
    expect(await slotsAt(now)).not.toContain(at("10:30"));
    expect(await moveBooking(admin(), { bookingId: id, barberId: BARBER, startAt: at("10:30") }, now)).toMatchObject({ ok: true });
  });

  it("flyttar inte avbokade bokningar", async () => {
    const { id, cancelToken } = await createBooking(input(at("08:00")), NOW);
    await cancelBookingByToken(cancelToken, NOW);
    expect(await moveBooking(admin(), { bookingId: id, barberId: BARBER, startAt: at("10:00") }, NOW)).toMatchObject({ ok: false });
  });
});
