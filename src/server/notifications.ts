import { renderBookingCancelled } from "@/emails/booking-cancelled";
import { renderBookingConfirmation } from "@/emails/booking-confirmation";
import { renderBookingMoved, type PreviousSlot } from "@/emails/booking-moved";
import { renderBookingReminder } from "@/emails/booking-reminder";
import type { EmailBooking } from "@/emails/shared";
import { getShopSettings } from "@/lib/shop-settings";
import { siteConfig } from "@/lib/site";
import { sendEmail } from "./email";

type BookingLike = {
  customerName: string;
  serviceName: string;
  barberName: string;
  startAt: Date | string;
  endAt: Date | string;
  priceSek: number;
};

async function toEmailBooking(b: BookingLike): Promise<EmailBooking> {
  const shop = await getShopSettings();
  return {
    customerName: b.customerName,
    serviceName: b.serviceName,
    barberName: b.barberName,
    startAt: new Date(b.startAt).toISOString(),
    endAt: new Date(b.endAt).toISOString(),
    priceSek: b.priceSek,
    shopName: shop.shopName,
    shopAddress: `${shop.addressLine}, ${shop.postalCode ? `${shop.postalCode} ` : ""}${shop.city}`,
    shopPhone: shop.phone,
    bookingUrl: siteConfig.url,
  };
}

export async function sendConfirmationEmail(b: BookingLike, to: string, cancelUrl: string): Promise<boolean> {
  return sendEmail(to, renderBookingConfirmation(await toEmailBooking(b), cancelUrl));
}

export async function sendReminderEmail(b: BookingLike, to: string): Promise<boolean> {
  return sendEmail(to, renderBookingReminder(await toEmailBooking(b)));
}

export async function sendMovedEmail(b: BookingLike, previous: PreviousSlot, to: string): Promise<boolean> {
  return sendEmail(to, renderBookingMoved(await toEmailBooking(b), previous));
}

export async function sendCancelledEmail(b: BookingLike, to: string): Promise<boolean> {
  return sendEmail(to, renderBookingCancelled(await toEmailBooking(b)));
}
