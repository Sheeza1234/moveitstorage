import { UserRole } from "./role";

export type MoveType = 
  | "LOCAL_MOVE" 
  | "STORAGE" 
  | "STORAGE_REDELIVERY" 
  | "INTERNATIONAL" 
  | "CURTAIN_FIXING" 
  | "PICKUP_EMPTY_DROP_BOXES";

export type PropertyType = "VILLA" | "APPARTMENT" | "OFFICE" | "RESTAURANT" | "HOTEL";

export type PerformanceRating = "EXCELLENT" | "VERY_GOOD" | "GOOD" | "FAIR" | "POOR";

export interface PerformanceItem {
  dimension: string;
  description: string;
  rating?: PerformanceRating;
  category?: string; // alias
}

export interface PackingMaterialEntry {
  materialName: string;
  materialOutQty: number;
  materialInQty: number;
  qtyOut?: number; // alias
  qtyIn?: number;  // alias
}

export type CrewSheetStatus = 
  | "DRAFT" 
  | "ASSIGNED" 
  | "ACCEPTED" 
  | "IN_PROGRESS" 
  | "SUBMITTED" 
  | "REVIEWED" 
  | "COMPLETED";

import { Employee, CreateEmployeeInput } from "./employee";
export type { Employee, CreateEmployeeInput };

export interface CrewSheet {
  id: string;
  crewSheetNumber: string; // S.No. 4001 format
  serialNumber?: string;    // alias for crewSheetNumber
  customerId?: string;
  allocationId?: string;
  packingListId?: string;
  status: CrewSheetStatus;
  moveTypes: MoveType[];
  dateTime: string;
  clientName: string;
  contactPersonNumberOnSite: string;
  contactPersonNumber?: string; // alias
  fromLocation: string;
  toLocation: string;
  teamLeaderId: string;
  teamLeaderName: string;
  packerIds: string[];
  packerNames: string[];
  packers?: string; // comma separated join alias
  helpers?: string[];
  helperIds?: string[];
  propertyType: PropertyType;
  manpowerTotalCbm: number;
  totalCbm?: number; // alias
  surveyedBy: string;
  advanceDepositCollected: string;
  advanceCollected?: string | number; // alias
  balanceToBeCollected: string;
  balanceToCollect?: string | number; // alias
  modeOfPayment: string;
  buildingPermitRequired: boolean;
  documentAttached: boolean;
  jobInstructions: string;
  preparedBy: string;
  coordinatedBy: string;
  receivedBy: string;
  performanceReport: PerformanceItem[];
  packingMaterialDetails: PackingMaterialEntry[];
  jobDetailsMoveTypes?: Record<string, boolean>;
  customerSignature?: string;
  teamLeaderSignature?: string;
  signedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCrewSheetInput {
  customerId?: string;
  allocationId?: string;
  packingListId?: string;
  moveTypes?: MoveType[];
  dateTime?: string;
  clientName?: string;
  contactPersonNumberOnSite?: string;
  fromLocation?: string;
  toLocation?: string;
  teamLeaderId?: string;
  teamLeaderName?: string;
  packerIds?: string[];
  helperIds?: string[];
  propertyType?: PropertyType;
  manpowerTotalCbm?: number;
  jobInstructions?: string;
  preparedBy?: string;
}

export interface AssignCrewInput {
  crewSheetId?: string;
  teamLeaderId: string;
  packerIds: string[];
  helperIds?: string[];
  assignedBy?: string;
}
