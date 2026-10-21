export type JobType = "Cargo" | "Commercial" | "Local" | "International" | "Storage";

export interface CatalogueItem {
  id: string;
  name: string;
  defaultCbm: number;
  category: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PackingListItem {
  id: string;
  catalogueItemId?: string;
  name: string;
  cbm: number; // Unit CBM
  quantity: number; // Nos. of Pcs
  disassemblyAssembly: string; // D/A field
  additionalNotes: string; // A field
  totalCbm: number; // quantity * cbm
  isCustom?: boolean;
}

export type ExtraItemStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export interface ExtraItem {
  id: string;
  packingListId: string;
  name: string;
  quantity: number;
  cbm: number;
  totalCbm: number;
  reason: string;
  notes?: string;
  submittedBy: string;
  submittedAt: string;
  status: ExtraItemStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface PackingListHeader {
  companyName: string;
  personName: string;
  clientName?: string;
  mobileNo: string;
  email: string;
  source: string;
  jobTypes: JobType[];
  origin: string;
  originDate: string;
  originTime: string;
  destination: string;
  destinationDate: string;
  destinationTime: string;
  totalPackaging: string;
}

export interface PackingListSummary {
  totalCurtainsBlinds: string;
  totalWallFixtures: string;
  totalBoxes: string;
  totalPackages: string;
  totalValueOfGoods: string;
  totalCbm: number;
  estimatedKg: string;
  totalWorkingDays: string;
  noOfTrips: string;
  amountOfMove: string;
  bldgPermit: string;
  commodity: string;
  quotationReviewRequired?: boolean;
}

export type PackingListStatus = "DRAFT" | "APPROVED" | "REVISED";

export interface PackingListVersion {
  version: number;
  status: PackingListStatus;
  header: PackingListHeader;
  items: PackingListItem[];
  summary: PackingListSummary;
  createdAt: string;
  createdBy: string;
  approvedAt?: string;
  approvedBy?: string;
  revisionReason?: string;
}

export interface PackingList {
  id: string;
  packingListNumber: string; // S.No. 1001 format
  customerId?: string;
  allocationId?: string;
  currentVersion: number;
  status: PackingListStatus;
  header: PackingListHeader;
  items: PackingListItem[];
  extraItems: ExtraItem[];
  summary: PackingListSummary;
  versions: PackingListVersion[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface CreatePackingListInput {
  customerId?: string;
  allocationId?: string;
  header: Partial<PackingListHeader>;
  items?: Partial<PackingListItem>[];
  summary?: Partial<PackingListSummary>;
  createdBy?: string;
}

export interface AddExtraItemInput {
  name: string;
  quantity: number;
  cbm: number;
  reason: string;
  notes?: string;
  submittedBy?: string;
}
