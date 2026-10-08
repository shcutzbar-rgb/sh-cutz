// Kontrollerar en körande sajt mot go-live-checklistan i PLAN.md.
// Användning: npm run check:live -- https://din-domän.se   (standard: http://localhost:3000)
import { fetchDatabaseReadiness, loadEnv } from "./launch-status.mjs";

const base = new URL(process.argv[2] ?? "http://localhost:3000");
const origin = base.origin;
const results = [];

const add = (level, name, detail = "") => results.push({ level, name, detail });
const pass = (name) => add("PASS", name);
const check = (ok, name, detail, level = "FAIL") => (ok ? pass(name) : add(level, name, detail));

async function get(path, options = {}) {
  try {
    const res = await fetch(new URL(path, origin), { redirect: "manual", ...options });
    return { res, text: options.method === "HEAD" ? "" : await res.text() };
  } catch (err) {
    return { res: null, text: "", error: err instanceof Error ? err.message : String(err) };
  }
}

const meta = (html, attr, key) => {
  const m = new RegExp(`<meta[^>]+${attr}="${key}"[^>]*content="([^"]*)"`, "i").exec(html);
  return m?.[1];
};

// --- Drift ---
const isLocal = ["localhost", "127.0.0.1"].includes(base.hostname);
check(base.protocol === "https:" || isLocal, "HTTPS används", `Adressen är ${origin}; produktion ska vara https`);

const health = await get("/api/health");
check(health.res?.status === 200 && health.text.includes('"ok"'), "Hälsokontroll /api/health svarar ok", `Status ${health.res?.status ?? health.error}: databasen svarar inte eller är inte konfigurerad`);

// --- SEO ---
const robots = await get("/robots.txt");
for (const p of ["/admin", "/avboka", "/api"]) {
  check(robots.text.includes(`Disallow: ${p}`), `robots.txt stänger ${p}`, "Saknas i robots.txt");
}
const sitemapLine = /Sitemap:\s*(\S+)/i.exec(robots.text)?.[1];
check(sitemapLine?.startsWith(origin), "robots.txt pekar på sitemap på rätt domän", `Fick ${sitemapLine ?? "ingen sitemap"}. Sätt NEXT_PUBLIC_SITE_URL vid bygge`);

const sitemap = await get("/sitemap.xml");
const locs = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
check(locs.length > 0 && locs.every((l) => l.startsWith(origin)), "sitemap.xml listar sidor på rätt domän", `Fick ${locs.slice(0, 2).join(", ") || "inga sidor"}. Sätt NEXT_PUBLIC_SITE_URL vid bygge`);
check(!locs.some((l) => /\/(admin|avboka|api)/.test(l)), "sitemap.xml innehåller inga privata sidor", "Privata sidor i sitemap");

const home = await get("/");
check(home.res?.status === 200, "Startsidan svarar 200", `Status ${home.res?.status ?? home.error}`);
check(/<html[^>]+lang="sv"/.test(home.text), "Startsidan har lang=sv", "lang saknas");
check(Boolean(meta(home.text, "name", "description")), "Startsidan har meta description", "Saknas");
const canonical = /<link rel="canonical" href="([^"]+)"/.exec(home.text)?.[1];
check(canonical?.replace(/\/$/, "") === origin, "Canonical pekar på rätt domän", `Fick ${canonical ?? "ingen"}. Sätt NEXT_PUBLIC_SITE_URL vid bygge`);
const ogImage = meta(home.text, "property", "og:image");
check(Boolean(ogImage?.startsWith(origin)), "og:image är absolut och på rätt domän", `Fick ${ogImage ?? "ingen"}`);
if (ogImage) {
  const img = await get(new URL(ogImage).pathname, { method: "HEAD" });
  check(img.res?.status === 200 && (img.res.headers.get("content-type") ?? "").startsWith("image/"), "OG-bilden går att hämta", `Status ${img.res?.status}`);
}

