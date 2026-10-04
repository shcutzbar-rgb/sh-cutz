import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mfaCodeSchema } from "@/lib/validation/admin";
import { completeMfaLogin, confirmTotpEnrollment, removeTotp, startTotpEnrollment } from "./admin-mfa";

const mfa = {
  listFactors: vi.fn(),
  challengeAndVerify: vi.fn(),
  enroll: vi.fn(),
  unenroll: vi.fn(),
};
const supabase = { auth: { mfa } } as unknown as SupabaseClient;

const verifiedFactor = { id: "f1", factor_type: "totp", status: "verified" };
const staleFactor = { id: "f0", factor_type: "totp", status: "unverified" };

beforeEach(() => {
  for (const fn of Object.values(mfa)) fn.mockReset();
  mfa.unenroll.mockResolvedValue({ error: null });
});

describe("mfaCodeSchema", () => {
  it("kräver exakt sex siffror", () => {
    expect(mfaCodeSchema.safeParse({ code: "123456" }).success).toBe(true);
    expect(mfaCodeSchema.safeParse({ code: " 123456 " }).success).toBe(true);
    for (const bad of ["12345", "1234567", "12345a", "", "123 456"]) {
      expect(mfaCodeSchema.safeParse({ code: bad }).success).toBe(false);
    }
  });
});

describe("completeMfaLogin", () => {
  it("verifierar mot den första verifierade faktorn", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [verifiedFactor], all: [verifiedFactor] }, error: null });
    mfa.challengeAndVerify.mockResolvedValue({ data: {}, error: null });
    expect(await completeMfaLogin(supabase, "123456")).toBe("ok");
    expect(mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: "f1", code: "123456" });
  });

  it("ger invalid vid fel kod", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [verifiedFactor] }, error: null });
    mfa.challengeAndVerify.mockResolvedValue({ data: null, error: { message: "Invalid TOTP code" } });
    expect(await completeMfaLogin(supabase, "000000")).toBe("invalid");
  });

  it("ger no_factor utan verifierad faktor och error vid läsfel, utan att försöka verifiera", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [], all: [staleFactor] }, error: null });
    expect(await completeMfaLogin(supabase, "123456")).toBe("no_factor");
    mfa.listFactors.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await completeMfaLogin(supabase, "123456")).toBe("error");
    expect(mfa.challengeAndVerify).not.toHaveBeenCalled();
  });
});

describe("startTotpEnrollment", () => {
  const enrolled = { data: { id: "f9", totp: { qr_code: "data:image/svg+xml;utf-8,<svg/>", secret: "ABC", uri: "otpauth://x" } }, error: null };

  it("registrerar en faktor och returnerar QR och hemlighet", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [], all: [] }, error: null });
    mfa.enroll.mockResolvedValue(enrolled);
    expect(await startTotpEnrollment(supabase)).toEqual({
      ok: true,
      factorId: "f9",
      qrCode: "data:image/svg+xml;utf-8,<svg/>",
      secret: "ABC",
    });
    expect(mfa.enroll).toHaveBeenCalledWith({ factorType: "totp", friendlyName: "SH-Cutz admin", issuer: "SH-Cutz" });
  });

  it("städar bort avbrutna overifierade faktorer före registrering", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [], all: [staleFactor] }, error: null });
    mfa.enroll.mockResolvedValue(enrolled);
    await startTotpEnrollment(supabase);
    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: "f0" });
  });

  it("nekar ny registrering när en verifierad faktor redan finns", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [verifiedFactor], all: [verifiedFactor] }, error: null });
    expect(await startTotpEnrollment(supabase)).toMatchObject({ ok: false });
    expect(mfa.enroll).not.toHaveBeenCalled();
  });

  it("returnerar fel utan detaljer när Supabase nekar", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [], all: [] }, error: null });
    mfa.enroll.mockResolvedValue({ data: null, error: { message: "internal db detail" } });
    const result = await startTotpEnrollment(supabase);
    expect(result).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).not.toContain("internal db detail");
  });
});

describe("confirmTotpEnrollment", () => {
  it("är true bara när koden stämmer", async () => {
    mfa.challengeAndVerify.mockResolvedValueOnce({ data: {}, error: null });
    expect(await confirmTotpEnrollment(supabase, "f9", "123456")).toBe(true);
    mfa.challengeAndVerify.mockResolvedValueOnce({ data: null, error: { message: "bad" } });
    expect(await confirmTotpEnrollment(supabase, "f9", "000000")).toBe(false);
  });
});

describe("removeTotp", () => {
  it("tar bort alla verifierade faktorer", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [verifiedFactor] }, error: null });
    expect(await removeTotp(supabase)).toEqual({ ok: true });
    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: "f1" });
  });

  it("returnerar fel när Supabase nekar (t.ex. sessionen är inte AAL2)", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [verifiedFactor] }, error: null });
    mfa.unenroll.mockResolvedValue({ error: { message: "AAL2 required" } });
    expect(await removeTotp(supabase)).toMatchObject({ ok: false });
  });
});
