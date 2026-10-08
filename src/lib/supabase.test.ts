import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.hoisted(() => vi.fn(() => ({ client: true })));
vi.mock("@supabase/supabase-js", () => ({ createClient: createClientMock }));

import { createAnonClient, createServiceClient, isSupabaseConfigured } from "./supabase";

describe("Supabase clients", () => {
  beforeEach(() => {
    createClientMock.mockClear();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("accepts the publishable key as the RLS-respecting client key", () => {
    expect(isSupabaseConfigured()).toBe(true);
    createAnonClient();
    expect(createClientMock).toHaveBeenCalledWith("https://project.supabase.co", "sb_publishable_test");
  });

  it("uses the secret key only for the server client", () => {
    createServiceClient();
    expect(createClientMock).toHaveBeenCalledWith("https://project.supabase.co", "sb_secret_test", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it("continues to accept legacy anon and service-role key names", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "legacy-anon");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "legacy-service-role");

    createAnonClient();
    createServiceClient();

    expect(createClientMock).toHaveBeenNthCalledWith(1, "https://project.supabase.co", "legacy-anon");
    expect(createClientMock).toHaveBeenNthCalledWith(2, "https://project.supabase.co", "legacy-service-role", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });
});
