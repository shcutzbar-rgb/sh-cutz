import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "./turnstile";

const env = process.env as Record<string, string | undefined>;
const original = { secret: env.TURNSTILE_SECRET_KEY, nodeEnv: env.NODE_ENV };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  env.TURNSTILE_SECRET_KEY = original.secret;
  env.NODE_ENV = original.nodeEnv;
});

const stubFetch = (impl: (url: string, init: RequestInit) => Promise<Response>) => {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
};

describe("verifyTurnstile", () => {
  it("hoppar över kontrollen i utveckling utan secret", async () => {
    delete env.TURNSTILE_SECRET_KEY;
    env.NODE_ENV = "development";
    expect(await verifyTurnstile(undefined)).toBe(true);
  });

  it("blockerar i produktion utan secret", async () => {
    delete env.TURNSTILE_SECRET_KEY;
    env.NODE_ENV = "production";
    expect(await verifyTurnstile("token")).toBe(false);
  });

  it("nekar saknad token när secret finns, utan att anropa Cloudflare", async () => {
    env.TURNSTILE_SECRET_KEY = "s";
    const fetchMock = stubFetch(async () => Response.json({ success: true }));
    expect(await verifyTurnstile("")).toBe(false);
    expect(await verifyTurnstile(undefined)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skickar secret, token och IP och godkänner success: true", async () => {
    env.TURNSTILE_SECRET_KEY = "s";
    const fetchMock = stubFetch(async () => Response.json({ success: true }));
    expect(await verifyTurnstile("tok", "1.2.3.4")).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const body = init.body as URLSearchParams;
    expect(body.get("secret")).toBe("s");
    expect(body.get("response")).toBe("tok");
    expect(body.get("remoteip")).toBe("1.2.3.4");
  });

  it("nekar när Cloudflare säger success: false, HTTP-fel eller nätverksfel", async () => {
    env.TURNSTILE_SECRET_KEY = "s";
    stubFetch(async () => Response.json({ success: false }));
    expect(await verifyTurnstile("tok")).toBe(false);
    stubFetch(async () => new Response("err", { status: 500 }));
    expect(await verifyTurnstile("tok")).toBe(false);
    stubFetch(async () => {
      throw new Error("nätverk");
    });
    expect(await verifyTurnstile("tok")).toBe(false);
  });

  it("utelämnar remoteip för okänd IP", async () => {
    env.TURNSTILE_SECRET_KEY = "s";
    const fetchMock = stubFetch(async () => Response.json({ success: true }));
    await verifyTurnstile("tok", "unknown");
    expect((fetchMock.mock.calls[0][1].body as URLSearchParams).has("remoteip")).toBe(false);
  });
});
