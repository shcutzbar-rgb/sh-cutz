import { beforeEach, describe, expect, it, vi } from "vitest";

type Factor = { factor_type: string; status: string };

const state = vi.hoisted(() => ({
  user: null as { id: string; email: string; factors?: Factor[] } | null,
  role: null as string | null,
  barberId: null as string | null,
  aal: "aal1" as string | null,
  claimsError: false,
  claimsThrows: false,
  enforced: false,
  settingsError: false,
  settingsMissing: false,
  getSessionCalls: 0,
}));

vi.mock("@/lib/supabase-server", () => ({
  createSessionClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user } }),
      getClaims: async () => {
        if (state.claimsThrows) throw new Error("jwks");
        if (state.claimsError) return { data: null, error: { message: "bad" } };
        return { data: { claims: state.aal ? { aal: state.aal } : {} }, error: null };
      },
      // Förfalskningsbar cookie-data: får aldrig användas för MFA-beslut.
      getSession: async () => {
        state.getSessionCalls++;
        return { data: { session: { user: { factors: [] }, access_token: "forged" } } };
      },
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (table === "shop_settings") {
              if (state.settingsError) return { data: null, error: { message: "db down" } };
              return { data: state.settingsMissing ? null : { require_admin_mfa: state.enforced }, error: null };
            }
            return { data: state.role ? { role: state.role, barber_id: state.barberId } : null };
          },
        }),
      }),
    }),
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { AdminAuthError, hasRole, requireAdminAction, requireAdminPage, resolveAdmin } from "./admin-auth";
import { guardAction } from "./admin-action";

const verified: Factor = { factor_type: "totp", status: "verified" };
const unverified: Factor = { factor_type: "totp", status: "unverified" };

const signedIn = (role: string | null, factors: Factor[] = []) => {
  state.user = { id: "u1", email: "a@example.com", factors };
  state.role = role;
};

beforeEach(() => {
  Object.assign(state, {
    user: null,
    role: null,
    barberId: null,
    aal: "aal1",
    claimsError: false,
    claimsThrows: false,
    enforced: false,
    settingsError: false,
    settingsMissing: false,
    getSessionCalls: 0,
  });
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
});

describe("hasRole", () => {
  it("ger owner allt och staff bara staff-behörighet", () => {
    expect(hasRole("owner", "owner")).toBe(true);
    expect(hasRole("owner", "staff")).toBe(true);
    expect(hasRole("staff", "staff")).toBe(true);
    expect(hasRole("staff", "owner")).toBe(false);
    expect(hasRole(null, "staff")).toBe(false);
    expect(hasRole(undefined, "owner")).toBe(false);
  });
});

describe("resolveAdmin", () => {
  it("anonym utan session", async () => {
    expect(await resolveAdmin()).toEqual({ status: "anonymous" });
  });

  it("inloggad användare utanför admin_users är inte admin", async () => {
    signedIn(null);
    expect(await resolveAdmin()).toEqual({ status: "not_admin" });
  });

  it("okänd roll i databasen nekas", async () => {
    signedIn("superuser");
    expect((await resolveAdmin()).status).toBe("not_admin");
  });

  it("ger roll och användare för admin utan MFA", async () => {
    signedIn("staff");
    const result = await resolveAdmin();
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.admin).toMatchObject({ userId: "u1", role: "staff" });
  });

  it("läser frisörkopplingen för personal, null som standard", async () => {
    signedIn("staff");
    let result = await resolveAdmin();
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.admin.barberId).toBeNull();
    state.barberId = "barber-1";
    result = await resolveAdmin();
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.admin.barberId).toBe("barber-1");
  });

  it("behandlar saknad Supabase-konfiguration som anonym", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    signedIn("owner");
    expect(await resolveAdmin()).toEqual({ status: "anonymous" });
  });
});

describe("resolveAdmin: AAL2 när användaren har en verifierad faktor", () => {
  it("kräver MFA när sessionen bara är AAL1", async () => {
    signedIn("owner", [verified]);
    state.aal = "aal1";
    expect(await resolveAdmin()).toEqual({ status: "mfa_required" });
  });

  it("släpper in vid AAL2", async () => {
    signedIn("owner", [verified]);
    state.aal = "aal2";
    expect((await resolveAdmin()).status).toBe("ok");
  });

  it("ignorerar overifierade faktorer och andra faktortyper", async () => {
    signedIn("staff", [unverified, { factor_type: "phone", status: "verified" }]);
    expect((await resolveAdmin()).status).toBe("ok");
  });

  it("fail closed: saknad, trasig eller felande AAL-claim ger mfa_required", async () => {
    signedIn("staff", [verified]);
    state.aal = null;
    expect((await resolveAdmin()).status).toBe("mfa_required");
    state.aal = "aal2";
    state.claimsError = true;
    expect((await resolveAdmin()).status).toBe("mfa_required");
    state.claimsError = false;
    state.claimsThrows = true;
    expect((await resolveAdmin()).status).toBe("mfa_required");
  });

  it("litar inte på cookie-sessionen: faktorer kommer från getUser, aldrig getSession", async () => {
    signedIn("owner", [verified]); // servern säger att en faktor finns
    state.aal = "aal1"; // cookiens förfalskade session säger inga faktorer
    expect((await resolveAdmin()).status).toBe("mfa_required");
    expect(state.getSessionCalls).toBe(0);
  });
});

