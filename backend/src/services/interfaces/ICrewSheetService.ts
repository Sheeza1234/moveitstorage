import { 
  CrewSheet, 
  Employee, 
  CreateEmployeeInput,
  CreateCrewSheetInput, 
  AssignCrewInput,
  CrewSheetStatus 
} from "@/types/crew-sheet";
import { UserRole } from "@/types/role";

export interface ICrewSheetService {
  getEmployees(roleFilter?: string): Promise<Employee[]>;
  getEmployeeById(id: string): Promise<Employee | null>;
  addEmployee(employee: Omit<Employee, "id" | "createdAt"> | CreateEmployeeInput): Promise<Employee>;
  createEmployee(employee: CreateEmployeeInput): Promise<Employee>; // alias
  
  getCrewSheets(statusFilter?: CrewSheetStatus): Promise<CrewSheet[]>;
  getCrewSheetById(id: string): Promise<CrewSheet | null>;
  createCrewSheet(input: CreateCrewSheetInput, userRole?: UserRole, performedBy?: string): Promise<CrewSheet>;
  assignCrew(input: AssignCrewInput, userRole?: UserRole, performedBy?: string): Promise<CrewSheet>;
  updateCrewSheet(id: string, updates: Partial<CrewSheet>, userRole: UserRole, performedBy?: string): Promise<CrewSheet>;
  acceptJob(id: string, userRoleOrTlId?: string, performedBy?: string): Promise<CrewSheet>;
  submitCrewSheet(id: string, userRoleOrTlId?: string, performedBy?: string): Promise<CrewSheet>;
  completeCrewSheet(id: string, customerSignature: string, teamLeaderSignature: string, performedBy?: string): Promise<CrewSheet>;
  completeSignatures(id: string, signatures: { customerSignature: string; teamLeaderSignature: string }, userRoleOrPerformedBy?: string): Promise<CrewSheet>; // alias
}
