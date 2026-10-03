import type { MetadataRoute } from "next";
import { publicPaths } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.map((path) => ({
    url: `${siteConfig.url}${path === "/" ? "" : path}`,
    changeFrequency: path === "/" || path === "/tjanster" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/boka" ? 0.9 : 0.7,
  }));
}
