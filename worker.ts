// Egen worker: återanvänder OpenNext-handlern, lägger till felrapportering (Sentry) och en schemalagd körning.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore `.open-next/worker.js` genereras vid bygge
import { default as handler } from "./.open-next/worker.js";
import * as Sentry from "@sentry/cloudflare";
import { scrubSentryEvent } from "./src/lib/sentry-scrub";

type Env = CloudflareEnv & { CRON_SECRET?: string; SENTRY_DSN?: string; SENTRY_ENVIRONMENT?: string };

// Utan SENTRY_DSN är Sentry avstängt.
export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? "production",
    tracesSampleRate: 0,
    beforeSend: scrubSentryEvent,
  }),
  {
    fetch: handler.fetch,

    async scheduled(_event, env, ctx) {
      if (!env.CRON_SECRET || !env.WORKER_SELF_REFERENCE) {
        Sentry.captureMessage("Påminnelsejobbet kan inte köras: CRON_SECRET eller WORKER_SELF_REFERENCE saknas", "error");
        return;
      }
      // Går via self-reference så att körningen använder samma kod och miljö som webben.
      ctx.waitUntil(
        env.WORKER_SELF_REFERENCE.fetch("https://self/api/cron/reminders", {
          method: "POST",
          headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
        })
          .then((res) => {
            if (!res.ok) Sentry.captureMessage(`Påminnelsejobbet misslyckades med status ${res.status}`, "error");
          })
          .catch((err) => Sentry.captureException(err)),
      );
    },
  } satisfies ExportedHandler<Env>,
);
