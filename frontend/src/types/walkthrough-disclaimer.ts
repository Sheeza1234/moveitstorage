export interface WalkthroughChecklistItem {
  sl: number;
  particulars: string;
  yes: boolean;
  no: boolean;
  comments?: string;
}

export interface DamageItemRecord {
  id: string;
  itemName: string;
  packingListItemId?: string;
  description: string;
  location: string;
  photos?: string[];
  severity: "MINOR" | "MODERATE" | "SEVERE";
  status: "REPORTED" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";
  reportedBy: string;
  reportedAt: string;
}

export interface MissingItemRecord {
  id: string;
  packingListItemId?: string;
  itemName: string;
  expectedQty: number;
  returnedQty: number;
  discrepancyCount: number;
  notes?: string;
  reportedAt: string;
}

export type WalkthroughDisclaimerStatus = 
  | "DRAFT" 
  | "IN_REVIEW" 
  | "FLAGGED_WITH_ISSUES" 
  | "COMPLETED";

export interface WalkthroughDisclaimer {
  id: string;
  disclaimerNumber: string; // WT-5001 format
  customerId: string;
  customerName: string;
  allocationId?: string;
  crewSheetId?: string;
  date: string;
  checklist: WalkthroughChecklistItem[];
  damageRecords: DamageItemRecord[];
  missingItemRecords: MissingItemRecord[];
  boxesToBeCollected: number;
  emptyBoxCollectionDate: string;
  customerNameDetails: string;
  customerSignature?: string;
  customerSignedAt?: string;
  crewLeaderNameDetails: string;
  crewLeaderSignature?: string;
  crewLeaderSignedAt?: string;
  status: WalkthroughDisclaimerStatus;
  adminReviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWalkthroughDisclaimerInput {
  customerId?: string;
  customerName?: string;
  allocationId?: string;
  crewSheetId?: string;
  date?: string;
  boxesToBeCollected?: number;
  emptyBoxCollectionDate?: string;
  customerNameDetails?: string;
  crewLeaderNameDetails?: string;
}

export interface RecordDamageInput {
  disclaimerId: string;
  itemName: string;
  packingListItemId?: string;
  description: string;
  location: string;
  photos?: string[];
  severity: "MINOR" | "MODERATE" | "SEVERE";
  reportedBy: string;
}

export interface RecordMissingItemInput {
  disclaimerId: string;
  itemName: string;
  packingListItemId?: string;
  expectedQty: number;
  returnedQty: number;
  notes?: string;
}

export interface SignWalkthroughInput {
  disclaimerId: string;
  customerSignature?: string;
  customerNameDetails?: string;
  crewLeaderSignature?: string;
  crewLeaderNameDetails?: string;
  signedByRole: "CUSTOMER" | "CREW_LEADER" | "BOTH";
}
