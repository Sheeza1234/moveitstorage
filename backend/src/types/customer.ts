export type CustomerType = 'INDIVIDUAL' | 'CORPORATE';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE';

export interface CustomerCommunication {
  id: string;
  customerId: string;
  type: 'EMAIL' | 'PHONE_CALL' | 'SMS' | 'MEETING' | 'OPERATIONAL_NOTE';
  subject: string;
  summary: string;
  loggedBy: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  code: string;
  type: CustomerType;
  name: string; // Display Name (Company Name or First + Last Name)
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  address: string;
  city: string;
  country: string;
  status: CustomerStatus;
  notes?: string;
  requiredSqFt?: number;
  storageStartDate?: string;
  storageDurationMonths?: number;
  activeAllocationsCount: number;
  totalOccupiedSqFt: number;
  communicationHistory?: CustomerCommunication[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  type: CustomerType;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  address: string;
  city: string;
  country: string;
  status: CustomerStatus;
  notes?: string;
  requiredSqFt?: number;
  storageStartDate?: string;
  storageDurationMonths?: number;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
  id: string;
}

