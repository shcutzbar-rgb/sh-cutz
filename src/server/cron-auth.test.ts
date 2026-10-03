import { describe, expect, it } from "vitest";
import { isAuthorizedCron } from "./cron-auth";
import { clientIp, isRateLimited, isSameOrigin } from "./request-guards";

const req = (headers: Record<string, string>, url = "https://sh-cutz.example/api/x") =>
  new Request(url, { method: "POST", headers });

describe("isAuthorizedCron", () => {
  it("godkänner rätt bearer-token", () => {
    expect(isAuthorizedCron(req({ authorization: "Bearer hemlig" }), "hemlig")).toBe(true);
  });

  it("nekar fel, saknad eller felformaterad token", () => {
    expect(isAuthorizedCron(req({ authorization: "Bearer fel" }), "hemlig")).toBe(false);
    expect(isAuthorizedCron(req({ authorization: "Bearer hemlig2" }), "hemlig")).toBe(false);
    expect(isAuthorizedCron(req({ authorization: "hemlig" }), "hemlig")).toBe(false);
    expect(isAuthorizedCron(req({}), "hemlig")).toBe(false);
  });

  it("nekar alltid när hemligheten saknas", () => {
    expect(isAuthorizedCron(req({ authorization: "Bearer " }), undefined)).toBe(false);
    expect(isAuthorizedCron(req({ authorization: "Bearer x" }), "")).toBe(false);
  });
});

describe("request-guards", () => {
  it("isSameOrigin kräver matchande Origin", () => {
    expect(isSameOrigin(req({ origin: "https://sh-cutz.example" }))).toBe(true);
    expect(isSameOrigin(req({ origin: "https://evil.example" }))).toBe(false);
    expect(isSameOrigin(req({}))).toBe(false);
  });

  it("isRateLimited blockerar efter gränsen och återställs efter fönstret", () => {
    const key = `test:${Math.random()}`;
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) expect(isRateLimited(key, 3, 1000, t0)).toBe(false);
    expect(isRateLimited(key, 3, 1000, t0)).toBe(true);
    expect(isRateLimited(key, 3, 1000, t0 + 1001)).toBe(false);
  });

  it("clientIp föredrar cf-connecting-ip", () => {
    expect(clientIp(req({ "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" }))).toBe("1.2.3.4");
    expect(clientIp(req({ "x-forwarded-for": "9.9.9.9, 8.8.8.8" }))).toBe("9.9.9.9");
    expect(clientIp(req({}))).toBe("unknown");
  });
});
