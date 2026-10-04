// Körs automatiskt före `npm run deploy` och `npm run upload` (npm pre-script).
// Stoppar deploy när sajten skulle gå live med utkast: obekräftade uppgifter, seed-öppettider,
// platshållarbilder eller en adress som inte är produktionsadressen.
// Undantag för test-/stagingmiljö: ALLOW_DRAFT_DEPLOY=1.
import fs from "node:fs";
import { fetchDatabaseReadiness, loadEnv } from "./launch-status.mjs";

const env = loadEnv();
const blockers = [];
const warnings = [];

const site = env.NEXT_PUBLIC_SITE_URL;
if (!site) blockers.push("NEXT_PUBLIC_SITE_URL saknas: sitemap, canonical och OG-bild skulle peka på localhost.");
else if (!/^https:\/\//.test(site) || /localhost|127\.0\.0\.1|example\.(com|org|net)/.test(site)) {
  blockers.push(`NEXT_PUBLIC_SITE_URL (${site}) är inte en riktig https-adress.`);
}

const gallery = fs.existsSync("src/lib/gallery.ts") ? fs.readFileSync("src/lib/gallery.ts", "utf8") : "";
if (/placeholder-\d+\.svg/.test(gallery)) {
  blockers.push("Galleriet använder platshållarbilder (public/gallery/placeholder-*.svg). Byt mot riktiga foton i src/lib/gallery.ts.");
}

const db = await fetchDatabaseReadiness({ env });
blockers.push(...db.blockers);
warnings.push(...db.warnings);

for (const w of warnings) console.warn(`VARNING  ${w}`);

if (blockers.length > 0) {
  const allow = env.ALLOW_DRAFT_DEPLOY === "1";
  for (const b of blockers) console.error(`${allow ? "TILLÅTET " : "STOPP    "}${b}`);
  if (allow) {
    console.warn("\nALLOW_DRAFT_DEPLOY=1: fortsätter trots utkast. Använd aldrig detta för produktion.");
  } else {
    console.error(`\n${blockers.length} problem hindrar deploy. Åtgärda dem (se README, Go-live) eller sätt ALLOW_DRAFT_DEPLOY=1 för en test-/stagingmiljö.`);
    process.exit(1);
  }
} else {
  console.log("Launch-kontrollen godkänd: uppgifter bekräftade, inga platshållare.");
}
