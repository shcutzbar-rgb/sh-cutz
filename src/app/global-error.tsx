"use client";

import "./globals.css";

// Ersätter hela layouten när själva rotlayouten kraschar.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="sv">
      <body className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Något gick fel</h1>
          <p className="mt-4 opacity-70">Försök igen om en stund.</p>
          <button
            type="button"
            onClick={reset}
            className="mt-8 rounded-full bg-accent px-6 py-3 font-semibold text-black"
          >
            Försök igen
          </button>
        </div>
      </body>
    </html>
  );
}
