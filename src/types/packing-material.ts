import { UserRole } from "./role";

export interface PackingMaterial {
  id: string;
  name: string;
  unit: string;
  availableQty: number;
  minStock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePackingMaterialInput {
  name: string;
  unit: string;
  availableQty: number;
  minStock: number;
  isActive?: boolean;
}

export interface ApprovedMaterialItem {
  materialId: string;
  materialName: string;
  approvedQty: number;
}

export interface JobMaterialAllocation {
  id: string;
  jobId: string; // matches crewSheetId
  version: number;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  items: ApprovedMaterialItem[];
  createdAt: string;
  updatedAt: string;
}

export interface IssueMaterialInput {
  jobId: string;
  materialId: string;
  quantityOut: number;
  dateTime?: string;
  issuedBy?: string;
  receivedBy?: string;
  issuedTo?: string;
  teamLeaderId?: string;
  signature?: string;
  notes?: string;
}

export interface MaterialIssuance {
  id: string;
  jobId: string;
  materialId: string;
  materialName: string;
  quantityOut: number;
  dateTime: string;
  issuedBy: string;
  receivedBy: string;
  teamLeaderId: string;
  signature?: string;
  createdAt: string;
}

export interface ReturnMaterialInput {
  jobId: string;
  materialId: string;
  quantityIn: number;
  dateTime?: string;
  receivedBy?: string;
  returnedBy?: string;
  notes?: string;
}

export interface MaterialReturn {
  id: string;
  jobId: string;
  materialId: string;
  materialName: string;
  quantityIn: number;
  dateTime: string;
  receivedBy: string;
  returnedBy: string;
  notes?: string;
  createdAt: string;
}

export interface MaterialChangeRequestItem {
  materialId: string;
  materialName: string;
  requestedQty: number;
}

export interface CreateMaterialChangeRequestInput {
  jobId: string;
  requestedBy: string;
  reason: string;
  items: MaterialChangeRequestItem[];
}

export interface MaterialChangeRequest {
  id: string;
  jobId: string;
  requestedBy: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  items: MaterialChangeRequestItem[];
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface MaterialUsageRecord {
  materialId: string;
  materialName: string;
  approvedQty: number;
  quantityOut: number;
  quantityIn: number;
  used: number;
}
