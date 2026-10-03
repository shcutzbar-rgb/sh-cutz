"use client";

import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Kunde inte ladda Turnstile"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Cloudflare Turnstile. Utan siteKey renderas inget (utveckling).
 * Montera om med ny `key` för att få en ny token efter ett misslyckat försök.
 * Med `name` läggs token i ett dolt fält så att vanliga formulär och server actions får med den.
 */
export function Turnstile({
  siteKey,
  onToken,
  name,
}: {
  siteKey?: string;
  onToken?: (token: string) => void;
  name?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  const [token, setToken] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    let widgetId: string | undefined;

    const update = (value: string) => {
      setToken(value);
      onTokenRef.current?.(value);
    };

    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId = window.turnstile.render(container.current, {
          sitekey: siteKey,
          theme: "dark",
          language: "sv",
          callback: (value: string) => update(value),
          "expired-callback": () => update(""),
          "error-callback": () => {
            update("");
            setFailed(true);
          },
        });
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [siteKey]);

  if (!siteKey) return null;

  return (
    <div>
      <div ref={container} />
      {name && <input type="hidden" name={name} value={token} />}
      {failed && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          Bot-skyddet kunde inte laddas. Ladda om sidan eller försök igen om en stund.
        </p>
      )}
    </div>
  );
}
