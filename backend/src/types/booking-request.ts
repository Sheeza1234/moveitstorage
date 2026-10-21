export type BookingRequestStatus = 'NEW' | 'CONTACTED' | 'CONFIRMED' | 'CONVERTED' | 'LOST';

export const BOOKING_REQUEST_STATUSES: { id: BookingRequestStatus; label: string }[] = [
  { id: 'NEW', label: 'New' },
  { id: 'CONTACTED', label: 'Contacted' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'CONVERTED', label: 'Customer created' },
  { id: 'LOST', label: 'Lost' },
];

/** A storage booking request sent from the public booking portal. Prices are recalculated on the server. */
export interface BookingRequest {
  id: string;
  reference: string;
  status: BookingRequestStatus;
  unitId: string;
  unitName: string;
  sizeSqFt: number;
  months: number;
  climateControlled: boolean;
  insurance: boolean;
  monthlyAed: number;
  totalAed: number;
  moveInDate: string;
  name: string;
  phone: string;
  email: string;
  customerNotes?: string;
  internalNotes: string;
  customerId?: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitBookingRequestInput {
  unitId: string;
  months: number;
  climateControlled: boolean;
  insurance: boolean;
  moveInDate: string;
  name: string;
  phone: string;
  email: string;
  notes?: string;
  source?: string;
}

export interface UpdateBookingRequestInput {
  status?: BookingRequestStatus;
  internalNotes?: string;
  customerId?: string;
}

export interface BookingRequestSummary {
  total: number;
  new: number;
  contacted: number;
  confirmed: number;
  converted: number;
  lost: number;
}
