import { z } from "zod";

// Delas av formuläret (klient) och endpointen (server).
export const customerSchema = z.object({
  customerName: z.string().trim().min(2, "Ange ditt namn").max(100, "Namnet är för långt"),
  customerPhone: z
    .string()
    .trim()
    .max(24, "Telefonnumret är för långt")
    .refine((value) => value === "" || /^\+?[0-9][0-9\s-]{5,18}$/.test(value), "Ange ett giltigt telefonnummer")
    .optional()
    .default(""),
  customerEmail: z
    .string()
    .trim()
    .min(1, "E-post krävs för bokningsbekräftelsen")
    .max(254, "E-postadressen är för lång")
    .refine((v) => z.email().safeParse(v).success, "Ange en giltig e-postadress"),
  notes: z.string().trim().max(500, "Max 500 tecken"),
  consent: z.boolean().refine((v) => v === true, "Du måste godkänna hanteringen av dina personuppgifter"),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
export type CustomerFormInput = z.input<typeof customerSchema>;

export const createBookingSchema = customerSchema.extend({
  serviceId: z.uuid(),
  barberId: z.uuid(),
  startAt: z.iso.datetime({ offset: true }),
  holdToken: z.uuid(),
  // Honeypot: ska vara tom för riktiga användare.
  website: z.string().max(0).optional(),
  turnstileToken: z.string().max(2048).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const availabilityQuerySchema = z.object({
  serviceId: z.uuid(),
  barberId: z.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
