export type ContractStatus = 
  | 'DRAFT'
  | 'PENDING_SIGNATURE'
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'TERMINATED'
  | 'CANCELLED'
  | 'COMPLETED';

export type ContractType = 
  | 'STORAGE'
  | 'LONG_TERM_STORAGE'
  | 'SHORT_TERM_STORAGE'
  | 'CORPORATE_STORAGE';

export type RateUnit = 'SQ_FT' | 'CU_FT' | 'MONTH' | 'FLAT';
export type BillingFrequency = 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'ONE_TIME';

export type DocumentType = 
  | 'SIGNED_CONTRACT'
  | 'CUSTOMER_ID'
  | 'TRADE_LICENSE'
  | 'EMIRATES_ID'
  | 'INSURANCE'
  | 'INVENTORY_LIST'
  | 'INSPECTION_REPORT'
  | 'SUPPORTING'
  | 'OTHER';

export type DocumentStatus = 
  | 'UPLOADED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRING_SOON'
  | 'EXPIRED';

export interface StorageContract {
  id: string;
  contractCode: string;
  contractNumber: string; // display alias
  customerId: string;
  customerName: string;
  allocationIds: string[];
  contractType: ContractType;
  startDate: string;
  endDate: string;
  storageRate: number;
  monthlyRate: number; // calculated or alias for backward compatibility
  rateUnit: RateUnit;
  billingFrequency: BillingFrequency;
  currency: string;
  depositAmount: number;
  status: ContractStatus;
  notes?: string;
  documentIds: string[];
  daysUntilExpiry?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDocument {
  id: string;
  documentCode: string;
  contractId?: string;
  customerId: string;
  customerName: string;
  documentType: DocumentType;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number; // size in bytes
  storageReference: string; // storage ref string e.g. /mock-storage/contracts/CTR-2026-00001/doc.pdf
  status: DocumentStatus;
  issueDate: string;
  expiryDate?: string;
  uploadedAt: string;
  uploadedBy: string;
  notes?: string;
  daysUntilExpiry?: number;
  fileUrl?: string; // display alias
}

export interface ContractSummary {
  totalContracts: number;
  activeContracts: number;
  pendingContracts: number;
  expiringSoonContracts: number;
  expiredContracts: number;
}

export interface DocumentSummary {
  totalDocuments: number;
  uploadedDocuments: number;
  pendingReviewDocuments: number;
  approvedDocuments: number;
  expiringSoonDocuments: number;
  expiredDocuments: number;
  missingRequiredCount: number;
}

export interface RequiredDocumentChecklistItem {
  documentType: DocumentType;
  label: string;
  isRequired: boolean;
  status: 'UPLOADED' | 'APPROVED' | 'PENDING_REVIEW' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING';
  document?: CustomerDocument;
}

export interface CreateContractInput {
  customerId: string;
  contractType: ContractType;
  allocationIds: string[];
  startDate: string;
  endDate: string;
  storageRate: number;
  rateUnit: RateUnit;
  billingFrequency: BillingFrequency;
  currency?: string;
  depositAmount?: number;
  notes?: string;
}

export interface UpdateContractInput {
  customerId?: string;
  contractType?: ContractType;
  allocationIds?: string[];
  startDate?: string;
  endDate?: string;
  storageRate?: number;
  rateUnit?: RateUnit;
  billingFrequency?: BillingFrequency;
  currency?: string;
  depositAmount?: number;
  notes?: string;
}

export interface UploadDocumentInput {
  contractId?: string;
  customerId: string;
  documentType: DocumentType;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageReference?: string;
  issueDate: string;
  expiryDate?: string;
  notes?: string;
  uploadedBy?: string;
}
