import { siteConfig } from "@/lib/site";
import { createAnonClient, isSupabaseConfigured } from "@/lib/supabase";

export type ShopSettings = {
  shopName: string;
  phone: string;
  phoneHref: string;
  email: string | null;
  addressLine: string;
  city: string;
  postalCode: string | null;
  bookingIntervalMinutes: number;
  cancellationPolicy: string;
  dropInText: string;
  latitude: number | null;
  longitude: number | null;
};

/** Svenskt nummer till tel:-länk: inledande 0 blir +46. */
export function toTelHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return `tel:${digits}`;
  if (digits.startsWith("00")) return `tel:+${digits.slice(2)}`;
  if (digits.startsWith("0")) return `tel:+46${digits.slice(1)}`;
  return `tel:${digits}`;
}

export const staticShopSettings: ShopSettings = {
  shopName: siteConfig.name,
  phone: siteConfig.phone,
  phoneHref: siteConfig.phoneHref,
  email: null,
  addressLine: siteConfig.address.street,
  city: siteConfig.address.city,
  postalCode: null,
  bookingIntervalMinutes: 15,
  cancellationPolicy: "",
  dropInText: "",
  latitude: null,
  longitude: null,
};

export async function getShopSettings(): Promise<ShopSettings> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await createAnonClient()
        .from("shop_settings")
        .select("shop_name,phone,email,address_line,city,postal_code,booking_interval_minutes,cancellation_policy,drop_in_text,latitude,longitude")
        .eq("id", 1)
        .maybeSingle();
      if (!error && data) {
        return {
          shopName: data.shop_name,
          phone: data.phone,
          phoneHref: toTelHref(data.phone),
          email: data.email,
          addressLine: data.address_line,
          city: data.city,
          postalCode: data.postal_code,
          bookingIntervalMinutes: data.booking_interval_minutes,
          cancellationPolicy: data.cancellation_policy,
          dropInText: data.drop_in_text,
          latitude: data.latitude === null ? null : Number(data.latitude),
          longitude: data.longitude === null ? null : Number(data.longitude),
        };
      }
      if (error) console.error("Kunde inte läsa shop_settings:", error.message);
    } catch (err) {
      console.error("Kunde inte läsa shop_settings:", err);
    }
  }
  return staticShopSettings;
}
