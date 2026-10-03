// Egen worker: återanvänder OpenNext-handlern och lägger till en schemalagd körning för påminnelser.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore `.open-next/worker.js` genereras vid bygge
import { default as handler } from "./.open-next/worker.js";

type Env = CloudflareEnv & { CRON_SECRET?: string };

export default {
  fetch: handler.fetch,

  async scheduled(_event, env, ctx) {
    if (!env.CRON_SECRET || !env.WORKER_SELF_REFERENCE) {
      console.error("CRON_SECRET eller WORKER_SELF_REFERENCE saknas, hoppar över påminnelser.");
      return;
    }
    // Går via self-reference så att körningen använder samma kod och miljö som webben.
    ctx.waitUntil(
      env.WORKER_SELF_REFERENCE.fetch("https://self/api/cron/reminders", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
      }).then(async (res) => {
        if (!res.ok) console.error("Påminnelsejobbet misslyckades:", res.status, await res.text());
      }),
    );
  },
} satisfies ExportedHandler<Env>;
