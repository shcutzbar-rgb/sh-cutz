import { BOOKING_CONFIG } from "@/lib/booking-config";
import { pageMetadata } from "@/lib/seo";
import { getShopSettings } from "@/lib/shop-settings";

export const metadata = pageMetadata({
  title: "Integritetspolicy",
  description: "Hur SH-Cutz hanterar dina personuppgifter vid bokning: vad som sparas, hur länge och dina rättigheter.",
  path: "/integritet",
});

export const revalidate = 300;

// UTKAST: ska granskas juridiskt av verksamheten före launch.
export default async function IntegritetPage() {
  const shop = await getShopSettings();
  const h2 = "mt-8 text-xl font-semibold";
  const p = "mt-2 text-foreground/70";

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight">Integritetspolicy</h1>

      <h2 className={h2}>Personuppgiftsansvarig</h2>
      <p className={p}>
        {shop.shopName}, {shop.addressLine}, {shop.postalCode ? `${shop.postalCode} ` : ""}
        {shop.city}. Telefon:{" "}
        <a href={shop.phoneHref} className="text-accent underline underline-offset-4">
          {shop.phone}
        </a>
        {shop.email && (
          <>
            , e-post:{" "}
            <a href={`mailto:${shop.email}`} className="text-accent underline underline-offset-4">
              {shop.email}
            </a>
          </>
        )}
        .
      </p>

      <h2 className={h2}>Vilka uppgifter sparas</h2>
      <p className={p}>
        Vid bokning sparar vi ditt namn, telefonnummer, e-postadress (om du anger den), eventuellt meddelande samt vald
        tjänst, frisör och tid. Avbokningslänken lagras enbart som en envägshash.
      </p>

      <h2 className={h2}>Varför och rättslig grund</h2>
      <p className={p}>
        Uppgifterna används för att genomföra och hantera din bokning, kontakta dig om den, skicka bekräftelse och
        påminnelse samt låta dig avboka. Behandlingen är nödvändig för att fullgöra bokningen (avtal). Du bekräftar
        hanteringen när du bokar.
      </p>

      <h2 className={h2}>Hur länge</h2>
      <p className={p}>
        Namn, telefonnummer, e-postadress och meddelande i en bokning tas bort automatiskt{" "}
        {BOOKING_CONFIG.retentionMonths} månader efter den bokade tiden. Därefter sparas bara anonymiserad
        bokningsstatistik (tjänst, tid och status) utan koppling till dig.
      </p>

      <h2 className={h2}>Vem får uppgifterna</h2>
      <p className={p}>Vi anlitar leverantörer som behandlar uppgifter för vår räkning:</p>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-foreground/70">
        <li>Supabase: databas för bokningar.</li>
        <li>Cloudflare: drift av webbplatsen och bot-skydd (Turnstile) på bokning, avbokning och inloggning.</li>
        <li>Resend: utskick av bekräftelse och påminnelse, om du angett e-post.</li>
      </ul>
      <p className={p}>
        Vissa leverantörer kan behandla uppgifter utanför EU/EES. Kontakta oss om du vill veta mer. Vi säljer inte dina
        uppgifter.
      </p>

      <h2 className={h2}>Cookies</h2>
      <p className={p}>
        Webbplatsen använder inga analys- eller marknadsföringscookies. Personal som loggar in i adminpanelen får
        nödvändiga sessionscookies.
      </p>

      <h2 className={h2}>Dina rättigheter</h2>
      <p className={p}>
        Du har rätt att begära tillgång till, rättelse eller radering av dina uppgifter, begränsning av behandlingen och
        att invända mot den. Kontakta oss via uppgifterna ovan så hjälper vi dig. Du kan också lämna klagomål till
        Integritetsskyddsmyndigheten (IMY).
      </p>
    </section>
  );
}
