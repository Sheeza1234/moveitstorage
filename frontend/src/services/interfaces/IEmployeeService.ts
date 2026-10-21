import { 
  Employee, 
  CreateEmployeeInput, 
  UploadEmployeeDocumentInput, 
  EmployeeDocument, 
  EmployeeExpiryAlert 
} from "@/types/employee";
import { UserRole } from "@/types/role";

export interface IEmployeeService {
  getEmployees(roleFilter?: string, statusFilter?: string): Promise<Employee[]>;
  getEmployeeById(id: string): Promise<Employee | null>;
  getTeamLeaders(): Promise<Employee[]>;
  
  createEmployee(input: CreateEmployeeInput, performedBy?: string): Promise<Employee>;
  updateEmployee(id: string, updates: Partial<Employee>, performedBy?: string): Promise<Employee>;
  toggleTeamLeaderEligibility(employeeId: string, isEligible: boolean, userRole?: UserRole, performedBy?: string): Promise<Employee>;
  
  uploadDocument(input: UploadEmployeeDocumentInput, userRole?: UserRole, performedBy?: string): Promise<EmployeeDocument>;
  deleteDocument(documentId: string, userRole?: UserRole, performedBy?: string): Promise<boolean>;
  getEmployeeDocuments(employeeId: string, userRole?: UserRole): Promise<EmployeeDocument[]>;
  
  getExpiringDocumentsAlerts(): Promise<EmployeeExpiryAlert[]>;
  assignJobToEmployee(employeeId: string, jobId: string, jobType: string, customerName: string, role: string, performedBy?: string): Promise<Employee>;
}
