import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { pageMetadata, publicPaths } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

describe("robots", () => {
  it("stänger admin, avboka och api men pekar på sitemap", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rules.disallow).toEqual(["/admin", "/avboka", "/api"]);
    expect(rules.allow).toBe("/");
    expect(r.sitemap).toBe(`${siteConfig.url}/sitemap.xml`);
  });
});

describe("sitemap", () => {
  it("listar de publika sidorna och inga privata", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toHaveLength(publicPaths.length);
    expect(urls[0]).toBe(siteConfig.url);
    expect(urls).toContain(`${siteConfig.url}/boka`);
    for (const url of urls) expect(url).not.toMatch(/\/(admin|avboka|api)/);
  });
});

describe("pageMetadata", () => {
  it("ger canonical, Open Graph och Twitter med konsekvent titel", () => {
    const m = pageMetadata({ title: "Kontakt", description: "Hitta hit", path: "/kontakt" });
    expect(m.alternates?.canonical).toBe("/kontakt");
    expect(m.openGraph).toMatchObject({ title: `Kontakt | ${siteConfig.name}`, url: "/kontakt", locale: "sv_SE" });
    expect(m.twitter).toMatchObject({ card: "summary_large_image", description: "Hitta hit" });
  });

  it("stöder absolut titel", () => {
    const m = pageMetadata({ title: "SH-Cutz – Hem", description: "x", path: "/", absoluteTitle: true });
    expect(m.title).toEqual({ absolute: "SH-Cutz – Hem" });
    expect(m.openGraph).toMatchObject({ title: "SH-Cutz – Hem" });
  });
});
