import { STATUS_LABEL, type BookingStatus } from "@/lib/booking-rules";

const COLORS: Record<BookingStatus, string> = {
  pending: "border-yellow-400/50 text-yellow-300",
  confirmed: "border-accent/60 text-accent",
  cancelled: "border-white/20 text-foreground/50 line-through",
  completed: "border-green-400/50 text-green-300",
  no_show: "border-red-400/50 text-red-300",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-block rounded-sm border px-2 py-0.5 text-xs font-medium ${COLORS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
