import { 
  Employee, 
  CreateEmployeeInput, 
  UploadEmployeeDocumentInput, 
  EmployeeDocument, 
  EmployeeExpiryAlert,
  JobAssignmentSummary
} from "@/types/employee";
import { UserRole } from "@/types/role";
import { IEmployeeService } from "../interfaces/IEmployeeService";
import { auditService } from "./audit-service";
import { notificationService } from "./notification-service";

export const DEFAULT_FULL_EMPLOYEES: Employee[] = [
  { 
    id: "emp-tl-1", 
    name: "Ahmed Al-Mansoori", 
    phone: "+971501112233",
    mobileNumber: "+971501112233", 
    email: "ahmed.tl@moveit.com", 
    role: "TEAM_LEADER", 
    systemRole: "STORAGE_OPERATOR", 
    status: "ACTIVE",
    isTeamLeaderEligible: true,
    isAvailable: true, 
    documents: [
      {
        id: "doc-eid-01",
        employeeId: "emp-tl-1",
        documentType: "EMIRATES_ID",
        documentNumber: "784-1988-1234567-1",
        fileName: "emirates_id_ahmed.pdf",
        fileUrl: "https://storage.moveit.ae/docs/eid_ahmed.pdf",
        issueDate: "2023-05-10",
        expiryDate: "2026-10-20", // Expiring soon (14 days)
        status: "EXPIRING_SOON",
        uploadDate: "2023-05-11T08:00:00Z",
        uploadedBy: "HR Admin",
        isSensitive: true
      },
      {
        id: "doc-pass-01",
        employeeId: "emp-tl-1",
        documentType: "PASSPORT",
        documentNumber: "N8923412",
        fileName: "passport_ahmed.pdf",
        fileUrl: "https://storage.moveit.ae/docs/passport_ahmed.pdf",
        issueDate: "2021-01-15",
        expiryDate: "2031-01-14",
        status: "VALID",
        uploadDate: "2021-01-16T08:00:00Z",
        uploadedBy: "HR Admin",
        isSensitive: true
      },
      {
        id: "doc-visa-01",
        employeeId: "emp-tl-1",
        documentType: "VISA",
        documentNumber: "201/2023/123456",
        fileName: "residence_visa_ahmed.pdf",
        fileUrl: "https://storage.moveit.ae/docs/visa_ahmed.pdf",
        issueDate: "2023-05-15",
        expiryDate: "2026-10-10", // Expiring soon (4 days)
        status: "EXPIRING_SOON",
        uploadDate: "2023-05-16T08:00:00Z",
        uploadedBy: "HR Admin",
        isSensitive: true
      },
      {
        id: "doc-noc-01",
        employeeId: "emp-tl-1",
        documentType: "NOC_LETTER",
        documentNumber: "NOC-2024-88",
        fileName: "noc_letter_ahmed.pdf",
        fileUrl: "https://storage.moveit.ae/docs/noc_ahmed.pdf",
        issueDate: "2024-01-10",
        expiryDate: "2025-01-09", // Expired
        status: "EXPIRED",
        uploadDate: "2024-01-11T08:00:00Z",
        uploadedBy: "HR Admin",
        isSensitive: true
      }
    ],
    assignedJobs: [
      { jobId: "cs-4001", jobType: "STORAGE_REDELIVERY", customerName: "Al Habtoor Group", assignedRole: "Team Leader", assignedAt: "2026-10-06T08:00:00Z", status: "IN_PROGRESS" }
    ],
    crewHistory: [
      { crewSheetId: "cs-3990", jobDate: "2026-10-01", customerName: "Emaar Commercial", role: "Team Leader", hoursWorked: 8 }
    ],
    createdAt: "2026-01-01T00:00:00Z" 
  },
  { 
    id: "emp-tl-2", 
    name: "Tariq Mahmoud", 
    phone: "+971502223344",
    mobileNumber: "+971502223344", 
    email: "tariq.tl@moveit.com", 
    role: "TEAM_LEADER", 
    systemRole: "STORAGE_OPERATOR", 
    status: "ACTIVE",
    isTeamLeaderEligible: true,
    isAvailable: true, 
    documents: [
      {
        id: "doc-eid-02",
        employeeId: "emp-tl-2",
        documentType: "EMIRATES_ID",
        documentNumber: "784-1990-9876543-2",
        fileName: "emirates_id_tariq.pdf",
        fileUrl: "https://storage.moveit.ae/docs/eid_tariq.pdf",
        issueDate: "2024-02-01",
        expiryDate: "2027-02-01",
        status: "VALID",
        uploadDate: "2024-02-02T08:00:00Z",
        uploadedBy: "HR Admin",
        isSensitive: true
      }
    ],
    assignedJobs: [],
    crewHistory: [
      { crewSheetId: "cs-3985", jobDate: "2026-09-28", customerName: "Damac Properties", role: "Team Leader", hoursWorked: 7.5 }
    ],
    createdAt: "2026-01-01T00:00:00Z" 
  },
  { 
    id: "emp-pk-1", 
    name: "Vikram Singh", 
    phone: "+971551110011",
    mobileNumber: "+971551110011", 
    email: "vikram@moveit.com", 
    role: "PACKER", 
    systemRole: "STORAGE_OPERATOR", 
    status: "ACTIVE",
    isTeamLeaderEligible: false,
    isAvailable: true, 
    documents: [
      {
        id: "doc-eid-03",
        employeeId: "emp-pk-1",
        documentType: "EMIRATES_ID",
        documentNumber: "784-1992-4455667-3",
        fileName: "eid_vikram.pdf",
        fileUrl: "https://storage.moveit.ae/docs/eid_vikram.pdf",
        issueDate: "2023-08-01",
        expiryDate: "2026-08-01", // Expired
        status: "EXPIRED",
        uploadDate: "2023-08-02T08:00:00Z",
        uploadedBy: "HR Admin",
        isSensitive: true
      }
    ],
    assignedJobs: [],
    crewHistory: [],
    createdAt: "2026-01-01T00:00:00Z" 
  },
  { 
    id: "emp-hp-1", 
    name: "Omar Farooq", 
    phone: "+971564440044",
    mobileNumber: "+971564440044", 
    email: "omar@moveit.com", 
    role: "HELPER", 
    systemRole: "STORAGE_OPERATOR", 
    status: "ACTIVE",
    isTeamLeaderEligible: true, // Eligible for promotion to Team Leader
    isAvailable: true, 
    documents: [],
    assignedJobs: [],
    crewHistory: [],
    createdAt: "2026-01-01T00:00:00Z" 
  }
];

