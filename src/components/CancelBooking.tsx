"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Turnstile } from "@/components/Turnstile";

type Status = "idle" | "loading" | "done" | "error";

export function CancelBooking({
  token,
  phone,
  turnstileSiteKey,
}: {
  token: string;
  phone: string;
  turnstileSiteKey?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (status === "done") headingRef.current?.focus();
  }, [status]);

  async function cancel() {
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, turnstileToken: captchaToken }),
      });
      if (res.ok) {
        setStatus("done");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setMessage(data.error ?? `Något gick fel. Försök igen eller ring ${phone}.`);
    } catch {
      setMessage(`Kunde inte nå servern. Försök igen eller ring ${phone}.`);
    }
    setStatus("error");
    setCaptchaToken("");
    setCaptchaKey((k) => k + 1);
  }

  if (status === "done") {
    return (
      <div className="mt-8">
        <h2 ref={headingRef} tabIndex={-1} className="display text-3xl outline-none">
          Din tid är avbokad
        </h2>
        <p className="mt-3 text-foreground/70">Tack för beskedet. Du är välkommen att boka en ny tid.</p>
        <Link href="/boka" className="btn btn-primary mt-8">
          Boka ny tid
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {status === "error" && (
        <p role="alert" className="mb-4 text-red-400">
          {message}
        </p>
      )}
      <Turnstile key={captchaKey} siteKey={turnstileSiteKey} onToken={setCaptchaToken} />
      <button
        type="button"
        onClick={cancel}
        disabled={status === "loading" || (Boolean(turnstileSiteKey) && !captchaToken)}
        className="btn btn-primary"
      >
        {status === "loading" ? "Avbokar..." : "Bekräfta avbokning"}
      </button>
    </div>
  );
}
