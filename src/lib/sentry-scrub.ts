// Tar bort personuppgifter innan händelser lämnar servern. Avbokningstoken ligger i URL:en /avboka/<token>.
const TOKEN_IN_PATH = /(\/avboka\/)[A-Za-z0-9_-]{20,}/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

export function scrubString(value: string): string {
  return value.replace(TOKEN_IN_PATH, "$1[token]").replace(EMAIL, "[e-post]");
}

/** Scrubbar alla strängar rekursivt (t.ex. konsol-breadcrumbs med felmeddelanden och stackar). */
function scrubDeep(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return scrubString(value);
  if (depth > 12 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1));
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrubDeep(v, depth + 1)]));
}

type LooseEvent = {
  user?: unknown;
  request?: { headers?: unknown; cookies?: unknown; data?: unknown; query_string?: unknown };
};

export function scrubSentryEvent<T extends LooseEvent>(event: T): T {
  delete event.user;
  if (event.request) {
    delete event.request.headers;
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.query_string;
  }
  return scrubDeep(event) as T;
}