export class MockEmployeeService implements IEmployeeService {
  private employees: Employee[] = [...DEFAULT_FULL_EMPLOYEES];

  async getEmployees(roleFilter?: string, statusFilter?: string): Promise<Employee[]> {
    let list = [...this.employees];
    if (roleFilter && roleFilter !== "ALL") {
      list = list.filter((e) => e.role === roleFilter);
    }
    if (statusFilter && statusFilter !== "ALL") {
      list = list.filter((e) => e.status === statusFilter);
    }
    return JSON.parse(JSON.stringify(list));
  }

  async getEmployeeById(id: string): Promise<Employee | null> {
    const found = this.employees.find((e) => e.id === id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async getTeamLeaders(): Promise<Employee[]> {
    const leaders = this.employees.filter((e) => e.role === "TEAM_LEADER" || e.isTeamLeaderEligible);
    return JSON.parse(JSON.stringify(leaders));
  }

  async createEmployee(input: CreateEmployeeInput, performedBy: string = "Admin"): Promise<Employee> {
    const nowIso = new Date().toISOString();
    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      name: input.name,
      phone: input.phone || "",
      mobileNumber: input.phone || "",
      email: input.email || "",
      role: input.role,
      systemRole: "STORAGE_OPERATOR",
      status: input.status || "ACTIVE",
      isTeamLeaderEligible: input.isTeamLeaderEligible !== undefined 
        ? input.isTeamLeaderEligible 
        : input.role === "TEAM_LEADER",
      isAvailable: input.isAvailable !== undefined ? input.isAvailable : true,
      documents: [],
      assignedJobs: [],
      crewHistory: [],
      createdAt: nowIso,
      updatedAt: nowIso
    };

    this.employees.unshift(newEmp);

    await auditService.recordEvent({
      entityType: "EMPLOYEE",
      entityId: newEmp.id,
      action: "EMPLOYEE_CREATED",
      description: `Created new employee profile '${newEmp.name}' (${newEmp.role}).`,
      performedBy,
      metadata: { employeeId: newEmp.id, role: newEmp.role }
    });

    return JSON.parse(JSON.stringify(newEmp));
  }

  async updateEmployee(id: string, updates: Partial<Employee>, performedBy: string = "Admin"): Promise<Employee> {
    const idx = this.employees.findIndex((e) => e.id === id);
    if (idx === -1) {
      throw new Error(`Employee '${id}' not found.`);
    }

    const current = this.employees[idx];
    const updated: Employee = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.employees[idx] = updated;

    await auditService.recordEvent({
      entityType: "EMPLOYEE",
      entityId: updated.id,
      action: "EMPLOYEE_UPDATED",
      description: `Updated employee profile '${updated.name}'.`,
      performedBy,
      metadata: { employeeId: updated.id }
    });

    return JSON.parse(JSON.stringify(updated));
  }

  async toggleTeamLeaderEligibility(
    employeeId: string, 
    isEligible: boolean, 
    _userRole: UserRole = "SUPER_ADMIN", 
    performedBy: string = "Admin"
  ): Promise<Employee> {
    const emp = await this.getEmployeeById(employeeId);
    if (!emp) {
      throw new Error(`Employee '${employeeId}' not found.`);
    }

    const updated = await this.updateEmployee(employeeId, {
      isTeamLeaderEligible: isEligible,
      role: isEligible && emp.role !== "TEAM_LEADER" ? "TEAM_LEADER" : emp.role
    }, performedBy);

    await auditService.recordEvent({
      entityType: "EMPLOYEE",
      entityId: employeeId,
      action: "TEAM_LEADER_ELIGIBILITY_UPDATED",
      description: `Updated Team Leader eligibility for '${emp.name}' to: ${isEligible ? "ELIGIBLE" : "NOT ELIGIBLE"}.`,
      performedBy,
      metadata: { employeeId, isEligible }
    });

    return updated;
  }

  async uploadDocument(
    input: UploadEmployeeDocumentInput, 
    _userRole: UserRole = "SUPER_ADMIN", 
    performedBy: string = "HR Admin"
  ): Promise<EmployeeDocument> {
    const idx = this.employees.findIndex((e) => e.id === input.employeeId);
    if (idx === -1) {
      throw new Error(`Employee '${input.employeeId}' not found.`);
    }

    const current = this.employees[idx];
    const nowIso = new Date().toISOString();

    let docStatus: EmployeeDocument["status"] = "VALID";
    if (input.expiryDate) {
      const expiry = new Date(input.expiryDate).getTime();
      const now = new Date().getTime();
      const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        docStatus = "EXPIRED";
      } else if (diffDays <= 30) {
        docStatus = "EXPIRING_SOON";
      }
    }

    const newDoc: EmployeeDocument = {
      id: `doc-${Date.now()}`,
      employeeId: input.employeeId,
      documentType: input.documentType,
      documentNumber: input.documentNumber || "",
      fileName: input.fileName,
      fileUrl: input.fileUrl || `https://storage.moveit.ae/docs/${input.fileName}`,
      issueDate: input.issueDate,
      expiryDate: input.expiryDate,
      status: docStatus,
      uploadDate: nowIso,
      uploadedBy: performedBy,
      isSensitive: true
    };

    // Remove existing document of same type if present
    const existingDocs = current.documents || [];
    const filteredDocs = existingDocs.filter((d) => d.documentType !== input.documentType);
    filteredDocs.unshift(newDoc);

    const updatedEmp: Employee = {
      ...current,
      documents: filteredDocs,
      updatedAt: nowIso
    };

    this.employees[idx] = updatedEmp;

    // Send expiry alert if expiring soon or expired
    if (docStatus === "EXPIRING_SOON" || docStatus === "EXPIRED") {
      await notificationService.addNotification({
        type: docStatus === "EXPIRED" ? "DOCUMENT_EXPIRED" : "DOCUMENT_EXPIRING",
        title: `Document Alert: ${input.documentType.replace("_", " ")} ${docStatus.replace("_", " ")}`,
        message: `Employee '${current.name}' document (${input.documentType}) ${docStatus === "EXPIRED" ? "has EXPIRED" : "will expire on " + input.expiryDate}.`,
        severity: docStatus === "EXPIRED" ? "WARNING" : "INFO",
        entityType: "DOCUMENT",
        entityId: newDoc.id
      });
    }

    await auditService.recordEvent({
      entityType: "DOCUMENT",
      entityId: newDoc.id,
      action: "DOCUMENT_UPLOADED",
      description: `Uploaded ${input.documentType} document for employee '${current.name}'.`,
      performedBy,
      metadata: { employeeId: current.id, documentType: input.documentType, docStatus }
    });

    return JSON.parse(JSON.stringify(newDoc));
  }

