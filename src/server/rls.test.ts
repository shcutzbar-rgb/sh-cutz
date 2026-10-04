import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Kör de riktiga migreringarna i Postgres och prövar RLS med roller, som Supabase gör.
const SERVICE = "00000000-0000-4000-8000-000000000001";
const BARBER_A = "00000000-0000-4000-8000-0000000000b1"; // Shabir (seed)
const BARBER_B = "00000000-0000-4000-8000-0000000000b2";
const OWNER = "11111111-1111-4111-8111-111111111111";
const STAFF_A = "22222222-2222-4222-8222-222222222222";
const STAFF_B = "33333333-3333-4333-8333-333333333333";
const STAFF_ALL = "44444444-4444-4444-8444-444444444444";
const STRANGER = "55555555-5555-4555-8555-555555555555";

let pg: PGlite;
let bookingA: string;
let bookingB: string;

async function as(role: "anon" | "authenticated", sub: string | null, sql: string, params: unknown[] = []) {
  await pg.exec(`set role ${role}`);
  await pg.query("select set_config('request.jwt.sub', $1, false)", [sub ?? ""]);
  try {
    const result = await pg.query<Record<string, unknown>>(sql, params);
    return { rows: result.rows, count: result.affectedRows ?? result.rows.length, code: null as string | null };
  } catch (err) {
    return { rows: [], count: 0, code: (err as { code?: string }).code ?? "error" };
  } finally {
    await pg.exec("reset role");
  }
}

const insertBooking = (barber: string, hash: string, startAt = "2026-10-12T10:00:00Z", endAt = "2026-10-12T10:30:00Z") =>
  `insert into bookings (service_id, barber_id, start_at, end_at, customer_name, customer_phone, cancel_token_hash)
   values ('${SERVICE}', '${barber}', '${startAt}', '${endAt}', 'Kund', '070', '${hash}')`;

beforeAll(async () => {
  pg = new PGlite({ extensions: { btree_gist } });
  await pg.exec(`create role authenticated; create role anon; create role service_role; create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;`);
  const dir = path.resolve(__dirname, "../../supabase/migrations");
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await pg.exec(fs.readFileSync(path.join(dir, file), "utf8"));
  }
  await pg.exec(`grant select, insert, update, delete on all tables in schema public to authenticated, anon;
    insert into barbers (id, name) values ('${BARBER_B}', 'Bo');
    insert into auth.users values ('${OWNER}'), ('${STAFF_A}'), ('${STAFF_B}'), ('${STAFF_ALL}'), ('${STRANGER}');
    insert into admin_users (id, role, barber_id) values
      ('${OWNER}', 'owner', null), ('${STAFF_A}', 'staff', '${BARBER_A}'),
      ('${STAFF_B}', 'staff', '${BARBER_B}'), ('${STAFF_ALL}', 'staff', null);`);
  bookingA = (await pg.query<{ id: string }>(`${insertBooking(BARBER_A, "ha")} returning id`)).rows[0].id;
  bookingB = (await pg.query<{ id: string }>(`${insertBooking(BARBER_B, "hb")} returning id`)).rows[0].id;
}, 60_000);

afterAll(async () => {
  await pg.close();
});

describe("RLS: bokningar per frisör", () => {
  const count = async (sub: string | null, role: "anon" | "authenticated" = "authenticated") =>
    (await as(role, sub, "select id from bookings")).rows.length;

  it("owner och personal utan frisörkoppling ser alla bokningar", async () => {
    expect(await count(OWNER)).toBe(2);
    expect(await count(STAFF_ALL)).toBe(2);
  });

  it("personal kopplad till en frisör ser bara den frisörens bokningar", async () => {
    expect((await as("authenticated", STAFF_A, "select barber_id from bookings")).rows).toEqual([{ barber_id: BARBER_A }]);
    expect((await as("authenticated", STAFF_B, "select barber_id from bookings")).rows).toEqual([{ barber_id: BARBER_B }]);
  });

  it("andra inloggade och anonyma ser inga bokningar", async () => {
    expect(await count(STRANGER)).toBe(0);
    expect(await count(null, "anon")).toBe(0);
  });

  it("personal kan ändra egen frisörs bokning men inte någon annans", async () => {
    expect((await as("authenticated", STAFF_A, "update bookings set status = 'confirmed' where id = $1", [bookingA])).count).toBe(1);
    expect((await as("authenticated", STAFF_A, "update bookings set status = 'cancelled' where id = $1", [bookingB])).count).toBe(0);
    expect((await pg.query<{ status: string }>("select status from bookings where id = $1", [bookingB])).rows[0].status).toBe("confirmed");
  });

  it("personal kan inte skapa bokning åt en annan frisör", async () => {
    expect((await as("authenticated", STAFF_A, insertBooking(BARBER_B, "x1"))).code).toBe("42501");
    expect((await as("authenticated", STAFF_A, insertBooking(BARBER_A, "x2", "2026-10-12T12:00:00Z", "2026-10-12T12:30:00Z"))).code).toBeNull();
  });

  it("admin kan flytta en bokning till en kundreserverad tid och frigör reservationen", async () => {
    const hash = "a".repeat(64);
    const heldStart = "2026-10-12T11:00:00Z";
    const heldEnd = "2026-10-12T11:30:00Z";
    const claim = await pg.query<{ claim_booking_slot: boolean }>(
      "select claim_booking_slot($1,$2,$3,$4,now()+interval '5 minutes')",
      [hash, BARBER_A, heldStart, heldEnd],
    );
    expect(claim.rows[0].claim_booking_slot).toBe(true);

    const moved = await as(
      "authenticated",
      OWNER,
      "update bookings set start_at=$1, end_at=$2 where id=$3",
      [heldStart, heldEnd, bookingA],
    );
    expect(moved.count).toBe(1);
    const hold = await pg.query<{ active: boolean }>("select active from booking_slot_holds where token_hash=$1", [hash]);
    expect(hold.rows[0].active).toBe(false);
  });

  it("personal kan inte flytta egen bokning till en annan frisör", async () => {
    const moved = await as("authenticated", STAFF_A, "update bookings set barber_id = $1 where id = $2", [BARBER_B, bookingA]);
    expect(moved.code).toBe("42501");
  });

  it("owner kan hantera allas bokningar", async () => {
    expect((await as("authenticated", OWNER, "update bookings set notes = 'x' where id = $1", [bookingB])).count).toBe(1);
  });
});

describe("RLS: admin_users och frisörborttagning", () => {
  it("personal kan läsa sin egen koppling men inte ändra den", async () => {
    const own = await as("authenticated", STAFF_A, "select barber_id from admin_users");
    expect(own.rows).toEqual([{ barber_id: BARBER_A }]);
    const change = await as("authenticated", STAFF_A, "update admin_users set barber_id = null where id = $1", [STAFF_A]);
    expect(change.count).toBe(0);
    expect((await pg.query<{ barber_id: string }>("select barber_id from admin_users where id = $1", [STAFF_A])).rows[0].barber_id).toBe(BARBER_A);
  });

  it("en frisör kopplad till personal går inte att ta bort (ger inte tyst bredare åtkomst)", async () => {
    const del = await as("authenticated", OWNER, "delete from barbers where id = $1", [BARBER_B]);
    expect(del.code).toBe("23503");
    expect((await as("authenticated", STAFF_B, "select id from bookings")).rows).toHaveLength(1);
  });
});
