"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { formatDateLongIn, formatTimeIn } from "@/lib/datetime";
import { formatDuration, formatPrice } from "@/lib/format";
import { customerSchema, type CustomerFormValues } from "@/lib/validation/booking";
import type { Barber, Service } from "@/types/shop";

type Props = {
  services: Service[];
  barbers: Barber[];
  timezone: string;
  minDate: string;
  maxDate: string;
};

type Confirmation = {
  id: string;
  startAt: string;
  endAt: string;
  serviceName: string;
  barberName: string;
  priceSek: number;
  cancelToken: string;
};

type Step = "service" | "barber" | "time" | "details" | "done";

const STEP_NUMBER: Record<Exclude<Step, "done">, number> = { service: 1, barber: 2, time: 3, details: 4 };

const buttonPrimary =
  "rounded-full bg-accent px-6 py-3 font-semibold text-black hover:bg-accent/90 disabled:opacity-50";
const buttonSecondary = "rounded-full border border-white/20 px-6 py-3 font-medium hover:bg-white/10";
const inputClass =
  "mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-foreground placeholder:text-foreground/40";

export function BookingFlow({ services, barbers, timezone, minDate, maxDate }: Props) {
  const [step, setStep] = useState<Step>("service");
  const [service, setService] = useState<Service | null>(null);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [startAt, setStartAt] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [cancelUrl, setCancelUrl] = useState("");

  const headingRef = useRef<HTMLHeadingElement>(null);
  const slotsRequest = useRef(0);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { customerName: "", customerPhone: "", customerEmail: "", notes: "", consent: false },
  });
  const { register, handleSubmit, setError, formState } = form;
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  async function loadSlots(nextDate: string, svc: Service, brb: Barber) {
    const requestId = ++slotsRequest.current;
    setStartAt(null);
    setSlots(null);
    setSlotsError(null);
    if (!nextDate) return;

    setSlotsLoading(true);
    try {
      const params = new URLSearchParams({ serviceId: svc.id, barberId: brb.id, date: nextDate });
      const res = await fetch(`/api/availability?${params}`);
      const data = (await res.json()) as { slots?: string[]; error?: string };
      if (requestId !== slotsRequest.current) return;
      if (!res.ok || !data.slots) {
        setSlotsError(data.error ?? "Kunde inte hämta lediga tider.");
        return;
      }
      setSlots(data.slots);
    } catch {
      if (requestId === slotsRequest.current) setSlotsError("Kunde inte hämta lediga tider.");
    } finally {
      if (requestId === slotsRequest.current) setSlotsLoading(false);
    }
  }

  async function onSubmit(values: CustomerFormValues) {
    if (!service || !barber || !startAt) return;
    setSubmitError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          serviceId: service.id,
          barberId: barber.id,
          startAt,
          website: (document.getElementById("website") as HTMLInputElement | null)?.value ?? "",
        }),
      });
      const data = (await res.json()) as {
        booking?: Confirmation;
        error?: string;
        code?: string;
        fields?: Partial<Record<keyof CustomerFormValues, string[]>>;
      };

      if (res.status === 201 && data.booking) {
        setConfirmation(data.booking);
        setCancelUrl(`${window.location.origin}/avboka/${data.booking.cancelToken}`);
        setStep("done");
        return;
      }

      if (res.status === 400 && data.fields) {
        for (const [name, messages] of Object.entries(data.fields)) {
          if (messages?.[0]) setError(name as keyof CustomerFormValues, { message: messages[0] });
        }
      }
      if (res.status === 409) {
        setSlotsError(data.error ?? "Tiden är inte längre ledig. Välj en annan tid.");
        setStep("time");
        void loadSlots(date, service, barber);
        return;
      }
      setSubmitError(data.error ?? "Något gick fel. Försök igen.");
    } catch {
      setSubmitError("Kunde inte nå servern. Kontrollera anslutningen och försök igen.");
    }
  }

  const progress =
    step === "done" ? null : (
      <p className="text-sm text-foreground/60">
        Steg {STEP_NUMBER[step]} av 4
      </p>
    );

  return (
    <div>
      {progress}

      {step === "service" && (
        <section aria-labelledby="step-heading">
          <h2 id="step-heading" ref={headingRef} tabIndex={-1} className="mt-1 text-2xl font-bold outline-none">
            Välj tjänst
          </h2>
          <ul className="mt-6 space-y-3">
            {services.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    setService(s);
                    setSlots(null);
                    setStartAt(null);
                    setStep("barber");
                  }}
                  className="flex w-full items-start justify-between gap-4 rounded-xl border border-white/10 p-4 text-left hover:border-accent"
                >
                  <span>
                    <span className="block font-semibold">{s.name}</span>
                    <span className="mt-1 block text-sm text-foreground/70">{s.description}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-semibold text-accent">{formatPrice(s.priceSek)}</span>
                    <span className="block text-sm text-foreground/70">{formatDuration(s.durationMinutes)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {step === "barber" && service && (
        <section aria-labelledby="step-heading">
          <h2 id="step-heading" ref={headingRef} tabIndex={-1} className="mt-1 text-2xl font-bold outline-none">
            Välj frisör
          </h2>
          <ul className="mt-6 space-y-3">
            {barbers.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => {
                    setBarber(b);
                    setStep("time");
                    if (date) void loadSlots(date, service, b);
                  }}
                  className="flex w-full items-center gap-4 rounded-xl border border-white/10 p-4 text-left hover:border-accent"
                >
                  <span
                    aria-hidden
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-xl font-bold text-black"
                  >
                    {b.name.charAt(0)}
                  </span>
                  <span className="font-semibold">{b.name}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setStep("service")} className={`${buttonSecondary} mt-6`}>
            Tillbaka
          </button>
        </section>
      )}

      {step === "time" && service && barber && (
        <section aria-labelledby="step-heading">
          <h2 id="step-heading" ref={headingRef} tabIndex={-1} className="mt-1 text-2xl font-bold outline-none">
            Välj tid
          </h2>
          <p className="mt-2 text-sm text-foreground/70">
            {service.name} hos {barber.name}
          </p>

          <label className="mt-6 block text-sm font-medium" htmlFor="date">
            Datum
          </label>
          <input
            id="date"
            type="date"
            min={minDate}
            max={maxDate}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              void loadSlots(e.target.value, service, barber);
            }}
            className={`${inputClass} max-w-xs`}
          />

          <div className="mt-6" aria-live="polite">
            {slotsLoading && <p className="text-foreground/70">Hämtar lediga tider...</p>}
            {slotsError && (
              <p role="alert" className="text-red-400">
                {slotsError}
              </p>
            )}
            {!slotsLoading && slots && slots.length === 0 && (
              <p className="text-foreground/70">Inga lediga tider detta datum. Prova ett annat datum.</p>
            )}
            {slots && slots.length > 0 && (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((iso) => (
                  <li key={iso}>
                    <button
                      type="button"
                      aria-pressed={startAt === iso}
                      onClick={() => setStartAt(iso)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm font-medium ${
                        startAt === iso
                          ? "border-accent bg-accent text-black"
                          : "border-white/20 hover:border-accent"
                      }`}
                    >
                      {formatTimeIn(iso, timezone)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-8 flex gap-3">
            <button type="button" onClick={() => setStep("barber")} className={buttonSecondary}>
              Tillbaka
            </button>
            <button type="button" disabled={!startAt} onClick={() => setStep("details")} className={buttonPrimary}>
              Fortsätt
            </button>
          </div>
        </section>
      )}

      {step === "details" && service && barber && startAt && (
        <section aria-labelledby="step-heading">
          <h2 id="step-heading" ref={headingRef} tabIndex={-1} className="mt-1 text-2xl font-bold outline-none">
            Dina uppgifter
          </h2>
          <p className="mt-2 text-sm text-foreground/70">
            {service.name} hos {barber.name}, {formatDateLongIn(startAt, timezone)} kl.{" "}
            {formatTimeIn(startAt, timezone)}
          </p>

          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate className="mt-6 space-y-5">
            <div>
              <label htmlFor="customerName" className="text-sm font-medium">
                Namn
              </label>
              <input
                id="customerName"
                autoComplete="name"
                aria-invalid={!!errors.customerName}
                aria-describedby={errors.customerName ? "customerName-error" : undefined}
                className={inputClass}
                {...register("customerName")}
              />
              {errors.customerName && (
                <p id="customerName-error" role="alert" className="mt-1 text-sm text-red-400">
                  {errors.customerName.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="customerPhone" className="text-sm font-medium">
                Telefon
              </label>
              <input
                id="customerPhone"
                type="tel"
                autoComplete="tel"
                aria-invalid={!!errors.customerPhone}
                aria-describedby={errors.customerPhone ? "customerPhone-error" : undefined}
                className={inputClass}
                {...register("customerPhone")}
              />
              {errors.customerPhone && (
                <p id="customerPhone-error" role="alert" className="mt-1 text-sm text-red-400">
                  {errors.customerPhone.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="customerEmail" className="text-sm font-medium">
                E-post <span className="text-foreground/60">(valfritt)</span>
              </label>
              <input
                id="customerEmail"
                type="email"
                autoComplete="email"
                aria-invalid={!!errors.customerEmail}
                aria-describedby={errors.customerEmail ? "customerEmail-error" : undefined}
                className={inputClass}
                {...register("customerEmail")}
              />
              {errors.customerEmail && (
                <p id="customerEmail-error" role="alert" className="mt-1 text-sm text-red-400">
                  {errors.customerEmail.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="notes" className="text-sm font-medium">
                Meddelande <span className="text-foreground/60">(valfritt)</span>
              </label>
              <textarea
                id="notes"
                rows={3}
                aria-invalid={!!errors.notes}
                aria-describedby={errors.notes ? "notes-error" : undefined}
                className={inputClass}
                {...register("notes")}
              />
              {errors.notes && (
                <p id="notes-error" role="alert" className="mt-1 text-sm text-red-400">
                  {errors.notes.message}
                </p>
              )}
            </div>

            {/* Honeypot: dold för människor och skärmläsare */}
            <div aria-hidden className="absolute -left-[9999px]">
              <label htmlFor="website">Webbplats</label>
              <input id="website" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>

            <div>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  aria-invalid={!!errors.consent}
                  aria-describedby={errors.consent ? "consent-error" : undefined}
                  className="mt-1 h-5 w-5 shrink-0 accent-[#d4af37]"
                  {...register("consent")}
                />
                <span>
                  Jag godkänner att SH-Cutz sparar mina uppgifter för att hantera bokningen enligt{" "}
                  <Link
                    href="/integritet"
                    target="_blank"
                    className="text-accent underline underline-offset-4"
                  >
                    integritetspolicyn
                  </Link>
                  .
                </span>
              </label>
              {errors.consent && (
                <p id="consent-error" role="alert" className="mt-1 text-sm text-red-400">
                  {errors.consent.message}
                </p>
              )}
            </div>

            {submitError && (
              <p role="alert" className="text-red-400">
                {submitError}
              </p>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep("time")} className={buttonSecondary}>
                Tillbaka
              </button>
              <button type="submit" disabled={isSubmitting} className={buttonPrimary}>
                {isSubmitting ? "Bokar..." : "Boka tid"}
              </button>
            </div>
          </form>
        </section>
      )}

      {step === "done" && confirmation && (
        <section aria-labelledby="step-heading">
          <h2 id="step-heading" ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">
            Tack, din tid är bokad!
          </h2>
          <dl className="mt-6 divide-y divide-white/10 rounded-xl border border-white/10 text-sm">
            <SummaryRow label="Tjänst" value={confirmation.serviceName} />
            <SummaryRow label="Frisör" value={confirmation.barberName} />
            <SummaryRow label="Datum" value={formatDateLongIn(confirmation.startAt, timezone)} />
            <SummaryRow
              label="Tid"
              value={`${formatTimeIn(confirmation.startAt, timezone)}–${formatTimeIn(confirmation.endAt, timezone)}`}
            />
            <SummaryRow label="Pris" value={formatPrice(confirmation.priceSek)} />
          </dl>

          <div className="mt-6 rounded-xl border border-accent/40 p-4 text-sm">
            <p className="font-semibold">Spara din avbokningslänk</p>
            <p className="mt-1 text-foreground/70">
              Länken visas bara här. Använd den om du behöver avboka.
            </p>
            <a href={cancelUrl} className="mt-2 block break-all text-accent underline underline-offset-4">
              {cancelUrl}
            </a>
          </div>

          <Link href="/" className={`${buttonSecondary} mt-8 inline-block`}>
            Till startsidan
          </Link>
        </section>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 p-3">
      <dt className="text-foreground/70">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
