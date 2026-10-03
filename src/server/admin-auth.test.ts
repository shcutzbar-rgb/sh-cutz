import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  role: null as string | null,
}));

vi.mock("@/lib/supabase-server", () => ({
  createSessionClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: state.role ? { role: state.role } : null }) }),
      }),
    }),
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import {
  AdminAuthError,
  hasRole,
  requireAdminAction,
  requireAdminPage,
  resolveAdmin,
} from "./admin-auth";
import { guardAction } from "./admin-action";

const signedIn = (role: string | null) => {
  state.user = { id: "u1", email: "a@example.com" };
  state.role = role;
};

beforeEach(() => {
  state.user = null;
  state.role = null;
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

  it("ger roll och användare för admin", async () => {
    signedIn("staff");
    const result = await resolveAdmin();
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.admin).toMatchObject({ userId: "u1", role: "staff" });
  });

  it("behandlar saknad Supabase-konfiguration som anonym", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    signedIn("owner");
    expect(await resolveAdmin()).toEqual({ status: "anonymous" });
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
});
