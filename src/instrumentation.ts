import * as Sentry from "@sentry/cloudflare";
import type { Instrumentation } from "next";

// Fångar fel i server components, route handlers och server actions. Endast ruttmönstret skickas
// (t.ex. /avboka/[token]), aldrig den faktiska sökvägen eller indata.
export const onRequestError: Instrumentation.onRequestError = (error, _request, context) => {
  try {
    Sentry.captureException(error, {
      tags: { routeType: context.routeType, routePath: context.routePath, routerKind: context.routerKind },
    });
  } catch {
    // Felrapportering får aldrig orsaka nya fel.
  }
};
