import { formatDuration, formatPrice } from "@/lib/format";
import type { Service } from "@/types/shop";

export function ServiceList({ items, headingLevel: Heading = "h3" }: { items: Service[]; headingLevel?: "h2" | "h3" }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((service) => (
        <li key={service.id} className="card reveal flex flex-col p-6">
          <Heading className="display text-2xl">{service.name}</Heading>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-foreground/70">{service.description}</p>
          <div className="mt-6 flex items-end justify-between border-t border-line pt-4">
            <p className="font-display text-3xl font-bold leading-none text-accent">{formatPrice(service.priceSek)}</p>
            <p className="text-sm text-foreground/60">{formatDuration(service.durationMinutes)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
