import { 
  CrewSheet, 
  Employee, 
  CreateEmployeeInput,
  CreateCrewSheetInput, 
  AssignCrewInput, 
  PerformanceItem, 
  PackingMaterialEntry,
  CrewSheetStatus
} from "@/types/crew-sheet";
import { UserRole } from "@/types/role";
import { ICrewSheetService } from "../interfaces/ICrewSheetService";
import { auditService } from "./audit-service";
import { MOCK_CUSTOMERS, MOCK_ALLOCATIONS } from "./mock-db";

export const DEFAULT_EMPLOYEES: Employee[] = [
  { id: "emp-tl-1", name: "Ahmed Al-Mansoori", role: "TEAM_LEADER", systemRole: "STORAGE_OPERATOR", phone: "+971501112233", email: "ahmed.tl@moveit.com", isAvailable: true, createdAt: "2026-01-01T00:00:00Z" },
  { id: "emp-tl-2", name: "Tariq Mahmoud", role: "TEAM_LEADER", systemRole: "STORAGE_OPERATOR", phone: "+971502223344", email: "tariq.tl@moveit.com", isAvailable: true, createdAt: "2026-01-01T00:00:00Z" },
  { id: "emp-tl-3", name: "Rajesh Kumar", role: "TEAM_LEADER", systemRole: "STORAGE_OPERATOR", phone: "+971503334455", email: "rajesh.tl@moveit.com", isAvailable: true, createdAt: "2026-01-01T00:00:00Z" },
  { id: "emp-pk-1", name: "Vikram Singh", role: "PACKER", systemRole: "STORAGE_OPERATOR", phone: "+971551110011", email: "vikram@moveit.com", isAvailable: true, createdAt: "2026-01-01T00:00:00Z" },
  { id: "emp-pk-2", name: "Hassan Ali", role: "PACKER", systemRole: "STORAGE_OPERATOR", phone: "+971552220022", email: "hassan@moveit.com", isAvailable: true, createdAt: "2026-01-01T00:00:00Z" },
  { id: "emp-pk-3", name: "Suresh Patel", role: "PACKER", systemRole: "STORAGE_OPERATOR", phone: "+971553330033", email: "suresh@moveit.com", isAvailable: true, createdAt: "2026-01-01T00:00:00Z" },
  { id: "emp-hp-1", name: "Omar Farooq", role: "HELPER", systemRole: "STORAGE_OPERATOR", phone: "+971564440044", email: "omar@moveit.com", isAvailable: true, createdAt: "2026-01-01T00:00:00Z" },
  { id: "emp-hp-2", name: "Muhammad Bilal", role: "HELPER", systemRole: "STORAGE_OPERATOR", phone: "+971565550055", email: "bilal@moveit.com", isAvailable: true, createdAt: "2026-01-01T00:00:00Z" },
];

export const DEFAULT_PERFORMANCE_REPORT: PerformanceItem[] = [
  { dimension: "Tangibles", category: "Tangibles", description: "Complete tools and packing material.", rating: "VERY_GOOD" },
  { dimension: "Reliability", category: "Reliability", description: "Comfortable in working with the team, performed the promised service dependably and accurately.", rating: "VERY_GOOD" },
  { dimension: "Responsiveness", category: "Responsiveness", description: "Willingness to help you with the prompt service.", rating: "EXCELLENT" },
  { dimension: "Competence", category: "Competence", description: "Possession of the required skill and knowledge to perform service.", rating: "VERY_GOOD" },
  { dimension: "Courtesy", category: "Courtesy", description: "Politeness, Respect, Consideration, Friendliness.", rating: "EXCELLENT" },
  { dimension: "Credibility", category: "Credibility", description: "Trustworthiness, Honesty.", rating: "EXCELLENT" },
  { dimension: "Security", category: "Security", description: "Freedom from danger, risk and doubt.", rating: "VERY_GOOD" },
  { dimension: "Access", category: "Access", description: "Approachable and easy to contact.", rating: "GOOD" },
  { dimension: "Communication", category: "Communication", description: "Listening and acknowledging. Keeping you informed in their language you can understand.", rating: "EXCELLENT" },
];

