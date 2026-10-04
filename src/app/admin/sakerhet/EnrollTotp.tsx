"use client";

import { useActionState } from "react";
import { confirmEnrollment, startEnrollment, type EnrollState } from "./actions";

const primary =
  "rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent/90 disabled:opacity-50";

export function EnrollTotp() {
  const [start, startAction, starting] = useActionState<EnrollState>(startEnrollment, { step: "idle" });
  const [confirmError, confirmAction, confirming] = useActionState<string | null, FormData>(confirmEnrollment, null);

  if (start.step !== "verify") {
    return (
      <div>
        {start.step === "error" && (
          <p role="alert" className="mb-4 rounded-lg border border-red-400/40 p-3 text-sm text-red-400">
            {start.error}
          </p>
        )}
        <form action={startAction}>
          <button type="submit" disabled={starting} className={primary}>
            {starting ? "Förbereder..." : "Aktivera tvåstegsverifiering"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground/80">
        <li>Öppna en autentiseringsapp (t.ex. Google Authenticator, Microsoft Authenticator eller 1Password).</li>
        <li>Skanna QR-koden, eller skriv in hemligheten nedan manuellt.</li>
        <li>Ange den sexsiffriga koden som appen visar.</li>
      </ol>

      {/* Data-URI från Supabase; next/image behövs inte. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={start.qrCode} alt="QR-kod för autentiseringsappen" width={192} height={192} className="rounded-lg bg-white p-2" />

      <p className="text-sm">
        Hemlighet för manuell inmatning:{" "}
        <code className="select-all break-all rounded bg-white/10 px-1.5 py-0.5">{start.secret}</code>
      </p>

      {confirmError && (
        <p role="alert" className="rounded-lg border border-red-400/40 p-3 text-sm text-red-400">
          {confirmError}
        </p>
      )}

      <form action={confirmAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="factorId" value={start.factorId} />
        <div>
          <label htmlFor="enroll-code" className="text-sm font-medium">
            Kod från appen
          </label>
          <input
            id="enroll-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            className="mt-1 block w-40 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-lg tracking-widest text-foreground"
          />
        </div>
        <button type="submit" disabled={confirming} className={primary}>
          {confirming ? "Verifierar..." : "Bekräfta och aktivera"}
        </button>
      </form>
    </div>
  );
}
