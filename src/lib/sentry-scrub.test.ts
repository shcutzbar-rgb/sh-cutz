import { describe, expect, it } from "vitest";
import { scrubSentryEvent, scrubString } from "./sentry-scrub";

const token = "A".repeat(43);

describe("scrubString", () => {
  it("döljer avbokningstoken i sökvägar", () => {
    expect(scrubString(`https://sh-cutz.se/avboka/${token}`)).toBe("https://sh-cutz.se/avboka/[token]");
    expect(scrubString(`GET /avboka/${token}?x=1 failed`)).toBe("GET /avboka/[token]?x=1 failed");
  });

  it("döljer e-postadresser men lämnar övrig text", () => {
    expect(scrubString("Kunde inte skicka till anna@example.com nu")).toBe("Kunde inte skicka till [e-post] nu");
    expect(scrubString("/boka")).toBe("/boka");
  });
});

describe("scrubSentryEvent", () => {
  it("tar bort headers, cookies, body, query och användare och scrubbar url, meddelanden och breadcrumbs", () => {
    const event = scrubSentryEvent({
      message: "fel för bo@example.com",
      user: { ip_address: "1.2.3.4" },
      request: {
        url: `https://sh-cutz.se/avboka/${token}`,
        headers: { cookie: "sb=abc", authorization: "Bearer x" },
        cookies: { sb: "abc" },
        data: { customerName: "Anna", customerPhone: "070" },
        query_string: "a=1",
      },
      exception: { values: [{ value: `misslyckades på /avboka/${token}` }] },
      breadcrumbs: [
        { message: "hej anna@example.com", data: { url: `/avboka/${token}`, arguments: [{ message: "x anna@example.com", stack: `at /avboka/${token}` }] } },
      ],
    });

    expect(event.message).toBe("fel för [e-post]");
    expect(event.user).toBeUndefined();
    expect(event.request).toEqual({ url: "https://sh-cutz.se/avboka/[token]" });
    expect(event.exception?.values?.[0].value).toBe("misslyckades på /avboka/[token]");
    expect(event.breadcrumbs?.[0]).toEqual({
      message: "hej [e-post]",
      data: { url: "/avboka/[token]", arguments: [{ message: "x [e-post]", stack: "at /avboka/[token]" }] },
    });
    expect(JSON.stringify(event)).not.toContain(token);
    expect(JSON.stringify(event)).not.toContain("@example.com");
  });

  it("klarar händelser utan request och undantag", () => {
    expect(scrubSentryEvent({})).toEqual({});
  });
});