export const DEFAULT_PACKING_MATERIALS: PackingMaterialEntry[] = [
  { materialName: "SMALL BOX", materialOutQty: 10, materialInQty: 0, qtyOut: 10, qtyIn: 0 },
  { materialName: "MEDIUM BOX", materialOutQty: 15, materialInQty: 0, qtyOut: 15, qtyIn: 0 },
  { materialName: "CLING WRAP", materialOutQty: 3, materialInQty: 0, qtyOut: 3, qtyIn: 0 },
  { materialName: "BUBBLE WRAP", materialOutQty: 2, materialInQty: 0, qtyOut: 2, qtyIn: 0 },
  { materialName: "PACKING TAPE", materialOutQty: 12, materialInQty: 0, qtyOut: 12, qtyIn: 0 },
  { materialName: "PAPER WRAP", materialOutQty: 5, materialInQty: 0, qtyOut: 5, qtyIn: 0 },
  { materialName: "OLD BOX (SMALL)", materialOutQty: 0, materialInQty: 0, qtyOut: 0, qtyIn: 0 },
  { materialName: "OLD BOX (MEDIUM)", materialOutQty: 0, materialInQty: 0, qtyOut: 0, qtyIn: 0 },
  { materialName: "BIG BOX", materialOutQty: 8, materialInQty: 0, qtyOut: 8, qtyIn: 0 },
];

export class MockCrewSheetService implements ICrewSheetService {
  private employees: Employee[] = [...DEFAULT_EMPLOYEES];
  private crewSheets: CrewSheet[] = [];

  constructor() {
    // Seed initial demo Crew Sheet
    const initialSheet: CrewSheet = {
      id: "cs-4001",
      crewSheetNumber: "S.No. 4001",
      serialNumber: "S.No. 4001",
      customerId: "cust-01",
      allocationId: "alloc-101",
      packingListId: "pl-1001",
      status: "ASSIGNED",
      moveTypes: ["STORAGE", "LOCAL_MOVE"],
      dateTime: "2026-10-06 09:00 AM",
      clientName: "Al Habtoor Group",
      contactPersonNumberOnSite: "Mr. Saeed / +971 4 399 9999",
      contactPersonNumber: "Mr. Saeed / +971 4 399 9999",
      fromLocation: "Villa 14, Al Safa 2, Dubai",
      toLocation: "MoveIt Logistics Hub, Al Quoz 1",
      teamLeaderId: "emp-tl-1",
      teamLeaderName: "Ahmed Al-Mansoori",
      packerIds: ["emp-pk-1", "emp-pk-2"],
      packerNames: ["Vikram Singh", "Hassan Ali"],
      packers: "Vikram Singh, Hassan Ali",
      helpers: ["Omar Farooq"],
      helperIds: ["emp-hp-1"],
      propertyType: "VILLA",
      manpowerTotalCbm: 12.5,
      totalCbm: 12.5,
      surveyedBy: "Operations Supervisor",
      advanceDepositCollected: "1,500 AED",
      advanceCollected: "1,500 AED",
      balanceToBeCollected: "3,000 AED",
      balanceToCollect: "3,000 AED",
      modeOfPayment: "BANK_TRANSFER",
      buildingPermitRequired: true,
      documentAttached: true,
      jobInstructions: "Handle leather sofa with extra bubble wrap. Fragile glassware in medium boxes.",
      preparedBy: "Operations Coordinator",
      coordinatedBy: "Logistics Desk",
      receivedBy: "Warehouse Lead",
      performanceReport: [...DEFAULT_PERFORMANCE_REPORT],
      packingMaterialDetails: [...DEFAULT_PACKING_MATERIALS],
      createdAt: "2026-10-06T08:00:00Z",
      updatedAt: "2026-10-06T08:00:00Z",
    };
    this.crewSheets.push(initialSheet);
  }

  private decorateSheet(sheet: CrewSheet): CrewSheet {
    const s = { ...sheet };
    s.serialNumber = s.crewSheetNumber;
    s.totalCbm = s.manpowerTotalCbm;
    s.contactPersonNumber = s.contactPersonNumberOnSite;
    s.advanceCollected = s.advanceDepositCollected;
    s.balanceToCollect = s.balanceToBeCollected;
    s.packers = s.packerNames ? s.packerNames.join(", ") : "";
    return s;
  }

  async getEmployees(roleFilter?: string): Promise<Employee[]> {
    if (roleFilter) {
      return this.employees.filter((e) => e.role === roleFilter);
    }
    return [...this.employees];
  }

  async getEmployeeById(id: string): Promise<Employee | null> {
    const found = this.employees.find((e) => e.id === id);
    return found ? { ...found } : null;
  }

