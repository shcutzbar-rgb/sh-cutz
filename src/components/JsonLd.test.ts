import { describe, expect, it } from "vitest";
import { buildHairSalonJsonLd } from "@/components/JsonLd";
import { deriveOpeningHours } from "@/lib/hours";
import { staticServices } from "@/lib/services";
import { staticShopSettings, type ShopSettings } from "@/lib/shop-settings";

// Testdata, inte kundens öppettider.
const sampleHours = deriveOpeningHours([
  ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, start_time: "10:00:00", end_time: "19:00:00" })),
  { weekday: 6, start_time: "10:00:00", end_time: "17:00:00" },
]);

const build = (shop: Partial<ShopSettings> = {}, hours = sampleHours) =>
  buildHairSalonJsonLd(staticServices, hours, { ...staticShopSettings, ...shop }) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("buildHairSalonJsonLd", () => {
  it("utelämnar öppettider helt när inga finns i stället för att hitta på", () => {
    expect(build({}, []).openingHoursSpecification).toBeUndefined();
  });

  it("ger grundfälten och öppettider för öppna dagar", () => {
    const ld = build();
    expect(ld["@type"]).toBe("HairSalon");
    expect(ld.priceRange).toBe("180-400 SEK");
    expect(ld.openingHoursSpecification).toHaveLength(6);
    expect(ld.openingHoursSpecification[0]).toMatchObject({ dayOfWeek: "Monday", opens: "10:00", closes: "19:00" });
  });

  it("utelämnar postnummer, geo och e-post när de saknas", () => {
    const ld = build();
    expect(ld.address.postalCode).toBeUndefined();
    expect(ld.geo).toBeUndefined();
    expect(ld.email).toBeUndefined();
  });

  it("tar med postnummer, geo och e-post när de är satta", () => {
    const ld = build({ postalCode: "116 31", latitude: 59.3145, longitude: 18.0735, email: "info@example.com" });
    expect(ld.address.postalCode).toBe("116 31");
    expect(ld.geo).toEqual({ "@type": "GeoCoordinates", latitude: 59.3145, longitude: 18.0735 });
    expect(ld.email).toBe("info@example.com");
  });
});
