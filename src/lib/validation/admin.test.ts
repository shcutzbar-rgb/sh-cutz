import { describe, expect, it } from "vitest";
import { parseLocalDateTime } from "@/lib/datetime";
import {
  barberSchema,
  serviceSchema,
  settingsSchema,
  timeOffSchema,
  workingHourSchema,
} from "./admin";

const uuid = "00000000-0000-4000-8000-000000000001";

describe("serviceSchema", () => {
  const valid = { name: "Fade", description: "", priceSek: "350", durationMinutes: "30", sortOrder: "1", isActive: "on" };

  it("tolkar formulärvärden", () => {
    expect(serviceSchema.parse(valid)).toMatchObject({ priceSek: 350, durationMinutes: 30, isActive: true });
    expect(serviceSchema.parse({ ...valid, isActive: undefined }).isActive).toBe(false);
  });

  it("avvisar ogiltiga värden", () => {
    expect(serviceSchema.safeParse({ ...valid, name: "  " }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...valid, priceSek: "-5" }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...valid, priceSek: "abc" }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...valid, durationMinutes: "0" }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...valid, durationMinutes: "12.5" }).success).toBe(false);
  });
});

describe("barberSchema", () => {
  it("kräver https för bildadress men tillåter tom", () => {
    const base = { name: "Shabir", bio: "" };
    expect(barberSchema.safeParse({ ...base, photoUrl: "" }).success).toBe(true);
    expect(barberSchema.safeParse({ ...base, photoUrl: "https://example.com/a.jpg" }).success).toBe(true);
    expect(barberSchema.safeParse({ ...base, photoUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(barberSchema.safeParse({ ...base, photoUrl: "http://example.com/a.jpg" }).success).toBe(false);
  });
});

describe("workingHourSchema", () => {
  it("kräver sluttid efter starttid och giltig veckodag", () => {
    const ok = { barberId: uuid, weekday: "1", startTime: "10:00", endTime: "19:00" };
    expect(workingHourSchema.safeParse(ok).success).toBe(true);
    expect(workingHourSchema.safeParse({ ...ok, endTime: "10:00" }).success).toBe(false);
    expect(workingHourSchema.safeParse({ ...ok, endTime: "09:00" }).success).toBe(false);
    expect(workingHourSchema.safeParse({ ...ok, weekday: "7" }).success).toBe(false);
    expect(workingHourSchema.safeParse({ ...ok, startTime: "25:00" }).success).toBe(false);
  });
});

describe("timeOffSchema + parseLocalDateTime", () => {
  const ok = { barberId: uuid, startAt: "2026-10-12T09:00", endAt: "2026-10-12T12:00", reason: "" };

  it("kräver slut efter start", () => {
    expect(timeOffSchema.safeParse(ok).success).toBe(true);
    expect(timeOffSchema.safeParse({ ...ok, endAt: "2026-10-12T09:00" }).success).toBe(false);
    expect(timeOffSchema.safeParse({ ...ok, startAt: "2026-10-12 09:00" }).success).toBe(false);
  });

  it("tolkar lokal tid i Stockholm (sommar- och vintertid)", () => {
    expect(parseLocalDateTime("2026-10-12T09:00", "Europe/Stockholm").toISOString()).toBe("2026-10-12T07:00:00.000Z");
    expect(parseLocalDateTime("2026-11-02T09:00", "Europe/Stockholm").toISOString()).toBe("2026-11-02T08:00:00.000Z");
  });
});

describe("settingsSchema", () => {
  const ok = {
    shopName: "SH-Cutz",
    phone: "072-192 68 49",
    email: "",
    addressLine: "Folkungagatan 87",
    city: "Stockholm",
    postalCode: "",
    bookingIntervalMinutes: "15",
    cancellationPolicy: "",
    dropInText: "",
    latitude: "",
    longitude: "",
  };

  it("godkänner giltiga inställningar med valfri e-post", () => {
    expect(settingsSchema.safeParse(ok).success).toBe(true);
    expect(settingsSchema.safeParse({ ...ok, email: "info@example.com" }).success).toBe(true);
  });

  it("avvisar ogiltiga", () => {
    expect(settingsSchema.safeParse({ ...ok, email: "fel" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...ok, bookingIntervalMinutes: "1" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...ok, shopName: "" }).success).toBe(false);
  });

  it("tolkar bekräftelsekryssrutorna för kontaktuppgifter och öppettider", () => {
    const parsed = settingsSchema.parse({ ...ok, contactConfirmed: "on" });
    expect(parsed.contactConfirmed).toBe(true);
    expect(parsed.hoursConfirmed).toBe(false);
  });

  it("trimmar och begränsar drop-in-texten till 500 tecken", () => {
    expect(settingsSchema.parse({ ...ok, dropInText: "  Dröppen fre 10-12  " }).dropInText).toBe("Dröppen fre 10-12");
    expect(settingsSchema.safeParse({ ...ok, dropInText: "x".repeat(500) }).success).toBe(true);
    expect(settingsSchema.safeParse({ ...ok, dropInText: "x".repeat(501) }).success).toBe(false);
  });

  it("tolkar kryssrutan för MFA-plikt", () => {
    expect(settingsSchema.parse(ok).requireAdminMfa).toBe(false);
    expect(settingsSchema.parse({ ...ok, requireAdminMfa: "on" }).requireAdminMfa).toBe(true);
  });

  it("kräver både koordinater eller ingen, inom giltigt intervall", () => {
    expect(settingsSchema.safeParse({ ...ok, latitude: "59.3145", longitude: "18.0735" }).success).toBe(true);
    expect(settingsSchema.safeParse({ ...ok, latitude: "59.3145" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...ok, latitude: "91", longitude: "18" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...ok, latitude: "abc", longitude: "18" }).success).toBe(false);
  });
});
