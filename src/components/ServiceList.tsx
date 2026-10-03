import { formatDuration, formatPrice } from "@/lib/format";
import type { Service } from "@/types/shop";

export function ServiceList({ items, headingLevel: Heading = "h3" }: { items: Service[]; headingLevel?: "h2" | "h3" }) {
  return (
    <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
      {items.map((service) => (
        <li key={service.id} className="flex items-start justify-between gap-4 p-4 sm:p-5">
          <div>
            <Heading className="font-semibold">{service.name}</Heading>
            <p className="mt-1 text-sm text-foreground/70">{service.description}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-semibold text-accent">{formatPrice(service.priceSek)}</p>
            <p className="text-sm text-foreground/70">{formatDuration(service.durationMinutes)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
