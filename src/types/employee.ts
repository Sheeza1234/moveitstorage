import { UserRole } from "./role";

export type EmployeeRole = "TEAM_LEADER" | "PACKER" | "HELPER" | "DRIVER" | "SUPERVISOR" | "OPERATIONS_STAFF";

export type EmployeeStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "ON_JOB";

export type DocumentType = "EMIRATES_ID" | "PASSPORT" | "VISA" | "NOC_LETTER";

export type DocumentStatus = "VALID" | "EXPIRING_SOON" | "EXPIRED" | "NOT_PROVIDED";

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  documentType: DocumentType;
  documentNumber?: string;
  fileName: string;
  fileUrl: string;
  issueDate?: string;
  expiryDate?: string;
  status: DocumentStatus;
  uploadDate: string;
  uploadedBy: string;
  isSensitive: boolean;
}

export interface JobAssignmentSummary {
  jobId: string;
  jobType: string;
  customerName: string;
  assignedRole: string;
  assignedAt: string;
  status: string;
}

export interface CrewHistoryItem {
  crewSheetId: string;
  jobDate: string;
  customerName: string;
  role: string;
  hoursWorked?: number;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  mobileNumber?: string;
  email: string;
  role: EmployeeRole;
  systemRole: UserRole;
  status?: EmployeeStatus;
  isTeamLeaderEligible?: boolean;
  isAvailable: boolean;
  activeJobId?: string;
  documents?: EmployeeDocument[];
  assignedJobs?: JobAssignmentSummary[];
  crewHistory?: CrewHistoryItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateEmployeeInput {
  name: string;
  phone?: string;
  email?: string;
  role: EmployeeRole;
  status?: EmployeeStatus;
  isTeamLeaderEligible?: boolean;
  isAvailable?: boolean;
}

export interface UploadEmployeeDocumentInput {
  employeeId: string;
  documentType: DocumentType;
  documentNumber?: string;
  fileName: string;
  fileUrl?: string;
  issueDate?: string;
  expiryDate?: string;
}

export interface EmployeeExpiryAlert {
  employeeId: string;
  employeeName: string;
  documentId: string;
  documentType: DocumentType;
  expiryDate: string;
  daysRemaining: number;
  status: DocumentStatus;
}
