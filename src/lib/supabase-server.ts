import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Klient bunden till inloggad användares session (cookies). Respekterar RLS. */
export async function createSessionClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase är inte konfigurerat.");

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(items) {
        try {
          for (const { name, value, options } of items) cookieStore.set(name, value, options);
        } catch {
          // Anrop från Server Components får inte sätta cookies; proxy.ts förnyar sessionen.
        }
      },
    },
  });
}
