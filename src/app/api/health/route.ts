import { NextResponse } from "next/server";
import { isDatabaseHealthy } from "@/server/health";
import { clientIp, isRateLimited } from "@/server/request-guards";

const NO_STORE = { "Cache-Control": "no-store" };

// Endast "ok" eller "degraded": inga versioner, miljövariabler eller felmeddelanden.
async function check(request: Request) {
  if (isRateLimited(`health:${clientIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ status: "degraded" }, { status: 429, headers: NO_STORE });
  }
  const healthy = await isDatabaseHealthy();
  return NextResponse.json({ status: healthy ? "ok" : "degraded" }, { status: healthy ? 200 : 503, headers: NO_STORE });
}

export const GET = check;
export const HEAD = check;
