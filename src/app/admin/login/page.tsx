import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Turnstile } from "@/components/Turnstile";
import { getTurnstileSiteKey } from "@/lib/turnstile";
import { resolveAdmin } from "@/server/admin-auth";
import { login } from "./actions";

export const metadata: Metadata = {
  title: "Logga in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  invalid: "Fel e-post eller lösenord.",
  forbidden: "Kontot har inte tillgång till adminpanelen.",
  rate: "För många försök. Vänta en stund och försök igen.",
  config: "Inloggning är inte konfigurerad (Supabase saknas).",
  captcha: "Verifieringen misslyckades. Ladda om sidan och försök igen.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if ((await resolveAdmin()).status === "ok") redirect("/admin");

  const { error } = await searchParams;
  const message = error ? MESSAGES[error] : undefined;
  const inputClass =
    "mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-foreground";

  return (
    <section className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
      <p className="mt-2 text-sm text-foreground/70">Logga in för att hantera bokningar.</p>

      {message && (
        <p role="alert" className="mt-6 rounded-lg border border-red-400/40 p-3 text-sm text-red-400">
          {message}
        </p>
      )}

      <form action={login} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            E-post
          </label>
          <input id="email" name="email" type="email" autoComplete="username" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium">
            Lösenord
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
          />
        </div>
        <Turnstile siteKey={getTurnstileSiteKey()} name="cf-turnstile-response" />
        <button
          type="submit"
          className="w-full rounded-full bg-accent px-6 py-3 font-semibold text-black hover:bg-accent/90"
        >
          Logga in
        </button>
      </form>
    </section>
  );
}