  async deleteDocument(
    documentId: string, 
    _userRole: UserRole = "SUPER_ADMIN", 
    performedBy: string = "HR Admin"
  ): Promise<boolean> {
    for (let i = 0; i < this.employees.length; i++) {
      const emp = this.employees[i];
      const docs = emp.documents || [];
      const docIdx = docs.findIndex((d) => d.id === documentId);
      if (docIdx !== -1) {
        const deletedDoc = docs[docIdx];
        docs.splice(docIdx, 1);
        emp.documents = docs;
        emp.updatedAt = new Date().toISOString();

        await auditService.recordEvent({
          entityType: "DOCUMENT",
          entityId: documentId,
          action: "DOCUMENT_DELETED",
          description: `Deleted ${deletedDoc.documentType} document for employee '${emp.name}'.`,
          performedBy,
          metadata: { employeeId: emp.id, documentType: deletedDoc.documentType }
        });
        return true;
      }
    }
    return false;
  }

  async getEmployeeDocuments(employeeId: string, userRole: UserRole = "SUPER_ADMIN"): Promise<EmployeeDocument[]> {
    const isAuthorized = userRole === "SUPER_ADMIN" || userRole === "STORAGE_MANAGER" || userRole === "HR_ADMIN";
    const emp = await this.getEmployeeById(employeeId);
    if (!emp) return [];

    const docs = emp.documents || [];
    if (!isAuthorized) {
      // Redact sensitive documents for unauthorized users
      return docs.map((d) => ({
        ...d,
        documentNumber: "[RESTRICTED ACCESS]",
        fileUrl: "#restricted"
      }));
    }

    return docs;
  }

