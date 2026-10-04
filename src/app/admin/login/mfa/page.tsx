import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveAdmin } from "@/server/admin-auth";
import { logout } from "../../actions";
import { verifyMfa } from "./actions";

export const metadata: Metadata = {
  title: "Tvåstegsverifiering",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  invalid: "Fel kod. Kontrollera koden i din autentiseringsapp och försök igen.",
  format: "Ange den sexsiffriga koden från din autentiseringsapp.",
  rate: "För många försök. Vänta en stund och försök igen.",
  unavailable: "Verifieringen kunde inte genomföras just nu. Försök igen om en stund.",
};

export default async function MfaLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const resolved = await resolveAdmin();
  if (resolved.status === "anonymous" || resolved.status === "not_admin") redirect("/admin/login");
  if (resolved.status === "ok") redirect("/admin");
  if (resolved.status === "mfa_enrollment_required") redirect("/admin/sakerhet?required=1");

  const { error } = await searchParams;
  const message = error ? MESSAGES[error] : undefined;

  return (
    <section className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Tvåstegsverifiering</h1>
      <p className="mt-2 text-sm text-foreground/70">Ange den sexsiffriga koden från din autentiseringsapp.</p>

      {message && (
        <p role="alert" className="mt-6 rounded-lg border border-red-400/40 p-3 text-sm text-red-400">
          {message}
        </p>
      )}

      <form action={verifyMfa} className="mt-6 space-y-4">
        <div>
          <label htmlFor="code" className="text-sm font-medium">
            Kod
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            className="mt-1 w-full min-h-12 rounded-sm border border-line bg-surface px-3 py-2 text-lg tracking-widest text-foreground focus:border-accent"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary w-full"
        >
          Verifiera
        </button>
      </form>

      <form action={logout} className="mt-6 text-center">
        <button type="submit" className="text-sm text-foreground/70 underline underline-offset-4 hover:text-foreground">
          Logga ut
        </button>
      </form>
    </section>
  );
}