describe("resolveAdmin: MFA påtvingat av ägaren", () => {
  it("kräver registrering när faktor saknas", async () => {
    signedIn("staff");
    state.enforced = true;
    const result = await resolveAdmin();
    expect(result.status).toBe("mfa_enrollment_required");
    if (result.status === "mfa_enrollment_required") expect(result.admin.role).toBe("staff");
  });

  it("släpper in användare som redan har faktor och AAL2", async () => {
    signedIn("staff", [verified]);
    state.enforced = true;
    state.aal = "aal2";
    expect((await resolveAdmin()).status).toBe("ok");
  });

  it("kräver fortfarande AAL2 för användare med faktor", async () => {
    signedIn("staff", [verified]);
    state.enforced = true;
    expect((await resolveAdmin()).status).toBe("mfa_required");
  });

  it("fail closed vid databasfel, men inte om inställningsraden saknas", async () => {
    signedIn("staff");
    state.settingsError = true;
    expect((await resolveAdmin()).status).toBe("mfa_enrollment_required");
    state.settingsError = false;
    state.settingsMissing = true;
    expect((await resolveAdmin()).status).toBe("ok");
  });
});

describe("requireAdminPage", () => {
  it("omdirigerar anonyma till inloggning", async () => {
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/admin/login");
  });

  it("omdirigerar icke-admins med forbidden", async () => {
    signedIn(null);
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/admin/login?error=forbidden");
  });

  it("släpper in staff på staff-sidor men skickar bort dem från owner-sidor", async () => {
    signedIn("staff");
    await expect(requireAdminPage("staff")).resolves.toMatchObject({ role: "staff" });
    await expect(requireAdminPage("owner")).rejects.toThrow("REDIRECT:/admin?denied=1");
  });

  it("släpper in owner överallt", async () => {
    signedIn("owner");
    await expect(requireAdminPage("owner")).resolves.toMatchObject({ role: "owner" });
  });

  it("skickar AAL1-sessioner med faktor till MFA-inloggningen", async () => {
    signedIn("owner", [verified]);
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/admin/login/mfa");
  });

  it("skickar användare utan faktor till registrering när MFA är påtvingat, utom på säkerhetssidan", async () => {
    signedIn("staff");
    state.enforced = true;
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/admin/sakerhet?required=1");
    await expect(requireAdminPage("staff", { allowMfaEnrollment: true })).resolves.toMatchObject({ role: "staff" });
  });

  it("tillåter inte registreringsläget att kringgå rollkontrollen", async () => {
    signedIn("staff");
    state.enforced = true;
    await expect(requireAdminPage("owner", { allowMfaEnrollment: true })).rejects.toThrow("REDIRECT:/admin?denied=1");
  });

  it("öppnar inte säkerhetssidan för AAL1-sessioner med faktor", async () => {
    signedIn("owner", [verified]);
    await expect(requireAdminPage("staff", { allowMfaEnrollment: true })).rejects.toThrow("REDIRECT:/admin/login/mfa");
  });
});

describe("requireAdminAction", () => {
  it("kastar unauthenticated för anonyma", async () => {
    await expect(requireAdminAction()).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("kastar forbidden för icke-admin och för staff som kräver owner", async () => {
    signedIn(null);
    await expect(requireAdminAction()).rejects.toMatchObject({ code: "forbidden" });
    signedIn("staff");
    await expect(requireAdminAction("owner")).rejects.toBeInstanceOf(AdminAuthError);
    await expect(requireAdminAction("staff")).resolves.toBeDefined();
  });

  it("kastar mfa_required för AAL1 med faktor", async () => {
    signedIn("owner", [verified]);
    await expect(requireAdminAction()).rejects.toMatchObject({ code: "mfa_required" });
    state.aal = "aal2";
    await expect(requireAdminAction()).resolves.toMatchObject({ role: "owner" });
  });

  it("kastar mfa_enrollment_required när MFA är påtvingat, utom för registreringsåtgärder", async () => {
    signedIn("staff");
    state.enforced = true;
    await expect(requireAdminAction()).rejects.toMatchObject({ code: "mfa_enrollment_required" });
    await expect(requireAdminAction("staff", { allowMfaEnrollment: true })).resolves.toBeDefined();
  });
});

describe("guardAction", () => {
  it("skickar anonyma till inloggning", async () => {
    await expect(guardAction("staff", "/admin/bokningar")).rejects.toThrow("REDIRECT:/admin/login");
  });

  it("ger felmeddelande på sidan när rollen inte räcker", async () => {
    signedIn("staff");
    await expect(guardAction("owner", "/admin/tjanster")).rejects.toThrow(
      /^REDIRECT:\/admin\/tjanster\?error=Du%20saknar%20beh%C3%B6righet/,
    );
  });

  it("returnerar admin när rollen räcker", async () => {
    signedIn("owner");
    await expect(guardAction("owner", "/admin/tjanster")).resolves.toMatchObject({ role: "owner" });
  });

  it("omdirigerar åtgärder från AAL1-sessioner till MFA-inloggningen", async () => {
    signedIn("owner", [verified]);
    await expect(guardAction("staff", "/admin/bokningar")).rejects.toThrow("REDIRECT:/admin/login/mfa");
  });

  it("omdirigerar åtgärder till registrering när MFA är påtvingat men saknas", async () => {
    signedIn("staff");
    state.enforced = true;
    await expect(guardAction("staff", "/admin/bokningar")).rejects.toThrow("REDIRECT:/admin/sakerhet?required=1");
    await expect(guardAction("staff", "/admin/sakerhet", { allowMfaEnrollment: true })).resolves.toBeDefined();
  });
});