  async addEmployee(input: Omit<Employee, "id" | "createdAt"> | CreateEmployeeInput): Promise<Employee> {
    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      name: input.name,
      role: input.role,
      systemRole: "STORAGE_OPERATOR",
      phone: input.phone || "+971 50 000 0000",
      email: input.email || `${input.name.toLowerCase().replace(/\s+/g, ".")}@moveit.com`,
      isAvailable: input.isAvailable !== undefined ? input.isAvailable : true,
      createdAt: new Date().toISOString(),
    };
    this.employees.push(newEmp);
    return { ...newEmp };
  }

  async createEmployee(input: CreateEmployeeInput): Promise<Employee> {
    return this.addEmployee(input);
  }

  async getCrewSheets(statusFilter?: CrewSheetStatus): Promise<CrewSheet[]> {
    let list = this.crewSheets;
    if (statusFilter) {
      list = list.filter((cs) => cs.status === statusFilter);
    }
    return list.map(s => this.decorateSheet(s));
  }

  async getCrewSheetById(id: string): Promise<CrewSheet | null> {
    const found = this.crewSheets.find((cs) => cs.id === id || cs.crewSheetNumber === id);
    return found ? this.decorateSheet(JSON.parse(JSON.stringify(found))) : null;
  }

  async createCrewSheet(
    input: CreateCrewSheetInput,
    _userRole: UserRole = "SUPER_ADMIN",
    performedBy: string = "Admin User"
  ): Promise<CrewSheet> {
    let clientName = input.clientName || "";
    let fromLocation = input.fromLocation || "";
    let toLocation = input.toLocation || "MoveIt Main Logistics Hub — Dubai";
    let contactPersonNumberOnSite = input.contactPersonNumberOnSite || "";

    if (input.customerId) {
      const cust = MOCK_CUSTOMERS.find((c) => c.id === input.customerId);
      if (cust) {
        if (!clientName) clientName = cust.companyName || cust.name;
        if (!contactPersonNumberOnSite) contactPersonNumberOnSite = `${cust.name} / ${cust.phone}`;
        if (!fromLocation) fromLocation = `${cust.address}, ${cust.city}`;
      }
    }

    if (input.allocationId) {
      const alloc = MOCK_ALLOCATIONS.find((a) => a.id === input.allocationId);
      if (alloc) {
        if (!clientName && alloc.customerName) clientName = alloc.customerName;
        if (alloc.locationPath) toLocation = alloc.locationPath;
      }
    }

    let teamLeaderName = input.teamLeaderName || "";
    if (input.teamLeaderId) {
      const tl = this.employees.find((e) => e.id === input.teamLeaderId);
      if (tl) teamLeaderName = tl.name;
    }

    const packerNames: string[] = [];
    if (input.packerIds && input.packerIds.length > 0) {
      for (const pId of input.packerIds) {
        const pk = this.employees.find((e) => e.id === pId);
        if (pk) packerNames.push(pk.name);
      }
    }

    const seq = this.crewSheets.length + 4001;
    const nowIso = new Date().toISOString();

    const newCS: CrewSheet = {
      id: `cs-${Date.now()}`,
      crewSheetNumber: `S.No. ${seq}`,
      customerId: input.customerId,
      allocationId: input.allocationId,
      packingListId: input.packingListId,
      status: input.teamLeaderId ? "ASSIGNED" : "DRAFT",
      moveTypes: input.moveTypes || ["STORAGE", "LOCAL_MOVE"],
      dateTime: input.dateTime || new Date().toISOString().replace("T", " ").substring(0, 16),
      clientName: clientName || "Client Unspecified",
      contactPersonNumberOnSite: contactPersonNumberOnSite || "On Site Supervisor",
      fromLocation: fromLocation || "Client Origin Site",
      toLocation: toLocation || "MoveIt Logistics Center, Al Quoz 1",
      teamLeaderId: input.teamLeaderId || "",
      teamLeaderName: teamLeaderName || "Unassigned",
      packerIds: input.packerIds || [],
      packerNames,
      propertyType: input.propertyType || "VILLA",
      manpowerTotalCbm: input.manpowerTotalCbm || 10.0,
      surveyedBy: "Surveyor Lead",
      advanceDepositCollected: "0 AED",
      balanceToBeCollected: "0 AED",
      modeOfPayment: "BANK_TRANSFER",
      buildingPermitRequired: false,
      documentAttached: true,
      jobInstructions: input.jobInstructions || "Standard MoveIt packing and transport procedure.",
      preparedBy: performedBy,
      coordinatedBy: "Operations Desk",
      receivedBy: "Warehouse Lead",
      performanceReport: JSON.parse(JSON.stringify(DEFAULT_PERFORMANCE_REPORT)),
      packingMaterialDetails: JSON.parse(JSON.stringify(DEFAULT_PACKING_MATERIALS)),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.crewSheets.unshift(newCS);

    await auditService.recordEvent({
      entityType: "CREW_SHEET",
      entityId: newCS.id,
      action: "CREW_SHEET_CREATED",
      description: `Crew Sheet '${newCS.crewSheetNumber}' created for client '${newCS.clientName}'.`,
      performedBy,
      metadata: { crewSheetNumber: newCS.crewSheetNumber, teamLeaderName },
    });

    return this.decorateSheet(JSON.parse(JSON.stringify(newCS)));
  }

  async assignCrew(
    input: AssignCrewInput,
    _userRole: UserRole = "SUPER_ADMIN",
    performedBy: string = "Admin User"
  ): Promise<CrewSheet> {
    const sheetId = input.crewSheetId || this.crewSheets[0]?.id;
    const idx = this.crewSheets.findIndex((cs) => cs.id === sheetId);
    if (idx === -1) {
      throw new Error(`Crew Sheet not found.`);
    }

    const tl = this.employees.find((e) => e.id === input.teamLeaderId);
    if (!tl) {
      throw new Error(`Team Leader with ID '${input.teamLeaderId}' not found.`);
    }
    if (!tl.isAvailable) {
      throw new Error(`Team Leader '${tl.name}' is currently unavailable.`);
    }

    const packerNames: string[] = [];
    for (const pId of input.packerIds) {
      const pk = this.employees.find((e) => e.id === pId);
      if (!pk) {
        throw new Error(`Crew member with ID '${pId}' not found.`);
      }
      if (!pk.isAvailable) {
        throw new Error(`Crew member '${pk.name}' is currently unavailable.`);
      }
      packerNames.push(pk.name);
    }

    const current = this.crewSheets[idx];
    const updated: CrewSheet = {
      ...current,
      teamLeaderId: tl.id,
      teamLeaderName: tl.name,
      packerIds: [...input.packerIds],
      packerNames,
      status: "ASSIGNED",
      updatedAt: new Date().toISOString(),
    };

    this.crewSheets[idx] = updated;

    await auditService.recordEvent({
      entityType: "CREW_SHEET",
      entityId: updated.id,
      action: "CREW_ASSIGNED",
      description: `Assigned Team Leader '${tl.name}' and ${packerNames.length} packers to Crew Sheet ${updated.crewSheetNumber}.`,
      performedBy,
      metadata: { teamLeader: tl.name, packers: packerNames },
    });

    return this.decorateSheet(JSON.parse(JSON.stringify(updated)));
  }

  async updateCrewSheet(
    id: string,
    updates: Partial<CrewSheet>,
    userRole: UserRole,
    performedBy: string = "User"
  ): Promise<CrewSheet> {
    const idx = this.crewSheets.findIndex((cs) => cs.id === id);
    if (idx === -1) {
      throw new Error(`Crew Sheet '${id}' not found.`);
    }

    const current = this.crewSheets[idx];

    // Security Rule: Team Leaders cannot modify protected original assignment history, CBM calculations, or approved packing list refs
    if (userRole === "STORAGE_OPERATOR") {
      if (updates.teamLeaderId && updates.teamLeaderId !== current.teamLeaderId) {
        throw new Error("Team Leaders cannot alter original crew assignment history. Contact Operations Admin.");
      }
      if (updates.packingListId && updates.packingListId !== current.packingListId) {
        throw new Error("Team Leaders cannot alter attached approved Packing List reference.");
      }
      if (updates.clientName && updates.clientName !== current.clientName) {
        throw new Error("Team Leaders cannot alter protected header client information.");
      }
      if (updates.manpowerTotalCbm !== undefined && updates.manpowerTotalCbm !== current.manpowerTotalCbm) {
        throw new Error("Team Leaders cannot alter protected CBM calculation.");
      }
      if (updates.totalCbm !== undefined && updates.totalCbm !== current.manpowerTotalCbm) {
        throw new Error("Team Leaders cannot alter protected CBM calculation.");
      }
    }

    // Map alias update keys back to standard schema properties
    const mappedUpdates: Partial<CrewSheet> = { ...updates };
    if (updates.advanceCollected !== undefined) {
      mappedUpdates.advanceDepositCollected = String(updates.advanceCollected) + (typeof updates.advanceCollected === 'number' ? " AED" : "");
    }
    if (updates.balanceToCollect !== undefined) {
      mappedUpdates.balanceToBeCollected = String(updates.balanceToCollect) + (typeof updates.balanceToCollect === 'number' ? " AED" : "");
    }

    const updated: CrewSheet = {
      ...current,
      ...mappedUpdates,
      updatedAt: new Date().toISOString(),
    };

    this.crewSheets[idx] = updated;
    return this.decorateSheet(JSON.parse(JSON.stringify(updated)));
  }

  async acceptJob(id: string, userRoleOrTlId?: string, performedBy: string = "Team Leader"): Promise<CrewSheet> {
    const idx = this.crewSheets.findIndex((cs) => cs.id === id);
    if (idx === -1) {
      throw new Error(`Crew Sheet '${id}' not found.`);
    }

    const current = this.crewSheets[idx];

    const updated: CrewSheet = {
      ...current,
      status: "IN_PROGRESS",
      updatedAt: new Date().toISOString(),
    };

    this.crewSheets[idx] = updated;

    await auditService.recordEvent({
      entityType: "CREW_SHEET",
      entityId: updated.id,
      action: "CREW_JOB_ACCEPTED",
      description: `Team Leader accepted job for Crew Sheet ${updated.crewSheetNumber}. Job status: IN_PROGRESS.`,
      performedBy,
      metadata: { status: "IN_PROGRESS" },
    });

    return this.decorateSheet(JSON.parse(JSON.stringify(updated)));
  }

  async submitCrewSheet(id: string, userRoleOrTlId?: string, performedBy: string = "Team Leader"): Promise<CrewSheet> {
    const idx = this.crewSheets.findIndex((cs) => cs.id === id);
    if (idx === -1) {
      throw new Error(`Crew Sheet '${id}' not found.`);
    }

    const current = this.crewSheets[idx];

    const updated: CrewSheet = {
      ...current,
      status: "SUBMITTED",
      updatedAt: new Date().toISOString(),
    };

    this.crewSheets[idx] = updated;

    await auditService.recordEvent({
      entityType: "CREW_SHEET",
      entityId: updated.id,
      action: "CREW_SHEET_SUBMITTED",
      description: `Crew Sheet ${updated.crewSheetNumber} submitted by Team Leader.`,
      performedBy,
      metadata: { status: "SUBMITTED" },
    });

    return this.decorateSheet(JSON.parse(JSON.stringify(updated)));
  }

  async completeCrewSheet(
    id: string,
    customerSignature: string,
    teamLeaderSignature: string,
    performedBy: string = "Team Leader"
  ): Promise<CrewSheet> {
    const idx = this.crewSheets.findIndex((cs) => cs.id === id);
    if (idx === -1) {
      throw new Error(`Crew Sheet '${id}' not found.`);
    }

    const current = this.crewSheets[idx];
    const nowIso = new Date().toISOString();

    const updated: CrewSheet = {
      ...current,
      customerSignature,
      teamLeaderSignature,
      signedAt: nowIso,
      status: "COMPLETED",
      updatedAt: nowIso,
    };

    this.crewSheets[idx] = updated;

    await auditService.recordEvent({
      entityType: "CREW_SHEET",
      entityId: updated.id,
      action: "CREW_SHEET_COMPLETED",
      description: `Crew Sheet ${updated.crewSheetNumber} completed with customer & team leader signatures.`,
      performedBy,
      metadata: { status: "COMPLETED", signedAt: nowIso },
    });

    return this.decorateSheet(JSON.parse(JSON.stringify(updated)));
  }

  async completeSignatures(
    id: string,
    signatures: { customerSignature: string; teamLeaderSignature: string },
    userRoleOrPerformedBy: string = "Team Leader"
  ): Promise<CrewSheet> {
    return this.completeCrewSheet(
      id,
      signatures.customerSignature,
      signatures.teamLeaderSignature,
      userRoleOrPerformedBy
    );
  }
}
