export class BookingError extends Error {
  constructor(
    public readonly code: "invalid" | "not_found" | "slot_unavailable" | "unavailable",
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
