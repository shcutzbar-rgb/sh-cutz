import { z } from "zod";

const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on");

const int = (min: number, max: number, label: string) =>
  z.coerce
    .number({ error: `${label} måste vara ett tal` })
    .int(`${label} måste vara ett heltal`)
    .min(min, `${label} måste vara minst ${min}`)
    .max(max, `${label} får vara högst ${max}`);

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ange tid som HH:mm");
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/, "Ange datum och tid");

export const serviceSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Ange ett namn").max(100, "Namnet är för långt"),
  description: z.string().trim().max(500, "Beskrivningen är för lång"),
  priceSek: int(0, 100_000, "Priset"),
  durationMinutes: int(5, 480, "Tiden"),
  sortOrder: int(0, 1000, "Sorteringen"),
  isActive: checkbox,
});

export const barberSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Ange ett namn").max(100, "Namnet är för långt"),
  bio: z.string().trim().max(1000, "Beskrivningen är för lång"),
  photoUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Bildadressen måste börja med https://"),
  isActive: checkbox,
});

export const workingHourSchema = z
  .object({
    barberId: z.uuid(),
    weekday: int(0, 6, "Veckodagen"),
    startTime: time,
    endTime: time,
  })
  .refine((v) => v.endTime > v.startTime, { message: "Sluttiden måste vara efter starttiden", path: ["endTime"] });

export const timeOffSchema = z
  .object({
    barberId: z.uuid(),
    startAt: localDateTime,
    endAt: localDateTime,
    reason: z.string().trim().max(200, "Anledningen är för lång"),
  })
  .refine((v) => v.endAt > v.startAt, { message: "Slutet måste vara efter starten", path: ["endAt"] });

export const idSchema = z.object({ id: z.uuid() });

export const mfaCodeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Ange den sexsiffriga koden från din autentiseringsapp"),
});

const coordinate = (limit: number, label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (Number.isFinite(Number(v)) && Math.abs(Number(v)) <= limit), `${label} måste vara ett tal mellan -${limit} och ${limit}`);

export const settingsSchema = z
  .object({
    shopName: z.string().trim().min(1, "Ange butikens namn").max(100),
    phone: z.string().trim().min(3, "Ange ett telefonnummer").max(30),
    email: z
      .string()
      .trim()
      .max(254)
      .refine((v) => v === "" || z.email().safeParse(v).success, "Ange en giltig e-postadress"),
    addressLine: z.string().trim().min(1, "Ange en adress").max(200),
    city: z.string().trim().min(1, "Ange en ort").max(100),
    postalCode: z.string().trim().max(10),
    bookingIntervalMinutes: int(5, 120, "Intervallet"),
    cancellationPolicy: z.string().trim().max(2000, "Policytexten är för lång"),
    latitude: coordinate(90, "Latitud"),
    longitude: coordinate(180, "Longitud"),
    requireAdminMfa: checkbox,
  })
  .refine((v) => (v.latitude === "") === (v.longitude === ""), {
    message: "Ange både latitud och longitud, eller ingen av dem",
    path: ["longitude"],
  });
