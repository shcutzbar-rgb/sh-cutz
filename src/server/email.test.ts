import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@getbrevo/brevo", () => ({
  BrevoClient: class {
    transactionalEmails = { sendTransacEmail: state.send };
  },
}));

import { sendEmail } from "./email";

const message = { subject: "Test", text: "Text body", html: "<p>HTML body</p>" };

describe("sendEmail via Brevo", () => {
  beforeEach(() => {
    state.send.mockReset();
    vi.stubEnv("BREVO_API_KEY", "test-key");
    vi.stubEnv("BREVO_SENDER_EMAIL", "sh.cutzbar@gmail.com");
    vi.stubEnv("BREVO_SENDER_NAME", "SH-Cutz");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("skickar text och HTML via Brevos transactional email API", async () => {
    state.send.mockResolvedValue({ messageId: "mock-id" });
    await expect(sendEmail("customer@example.com", message)).resolves.toBe(true);
    expect(state.send).toHaveBeenCalledWith({
      sender: { name: "SH-Cutz", email: "sh.cutzbar@gmail.com" },
      to: [{ email: "customer@example.com" }],
      subject: "Test",
      textContent: "Text body",
      htmlContent: "<p>HTML body</p>",
    });
  });

  it("hoppar över e-post utan API-nyckel eller avsändare", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("BREVO_API_KEY", "");
    await expect(sendEmail("customer@example.com", message)).resolves.toBe(false);
    expect(state.send).not.toHaveBeenCalled();
  });

  it("låter inte Brevo-fel fälla bokningsflödet", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.send.mockRejectedValue(new Error("Brevo unavailable"));
    await expect(sendEmail("customer@example.com", message)).resolves.toBe(false);
  });
});
