import { describe, expect, it } from "vitest";
import { generateCancelToken, hashToken } from "./tokens";

describe("cancel token", () => {
  it("genererar unika, URL-säkra tokens med tillräcklig längd", () => {
    const a = generateCancelToken();
    const b = generateCancelToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("hashar deterministiskt till 64 hextecken som inte innehåller token", async () => {
    const token = generateCancelToken();
    const hash = await hashToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(await hashToken(token));
    expect(hash).not.toContain(token);
  });

  it("matchar känt SHA-256-värde", async () => {
    expect(await hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
