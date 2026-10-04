"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { BarberAvatar } from "@/components/BarberAvatar";
import { Turnstile } from "@/components/Turnstile";
import { addDays, formatDateLongIn, formatTimeIn } from "@/lib/datetime";
import { formatDuration, formatPrice } from "@/lib/format";
import { buildIcs } from "@/lib/ics";
import { siteConfig } from "@/lib/site";
import { customerSchema, type CustomerFormValues } from "@/lib/validation/booking";
import type { Barber, Service } from "@/types/shop";

type Props = {
  services: Service[];
  barbers: Barber[];
  timezone: string;
  minDate: string;
  maxDate: string;
  address: string;
  turnstileSiteKey?: string;
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

const STEPS = [
  { key: "service", label: "Tjänst" },
  { key: "barber", label: "Frisör" },
  { key: "time", label: "Tid" },
  { key: "details", label: "Uppgifter" },
] as const;

const STEP_NUMBER: Record<Exclude<Step, "done">, number> = { service: 1, barber: 2, time: 3, details: 4 };

const inputClass =
  "mt-1 w-full min-h-12 rounded-sm border border-line bg-surface px-3 py-3 text-foreground placeholder:text-foreground/40 focus:border-accent";

const weekdayFmt = new Intl.DateTimeFormat("sv-SE", { weekday: "short", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("sv-SE", { month: "short", timeZone: "UTC" });

function buildDays(min: string, max: string): string[] {
  const days: string[] = [];
  for (let d = min; d <= max; d = addDays(d, 1)) days.push(d);
  return days;
}

export function BookingFlow({ services, barbers, timezone, minDate, maxDate, address, turnstileSiteKey }: Props) {
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
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);

  // Token går bara att använda en gång: montera om widgeten efter varje misslyckat försök.
  function resetCaptcha() {
    setCaptchaToken("");
    setCaptchaKey((k) => k + 1);
  }

  const headingRef = useRef<HTMLHeadingElement>(null);
  const slotsRequest = useRef(0);
  const days = useMemo(() => buildDays(minDate, maxDate), [minDate, maxDate]);

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

  function selectDate(next: string) {
    if (!service || !barber) return;
    setDate(next);
    void loadSlots(next, service, barber);
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
          turnstileToken: captchaToken,
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

      resetCaptcha();
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
      resetCaptcha();
      setSubmitError("Kunde inte nå servern. Kontrollera anslutningen och försök igen.");
    }
  }

  const nextDay = date && date < maxDate ? addDays(date, 1) : null;
  const done = step === "done";

  return (
    <div className="pb-20 lg:pb-0">
      <Stepper step={step} />

      <div className={`mt-10 grid gap-10 ${done ? "" : "lg:grid-cols-[minmax(0,1fr)_20rem]"}`}>
        <div>
          {step === "service" && (
            <section aria-labelledby="step-heading">
              <StepHeading headingRef={headingRef}>Välj tjänst</StepHeading>
              <ul className="mt-6 space-y-3">
                {services.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-pressed={service?.id === s.id}
                      onClick={() => {
                        if (service?.id !== s.id) {
                          setSlots(null);
                          setStartAt(null);
                        }
                        setService(s);
                        setStep("barber");
                      }}
                      className={`card flex w-full items-start justify-between gap-4 p-5 text-left ${
                        service?.id === s.id ? "!border-accent" : ""
                      }`}
                    >
                      <span>
                        <span className="display block text-2xl">{s.name}</span>
                        <span className="mt-1 block text-sm text-foreground/70">{s.description}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-display text-2xl font-bold text-accent">{formatPrice(s.priceSek)}</span>
                        <span className="block text-sm text-foreground/60">{formatDuration(s.durationMinutes)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {step === "barber" && service && (
            <section aria-labelledby="step-heading">
              <StepHeading headingRef={headingRef}>Välj frisör</StepHeading>
              <ul className="mt-6 space-y-3">
                {barbers.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      aria-pressed={barber?.id === b.id}
                      onClick={() => {
                        setBarber(b);
                        setStep("time");
                        // Förvälj första dagen så att lediga tider syns direkt.
                        const first = date || minDate;
                        setDate(first);
                        void loadSlots(first, service, b);
                      }}
                      className={`card flex w-full items-center gap-4 p-5 text-left ${
                        barber?.id === b.id ? "!border-accent" : ""
                      }`}
                    >
                      <BarberAvatar name={b.name} photoUrl={b.photoUrl} />
                      <span>
                        <span className="display block text-2xl">{b.name}</span>
                        {b.bio && <span className="mt-1 block text-sm text-foreground/70">{b.bio}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setStep("service")} className="btn btn-secondary mt-8">
                Tillbaka
              </button>
            </section>
          )}

          {step === "time" && service && barber && (
            <section aria-labelledby="step-heading">
              <StepHeading headingRef={headingRef}>Välj tid</StepHeading>
              <p className="mt-2 text-sm text-foreground/70">
                {service.name} hos {barber.name}
              </p>

              <p id="day-label" className="mt-8 text-sm font-medium">
                Datum
              </p>
              <ul
                aria-labelledby="day-label"
                className="-mx-4 mt-2 flex snap-x scroll-pl-4 gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:thin]"
              >
                {days.map((d) => {
                  const asDate = new Date(`${d}T12:00:00Z`);
                  const selected = d === date;
                  return (
                    <li key={d} className="snap-start">
                      <button
                        type="button"
                        aria-pressed={selected}
                        aria-label={formatDateLongIn(asDate, timezone)}
                        onClick={() => selectDate(d)}
                        className={`flex h-20 w-16 flex-col items-center justify-center rounded-sm border text-center transition-colors ${
                          selected ? "border-accent bg-accent text-black" : "border-line bg-surface hover:border-accent"
                        }`}
                      >
                        <span className="font-display text-xs uppercase tracking-[0.12em] opacity-80">
                          {weekdayFmt.format(asDate).replace(".", "")}
                        </span>
                        <span className="font-display text-2xl font-bold leading-tight">{Number(d.slice(8, 10))}</span>
                        <span className="text-[11px] uppercase opacity-70">{monthFmt.format(asDate).replace(".", "")}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6 min-h-24" aria-live="polite">
                {slotsLoading && (
                  <div aria-hidden className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {Array.from({ length: 8 }, (_, i) => (
                      <div key={i} className="h-12 animate-pulse rounded-sm bg-surface-2" />
                    ))}
                  </div>
                )}
                {slotsLoading && <p className="sr-only">Hämtar lediga tider...</p>}
                {slotsError && (
                  <p role="alert" className="text-red-400">
                    {slotsError}
                  </p>
                )}
                {!slotsLoading && slots && slots.length === 0 && (
                  <div className="card p-5">
                    <p className="font-medium">Inga lediga tider den här dagen.</p>
                    <p className="mt-1 text-sm text-foreground/70">Prova en annan dag.</p>
                    {nextDay && (
                      <button type="button" onClick={() => selectDate(nextDay)} className="btn btn-secondary btn-sm mt-4">
                        Visa nästa dag
                      </button>
                    )}
                  </div>
                )}
                {slots && slots.length > 0 && (
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((iso) => (
                      <li key={iso}>
                        <button
                          type="button"
                          aria-pressed={startAt === iso}
                          onClick={() => setStartAt(iso)}
                          className={`min-h-12 w-full rounded-sm border px-3 py-2 font-display text-lg tracking-wide transition-colors ${
                            startAt === iso
                              ? "border-accent bg-accent text-black"
                              : "border-line bg-surface hover:border-accent"
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
                <button type="button" onClick={() => setStep("barber")} className="btn btn-secondary">
                  Tillbaka
                </button>
                <button type="button" disabled={!startAt} onClick={() => setStep("details")} className="btn btn-primary">
                  Fortsätt
                </button>
              </div>
            </section>
          )}

          {step === "details" && service && barber && startAt && (
            <section aria-labelledby="step-heading">
              <StepHeading headingRef={headingRef}>Dina uppgifter</StepHeading>
              <p className="mt-2 text-sm text-foreground/70">
                {service.name} hos {barber.name}, {formatDateLongIn(startAt, timezone)} kl. {formatTimeIn(startAt, timezone)}
              </p>

              <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate className="mt-6 space-y-5">
                <Field id="customerName" label="Namn" error={errors.customerName?.message}>
                  <input
                    id="customerName"
                    autoComplete="name"
                    aria-invalid={!!errors.customerName}
                    aria-describedby={errors.customerName ? "customerName-error" : undefined}
                    className={inputClass}
                    {...register("customerName")}
                  />
                </Field>

                <Field id="customerPhone" label="Telefon" error={errors.customerPhone?.message}>
                  <input
                    id="customerPhone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    aria-invalid={!!errors.customerPhone}
                    aria-describedby={errors.customerPhone ? "customerPhone-error" : undefined}
                    className={inputClass}
                    {...register("customerPhone")}
                  />
                </Field>

                <Field
                  id="customerEmail"
                  label="E-post"
                  optional
                  hint="Behövs för bekräftelse och påminnelse. Utan e-post visas bokningsuppgifterna bara här."
                  error={errors.customerEmail?.message}
                >
                  <input
                    id="customerEmail"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    aria-invalid={!!errors.customerEmail}
                    aria-describedby={errors.customerEmail ? "customerEmail-error" : "customerEmail-hint"}
                    className={inputClass}
                    {...register("customerEmail")}
                  />
                </Field>

                <Field id="notes" label="Meddelande" optional error={errors.notes?.message}>
                  <textarea
                    id="notes"
                    rows={3}
                    aria-invalid={!!errors.notes}
                    aria-describedby={errors.notes ? "notes-error" : undefined}
                    className={inputClass}
                    {...register("notes")}
                  />
                </Field>

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
                      <Link href="/integritet" target="_blank" className="text-accent underline underline-offset-4">
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

                <Turnstile key={captchaKey} siteKey={turnstileSiteKey} onToken={setCaptchaToken} />

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep("time")} className="btn btn-secondary">
                    Tillbaka
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (Boolean(turnstileSiteKey) && !captchaToken)}
                    className="btn btn-primary"
                  >
                    {isSubmitting ? "Bokar..." : "Boka tid"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {done && confirmation && (
            <section aria-labelledby="step-heading" className="mx-auto max-w-xl">
              <span
                aria-hidden
                className="flex h-14 w-14 items-center justify-center rounded-full border border-accent text-2xl text-accent"
              >
                ✓
              </span>
              <h2
                id="step-heading"
                ref={headingRef}
                tabIndex={-1}
                className="display mt-5 text-4xl outline-none sm:text-5xl"
              >
                Tack, din tid är bokad!
              </h2>

              <dl className="card mt-8 divide-y divide-line text-sm">
                <SummaryRow label="Tjänst" value={confirmation.serviceName} />
                <SummaryRow label="Frisör" value={confirmation.barberName} />
                <SummaryRow label="Datum" value={formatDateLongIn(confirmation.startAt, timezone)} />
                <SummaryRow
                  label="Tid"
                  value={`${formatTimeIn(confirmation.startAt, timezone)}–${formatTimeIn(confirmation.endAt, timezone)}`}
                />
                <SummaryRow label="Pris" value={formatPrice(confirmation.priceSek)} />
                <SummaryRow label="Adress" value={address} />
              </dl>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={`data:text/calendar;charset=utf-8,${encodeURIComponent(
                    buildIcs({
                      uid: `${confirmation.id}@sh-cutz`,
                      start: confirmation.startAt,
                      end: confirmation.endAt,
                      summary: `${confirmation.serviceName} hos ${siteConfig.name}`,
                      location: address,
                      description: `Frisör: ${confirmation.barberName}`,
                    }),
                  )}`}
                  download="sh-cutz-bokning.ics"
                  className="btn btn-primary btn-sm"
                >
                  Lägg i kalender
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  Vägbeskrivning (ny flik)
                </a>
              </div>

              <div className="mt-8 border-l-2 border-accent bg-surface p-5 text-sm">
                <p className="display text-lg text-accent">Spara din avbokningslänk</p>
                <p className="mt-2 text-foreground/75">
                  Länken visas bara här. Om du angav e-post skickar vi även en bekräftelse med länken. Använd den om du
                  behöver avboka.
                </p>
                <a href={cancelUrl} className="mt-3 block break-all text-accent underline underline-offset-4">
                  {cancelUrl}
                </a>
              </div>

              <Link href="/" className="btn btn-secondary mt-10">
                Till startsidan
              </Link>
            </section>
          )}
        </div>

        {!done && (
          <aside aria-label="Din bokning" className="card hidden self-start p-6 lg:sticky lg:top-28 lg:block">
            <p className="eyebrow">Din bokning</p>
            <dl className="mt-5 space-y-4 text-sm">
              <SideRow label="Tjänst" value={service?.name} />
              <SideRow label="Frisör" value={barber?.name} />
              <SideRow label="Datum" value={startAt ? formatDateLongIn(startAt, timezone) : undefined} />
              <SideRow label="Tid" value={startAt ? formatTimeIn(startAt, timezone) : undefined} />
            </dl>
            <div className="mt-6 flex items-end justify-between border-t border-line pt-4">
              <span className="text-sm text-foreground/60">{service ? formatDuration(service.durationMinutes) : ""}</span>
              <span className="font-display text-3xl font-bold leading-none text-accent">
                {service ? formatPrice(service.priceSek) : "–"}
              </span>
            </div>
          </aside>
        )}
      </div>

      {!done && service && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 text-sm">
            <p className="min-w-0 truncate">
              {service.name}
              {barber ? ` · ${barber.name}` : ""}
              {startAt ? ` · ${formatTimeIn(startAt, timezone)}` : ""}
            </p>
            <p className="shrink-0 font-display text-xl font-bold text-accent">{formatPrice(service.priceSek)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const current = step === "done" ? STEPS.length : STEP_NUMBER[step] - 1;

  return (
    <div>
      <ol aria-label="Bokningssteg" className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          return (
            <li
              key={s.key}
              aria-current={state === "current" ? "step" : undefined}
              className="flex flex-1 items-center gap-2 last:flex-none"
            >
              <span
                aria-hidden
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-display text-base ${
                  state === "done"
                    ? "border-accent bg-accent text-black"
                    : state === "current"
                      ? "border-accent text-accent"
                      : "border-line text-foreground/50"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span
                className={`sr-only font-display text-sm uppercase tracking-[0.14em] sm:not-sr-only ${
                  state === "todo" ? "text-foreground/50" : "text-foreground"
                }`}
              >
                {state === "done" ? <span className="sr-only">Klart: </span> : null}
                {s.label}
              </span>
              {i < STEPS.length - 1 && <span aria-hidden className={`h-px flex-1 ${i < current ? "bg-accent" : "bg-line"}`} />}
            </li>
          );
        })}
      </ol>
      {step !== "done" && (
        <p className="mt-3 text-sm text-foreground/60 sm:hidden">
          Steg {STEP_NUMBER[step]} av {STEPS.length}
        </p>
      )}
    </div>
  );
}

function StepHeading({ headingRef, children }: { headingRef: React.RefObject<HTMLHeadingElement | null>; children: React.ReactNode }) {
  return (
    <h2 id="step-heading" ref={headingRef} tabIndex={-1} className="display text-3xl outline-none sm:text-4xl">
      {children}
    </h2>
  );
}

function Field({
  id,
  label,
  optional,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {optional && <span className="text-foreground/55"> (valfritt)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-foreground/60">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 p-4">
      <dt className="text-foreground/65">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function SideRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.18em] text-foreground/50">{label}</dt>
      <dd className={value ? "mt-1 font-medium" : "mt-1 text-foreground/40"}>{value ?? "Ej vald"}</dd>
    </div>
  );
}
