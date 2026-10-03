"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Status = "idle" | "loading" | "done" | "error";

export function CancelBooking({ token, phone }: { token: string; phone: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
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
        body: JSON.stringify({ token }),
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
  }

  if (status === "done") {
    return (
      <div className="mt-8">
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">
          Din tid är avbokad
        </h2>
        <p className="mt-2 text-foreground/70">Tack för beskedet. Du är välkommen att boka en ny tid.</p>
        <Link href="/boka" className="mt-6 inline-block rounded-full bg-accent px-8 py-3 font-semibold text-black">
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
      <button
        type="button"
        onClick={cancel}
        disabled={status === "loading"}
        className="rounded-full bg-accent px-8 py-3 font-semibold text-black hover:bg-accent/90 disabled:opacity-50"
      >
        {status === "loading" ? "Avbokar..." : "Bekräfta avbokning"}
      </button>
    </div>
  );
}