  async getExpiringDocumentsAlerts(): Promise<EmployeeExpiryAlert[]> {
    const alerts: EmployeeExpiryAlert[] = [];
    const now = new Date().getTime();

    for (const emp of this.employees) {
      const docs = emp.documents || [];
      for (const doc of docs) {
        if (!doc.expiryDate) continue;

        const expiry = new Date(doc.expiryDate).getTime();
        const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) {
          alerts.push({
            employeeId: emp.id,
            employeeName: emp.name,
            documentId: doc.id,
            documentType: doc.documentType,
            expiryDate: doc.expiryDate,
            daysRemaining: diffDays,
            status: diffDays <= 0 ? "EXPIRED" : "EXPIRING_SOON"
          });
        }
      }
    }

    return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  async assignJobToEmployee(
    employeeId: string, 
    jobId: string, 
    jobType: string, 
    customerName: string, 
    role: string, 
    performedBy: string = "Admin"
  ): Promise<Employee> {
    const idx = this.employees.findIndex((e) => e.id === employeeId);
    if (idx === -1) {
      throw new Error(`Employee '${employeeId}' not found.`);
    }

    const current = this.employees[idx];
    const nowIso = new Date().toISOString();

    const newJob: JobAssignmentSummary = {
      jobId,
      jobType,
      customerName,
      assignedRole: role,
      assignedAt: nowIso,
      status: "IN_PROGRESS"
    };

    const currentAssigned = current.assignedJobs || [];

    const updatedEmp: Employee = {
      ...current,
      activeJobId: jobId,
      isAvailable: false,
      status: "ON_JOB",
      assignedJobs: [newJob, ...currentAssigned],
      updatedAt: nowIso
    };

    this.employees[idx] = updatedEmp;

    await auditService.recordEvent({
      entityType: "EMPLOYEE",
      entityId: employeeId,
      action: "JOB_ASSIGNED",
      description: `Assigned job '${jobId}' (${customerName}) to employee '${current.name}' as ${role}.`,
      performedBy,
      metadata: { employeeId, jobId, customerName, role }
    });

    return JSON.parse(JSON.stringify(updatedEmp));
  }
}