const ld = (() => {
  const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(home.text);
  try {
    return m ? JSON.parse(m[1]) : null;
  } catch {
    return null;
  }
})();
check(ld?.["@type"] === "HairSalon", "JSON-LD (HairSalon) finns och är giltig", "Saknas eller ogiltig JSON");
if (ld) {
  check(Boolean(ld.telephone && ld.address?.streetAddress), "JSON-LD har telefon och gatuadress", "Saknas");
  check((ld.openingHoursSpecification ?? []).length > 0, "JSON-LD har öppettider", "Inga öppettider");
  check(Boolean(ld.address?.postalCode), "JSON-LD har postnummer", "Saknas: fyll i under Admin > Inställningar", "WARN");
  check(Boolean(ld.geo), "JSON-LD har geo-koordinater", "Saknas: fyll i latitud/longitud under Admin > Inställningar", "WARN");
  check(Boolean(ld.email), "JSON-LD har e-post", "Saknas: fyll i under Admin > Inställningar", "WARN");
}

// --- Policy och innehåll ---
const privacy = await get("/integritet");
check(privacy.res?.status === 200 && privacy.text.includes("Personuppgiftsansvarig"), "Integritetspolicyn finns", `Status ${privacy.res?.status}`);
check(home.text.includes('href="/integritet"'), "Footern länkar till integritetspolicyn", "Länk saknas");

const gallery = await get("/galleri");
check(!gallery.text.includes("placeholder-"), "Galleriet visar riktiga bilder", "Galleriet använder fortfarande platshållarbilder (public/gallery/placeholder-*.svg)", "WARN");

// --- Utkast och bekräftelse ---
const dbEnv = loadEnv();
if (dbEnv.NEXT_PUBLIC_SUPABASE_URL && (dbEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || dbEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
  const readiness = await fetchDatabaseReadiness({ env: dbEnv });
  check(readiness.blockers.length === 0, "Kontaktuppgifter och öppettider är bekräftade (inga seed-värden)", readiness.blockers.join("\n       "));
  for (const w of readiness.warnings) add("WARN", w);
} else {
  add("WARN", "Bekräftelse av kontaktuppgifter och öppettider kunde inte kontrolleras", "Ange NEXT_PUBLIC_SUPABASE_URL och NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY i miljön eller .env.production.local");
}

// --- Säkerhet ---
const adminRes = await get("/admin");
const loc = adminRes.res?.headers.get("location") ?? "";
check([302, 303, 307, 308].includes(adminRes.res?.status) && loc.includes("/admin/login"), "/admin kräver inloggning", `Status ${adminRes.res?.status}, location ${loc || "saknas"}`);
const login = await get("/admin/login");
check(/<meta name="robots" content="noindex/.test(login.text), "Inloggningssidan är noindex", "noindex saknas");

const h = home.res?.headers;
check(h?.get("x-content-type-options") === "nosniff", "Header: X-Content-Type-Options", "Saknas");
check(Boolean(h?.get("x-frame-options")), "Header: X-Frame-Options", "Saknas");
check(Boolean(h?.get("referrer-policy")), "Header: Referrer-Policy", "Saknas");
check(Boolean(h?.get("strict-transport-security")) || isLocal, "Header: Strict-Transport-Security (HSTS)", "Aktivera HSTS i Cloudflare: SSL/TLS > Edge Certificates", "WARN");
check(!h?.get("x-powered-by"), "Header: X-Powered-By är borttagen", "Läcker ramverk");

const notFound = await get("/finns-inte-alls");
check(notFound.res?.status === 404 && notFound.text.includes("Sidan hittades inte"), "404-sidan är svensk", `Status ${notFound.res?.status}`);

// --- Rapport ---
const icon = { PASS: "OK  ", WARN: "VARN", FAIL: "FEL " };
for (const r of results) console.log(`${icon[r.level]} ${r.name}${r.detail && r.level !== "PASS" ? `\n       ${r.detail}` : ""}`);
const count = (l) => results.filter((r) => r.level === l).length;
console.log(`\n${origin}: ${count("PASS")} ok, ${count("WARN")} varningar, ${count("FAIL")} fel`);
process.exit(count("FAIL") > 0 ? 1 : 0);
