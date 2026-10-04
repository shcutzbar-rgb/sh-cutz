import { renderBookingCancelled } from "@/emails/booking-cancelled";
import { renderBookingConfirmation } from "@/emails/booking-confirmation";
import { renderBookingMoved, type PreviousSlot } from "@/emails/booking-moved";
import { renderBookingReminder } from "@/emails/booking-reminder";
import type { EmailBooking } from "@/emails/shared";
import { sendEmail } from "./email";

type BookingLike = {
  customerName: string;
  serviceName: string;
  barberName: string;
  startAt: Date | string;
  endAt: Date | string;
  priceSek: number;
};

function toEmailBooking(b: BookingLike): EmailBooking {
  return {
    customerName: b.customerName,
    serviceName: b.serviceName,
    barberName: b.barberName,
    startAt: new Date(b.startAt).toISOString(),
    endAt: new Date(b.endAt).toISOString(),
    priceSek: b.priceSek,
  };
}

export function sendConfirmationEmail(b: BookingLike, to: string, cancelUrl: string): Promise<boolean> {
  return sendEmail(to, renderBookingConfirmation(toEmailBooking(b), cancelUrl));
}

export function sendReminderEmail(b: BookingLike, to: string): Promise<boolean> {
  return sendEmail(to, renderBookingReminder(toEmailBooking(b)));
}

export function sendMovedEmail(b: BookingLike, previous: PreviousSlot, to: string): Promise<boolean> {
  return sendEmail(to, renderBookingMoved(toEmailBooking(b), previous));
}

export function sendCancelledEmail(b: BookingLike, to: string): Promise<boolean> {
  return sendEmail(to, renderBookingCancelled(toEmailBooking(b)));
}
