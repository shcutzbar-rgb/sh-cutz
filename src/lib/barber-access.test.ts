import { describe, expect, it } from "vitest";
import { canAccessBarber, restrictBarbers } from "./barber-access";

const barbers = [{ id: "b1" }, { id: "b2" }];

describe("canAccessBarber", () => {
  it("ägare har alltid åtkomst, även om barberId är satt", () => {
    expect(canAccessBarber({ role: "owner", barberId: null }, "b1")).toBe(true);
    expect(canAccessBarber({ role: "owner", barberId: "b2" }, "b1")).toBe(true);
  });

  it("personal utan koppling har åtkomst till alla", () => {
    expect(canAccessBarber({ role: "staff", barberId: null }, "b1")).toBe(true);
  });

  it("personal med koppling har bara åtkomst till sin egen frisör", () => {
    expect(canAccessBarber({ role: "staff", barberId: "b1" }, "b1")).toBe(true);
    expect(canAccessBarber({ role: "staff", barberId: "b1" }, "b2")).toBe(false);
  });
});

describe("restrictBarbers", () => {
  it("filtrerar listan för begränsad personal", () => {
    expect(restrictBarbers({ role: "staff", barberId: "b2" }, barbers)).toEqual([{ id: "b2" }]);
    expect(restrictBarbers({ role: "staff", barberId: null }, barbers)).toEqual(barbers);
    expect(restrictBarbers({ role: "owner", barberId: "b1" }, barbers)).toEqual(barbers);
  });
});
