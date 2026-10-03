// Verksamhetsinfo är utkast enligt PLAN.md och ska verifieras innan launch.
export const siteConfig = {
  name: "SH-Cutz",
  description: "Barbershop på Södermalm i Stockholm. Boka fade och skäggtrim online.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  timezone: process.env.NEXT_PUBLIC_TIMEZONE ?? "Europe/Stockholm",
  phone: "072-192 68 49",
  phoneHref: "tel:+46721926849",
  address: {
    street: "Folkungagatan 87",
    area: "Södermalm",
    city: "Stockholm",
  },
} as const;

export const navLinks = [
  { href: "/", label: "Hem" },
  { href: "/tjanster", label: "Tjänster" },
  { href: "/frisorer", label: "Frisörer" },
  { href: "/galleri", label: "Galleri" },
  { href: "/kontakt", label: "Kontakt" },
] as const;
