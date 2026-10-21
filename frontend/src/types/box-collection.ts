export type BoxCollectionStatus = 
  | "NOT_STARTED" 
  | "PARTIALLY_COLLECTED" 
  | "FULLY_COLLECTED" 
  | "COLLECTION_SCHEDULED";

export interface BoxCollectionTracker {
  id: string;
  customerId: string;
  customerName: string;
  allocationId?: string;
  crewSheetId?: string;
  boxesRequired: number;
  boxesCollected: number;
  boxesRemaining: number;
  collectionDate?: string;
  nextCollectionDate?: string;
  status: BoxCollectionStatus;
  hasPendingAlert: boolean;
  alertMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBoxTrackerInput {
  customerId: string;
  customerName?: string;
  allocationId?: string;
  crewSheetId?: string;
  boxesRequired: number;
  initialCollected?: number;
  collectionDate?: string;
  nextCollectionDate?: string;
}

export interface RecordBoxCollectionInput {
  trackerId: string;
  quantityCollected: number;
  collectionDate?: string;
  responsibleEmployee: string;
  notes?: string;
  customerAcknowledgement?: boolean;
  allowAdminException?: boolean;
}

export interface ScheduleCollectionInput {
  trackerId: string;
  nextCollectionDate: string;
  notes?: string;
}

export interface BoxCollectionEvent {
  id: string;
  trackerId: string;
  quantityCollected: number;
  collectionDate: string;
  responsibleEmployee: string;
  notes?: string;
  customerAcknowledgement?: boolean;
  isAdminException: boolean;
  createdAt: string;
}
