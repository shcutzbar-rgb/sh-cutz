import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { Flash, first, ui } from "@/components/admin/ui";
import { requireAdminPage } from "@/server/admin-auth";
import { logout } from "../actions";
import { EnrollTotp } from "./EnrollTotp";
import { removeFactor } from "./actions";

export const metadata: Metadata = {
  title: "Säkerhet",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Ligger utanför (panel)-layouten så att den nås även när MFA är påtvingat men ännu inte registrerat.
export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminPage("staff", { allowMfaEnrollment: true });
  const sp = await searchParams;
  const required = first(sp.required) === "1";

  const { data } = await admin.supabase.auth.mfa.listFactors();
  const factor = data?.totp?.[0];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <Link href="/admin" className="text-sm text-accent underline underline-offset-4">
          Till adminpanelen
        </Link>
        <form action={logout}>
          <button type="submit" className="btn btn-secondary btn-sm">
            Logga ut
          </button>
        </form>
      </header>

      <div className="py-6">
        <Flash ok={first(sp.ok)} error={first(sp.error)} />
        <h1 className="text-2xl font-bold tracking-tight">Säkerhet</h1>
        <p className="mt-1 text-sm text-foreground/70">Inloggad som {admin.email}.</p>

        {required && !factor && (
          <p role="alert" className="mt-4 rounded-lg border border-accent/40 p-3 text-sm text-accent">
            Ägaren kräver tvåstegsverifiering för alla admins. Aktivera den nedan för att fortsätta till adminpanelen.
          </p>
        )}

        <section className={`${ui.card} mt-6`} aria-labelledby="mfa-heading">
          <h2 id="mfa-heading" className="font-semibold">
            Tvåstegsverifiering (TOTP)
          </h2>

          {factor ? (
            <>
              <p className="mt-2 text-sm text-foreground/80">
                Aktiv. Du anger en kod från din autentiseringsapp varje gång du loggar in.
              </p>
              <form action={removeFactor} className="mt-4">
                <ConfirmButton
                  message="Ta bort tvåstegsverifieringen? Kontot skyddas då bara av lösenordet (eller måste registrera ny faktor om ägaren kräver MFA)."
                  className={ui.danger}
                >
                  Ta bort tvåstegsverifiering
                </ConfirmButton>
              </form>
            </>
          ) : (
            <div className="mt-3">
              <p className="mb-4 text-sm text-foreground/80">
                Skydda kontot med en engångskod från en autentiseringsapp utöver lösenordet. Spara inte
                hemligheten någon annanstans än i appen.
              </p>
              <EnrollTotp />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
