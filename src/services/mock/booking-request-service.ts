import { IBookingRequestService } from "../interfaces/IBookingRequestService";
import { BookingRequest, BookingRequestSummary, SubmitBookingRequestInput, UpdateBookingRequestInput } from "@/types";
import { notificationService } from "./notification-service";

/** Rate card used to price public requests, so a browser can never choose its own price. Keep in step with the portal. */
export const PORTAL_UNITS: Record<string, { name: string; sizeSqFt: number; monthlyAed: number }> = {
  locker: { name: "Locker", sizeSqFt: 10, monthlyAed: 250 },
  small: { name: "Small", sizeSqFt: 25, monthlyAed: 550 },
  medium: { name: "Medium", sizeSqFt: 50, monthlyAed: 950 },
  large: { name: "Large", sizeSqFt: 100, monthlyAed: 1700 },
  xl: { name: "Extra large", sizeSqFt: 200, monthlyAed: 3100 },
};
const DISCOUNT_BY_MONTHS: Record<number, number> = { 1: 0, 3: 5, 6: 10, 12: 15 };
const CLIMATE_UPLIFT = 0.15;
const INSURANCE_MONTHLY_AED = 30;

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const daysAhead = (d: number) => new Date(Date.now() + d * 86400_000).toISOString().slice(0, 10);

const SEED_REQUESTS: BookingRequest[] = [
  {
    id: "bkr-seed-1", reference: "MV-4K2QA", status: "NEW", unitId: "medium", unitName: "Medium", sizeSqFt: 50, months: 6,
    climateControlled: true, insurance: true, monthlyAed: 1114, totalAed: 6684, moveInDate: daysAhead(5),
    name: "Ayesha Khan", phone: "+971 50 111 2233", email: "ayesha@example.com", customerNotes: "One bedroom apartment, need help moving in.",
    internalNotes: "", source: "Booking portal", createdAt: hoursAgo(3), updatedAt: hoursAgo(3),
  },
  {
    id: "bkr-seed-2", reference: "MV-9TQ7L", status: "CONTACTED", unitId: "small", unitName: "Small", sizeSqFt: 25, months: 3,
    climateControlled: false, insurance: false, monthlyAed: 523, totalAed: 1568, moveInDate: daysAhead(9),
    name: "Omar Rahman", phone: "+971 55 444 9988", email: "omar@example.com",
    internalNotes: "Called once, no answer. Try again after 5pm.", source: "Booking portal", createdAt: hoursAgo(30), updatedAt: hoursAgo(20),
  },
];

export class MockBookingRequestService implements IBookingRequestService {
  private bookingRequests: BookingRequest[] = [...SEED_REQUESTS];

  async getBookingRequests(): Promise<BookingRequest[]> {
    return this.bookingRequests.map((r) => ({ ...r }));
  }

  async getBookingRequestById(id: string): Promise<BookingRequest | null> {
    const r = this.bookingRequests.find((x) => x.id === id);
    return r ? { ...r } : null;
  }

  async getBookingRequestSummary(): Promise<BookingRequestSummary> {
    const count = (s: BookingRequest["status"]) => this.bookingRequests.filter((r) => r.status === s).length;
    return { total: this.bookingRequests.length, new: count("NEW"), contacted: count("CONTACTED"), confirmed: count("CONFIRMED"), converted: count("CONVERTED"), lost: count("LOST") };
  }

  async submitBookingRequest(input: SubmitBookingRequestInput): Promise<BookingRequest> {
    const unit = PORTAL_UNITS[input.unitId];
    if (!unit) throw new Error("Unknown unit size.");
    if (!(input.months in DISCOUNT_BY_MONTHS)) throw new Error("Unknown rental period.");

    const full = unit.monthlyAed * (1 + (input.climateControlled ? CLIMATE_UPLIFT : 0));
    const monthly = Math.round(full * (1 - DISCOUNT_BY_MONTHS[input.months] / 100) + (input.insurance ? INSURANCE_MONTHLY_AED : 0));

    let reference = "";
    do {
      reference = "MV-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    } while (this.bookingRequests.some((r) => r.reference === reference));

    const now = new Date().toISOString();
    const request: BookingRequest = {
      id: `bkr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      reference,
      status: "NEW",
      unitId: input.unitId,
      unitName: unit.name,
      sizeSqFt: unit.sizeSqFt,
      months: input.months,
      climateControlled: input.climateControlled,
      insurance: input.insurance,
      monthlyAed: monthly,
      totalAed: monthly * input.months,
      moveInDate: input.moveInDate,
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim().toLowerCase(),
      customerNotes: input.notes?.trim() || undefined,
      internalNotes: "",
      source: input.source || "Booking portal",
      createdAt: now,
      updatedAt: now,
    };
    this.bookingRequests.unshift(request);

    await notificationService.addNotification({
      type: "SYSTEM_EVENT",
      title: "New storage booking request",
      message: `${request.name} requested a ${request.sizeSqFt} sq ft unit for ${request.months} month(s), from ${request.moveInDate}. Reference ${request.reference}.`,
      severity: "INFO",
      entityType: "SYSTEM",
      entityId: request.id,
      actionUrl: "/booking-requests",
      alertKey: `BOOKING_REQUEST:${request.id}`,
    });
    return { ...request };
  }

  async updateBookingRequest(id: string, input: UpdateBookingRequestInput): Promise<BookingRequest> {
    const request = this.bookingRequests.find((x) => x.id === id);
    if (!request) throw new Error("Booking request not found.");
    if (input.status) request.status = input.status;
    if (input.internalNotes !== undefined) request.internalNotes = input.internalNotes.slice(0, 4000);
    if (input.customerId) request.customerId = input.customerId;
    request.updatedAt = new Date().toISOString();
    return { ...request };
  }
}
