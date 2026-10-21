import { BookingRequest, BookingRequestSummary, SubmitBookingRequestInput, UpdateBookingRequestInput } from "@/types";

export interface IBookingRequestService {
  getBookingRequests(): Promise<BookingRequest[]>;
  getBookingRequestById(id: string): Promise<BookingRequest | null>;
  getBookingRequestSummary(): Promise<BookingRequestSummary>;
  /** Called by the public booking portal endpoint only; it has no RPC access rule, so signed-in users cannot call it. */
  submitBookingRequest(input: SubmitBookingRequestInput): Promise<BookingRequest>;
  updateBookingRequest(id: string, input: UpdateBookingRequestInput): Promise<BookingRequest>;
}
