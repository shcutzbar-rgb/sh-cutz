import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Integritetspolicy",
  description: "Hur SH-Cutz hanterar dina personuppgifter vid bokning.",
  path: "/integritet",
});

// UTKAST: granska och komplettera (personuppgiftsansvarig, lagringstid) före launch.
export default function IntegritetPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight">Integritetspolicy</h1>

      <h2 className="mt-8 text-xl font-semibold">Vilka uppgifter sparas</h2>
      <p className="mt-2 text-foreground/70">
        Vid bokning sparar vi ditt namn, telefonnummer, e-postadress (om du anger den), eventuellt
        meddelande samt vald tjänst, frisör och tid.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Varför</h2>
      <p className="mt-2 text-foreground/70">
        Uppgifterna används för att hantera din bokning, kontakta dig om den och låta dig avboka.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Hur länge</h2>
      <p className="mt-2 text-foreground/70">[Lagringstid bekräftas av verksamheten före launch.]</p>

      <h2 className="mt-8 text-xl font-semibold">Radering och kontakt</h2>
      <p className="mt-2 text-foreground/70">
        Du kan begära registerutdrag eller radering av dina uppgifter genom att kontakta oss på{" "}
        <a href={siteConfig.phoneHref} className="text-accent underline underline-offset-4">
          {siteConfig.phone}
        </a>
        .
      </p>
    </section>
  );
}
