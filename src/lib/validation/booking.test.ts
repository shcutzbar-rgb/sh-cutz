import { describe, expect, it } from "vitest";
import { createBookingSchema } from "./booking";

const valid = {
  serviceId: "00000000-0000-4000-8000-000000000001",
  barberId: "00000000-0000-4000-8000-0000000000b1",
  startAt: "2026-10-12T08:00:00.000Z",
  customerName: "Anna Svensson",
  customerPhone: "072-192 68 49",
  customerEmail: "",
  notes: "",
  consent: true,
};

describe("createBookingSchema", () => {
  it("godkänner giltig indata, e-post är valfri", () => {
    expect(createBookingSchema.safeParse(valid).success).toBe(true);
    expect(createBookingSchema.safeParse({ ...valid, customerEmail: "anna@example.com" }).success).toBe(true);
  });

  it("kräver samtycke", () => {
    expect(createBookingSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
  });

  it("avvisar ogiltiga fält", () => {
    expect(createBookingSchema.safeParse({ ...valid, customerName: "A" }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...valid, customerPhone: "abc" }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...valid, customerEmail: "inte-en-epost" }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...valid, serviceId: "x" }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...valid, startAt: "imorgon" }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...valid, notes: "x".repeat(501) }).success).toBe(false);
  });

  it("avvisar ifylld honeypot", () => {
    expect(createBookingSchema.safeParse({ ...valid, website: "http://spam" }).success).toBe(false);
  });
});
