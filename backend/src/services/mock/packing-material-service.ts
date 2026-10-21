import { 
  PackingMaterial, 
  CreatePackingMaterialInput,
  ApprovedMaterialItem,
  JobMaterialAllocation,
  IssueMaterialInput,
  MaterialIssuance,
  ReturnMaterialInput,
  MaterialReturn,
  CreateMaterialChangeRequestInput,
  MaterialChangeRequest,
  MaterialUsageRecord
} from "@/types/packing-material";
import { UserRole } from "@/types/role";
import { IPackingMaterialService } from "../interfaces/IPackingMaterialService";
import { auditService } from "./audit-service";
import { PermissionGuard } from "../permission-guard";
import { services } from "../index";

export const DEFAULT_PACKING_MATERIALS_MASTER: PackingMaterial[] = [
  { id: "mat-sm-box", name: "Small Box", unit: "Piece", availableQty: 500, minStock: 50, isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "mat-md-box", name: "Medium Box", unit: "Piece", availableQty: 400, minStock: 40, isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "mat-cling", name: "Cling Wrap", unit: "Roll", availableQty: 100, minStock: 10, isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "mat-bubble", name: "Bubble Wrap", unit: "Roll", availableQty: 80, minStock: 15, isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "mat-tape", name: "Packing Tape", unit: "Roll", availableQty: 300, minStock: 30, isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "mat-paper", name: "Paper Wrap", unit: "Bundle", availableQty: 150, minStock: 20, isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "mat-old-sm", name: "Old Box (Small)", unit: "Piece", availableQty: 100, minStock: 10, isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "mat-old-md", name: "Old Box (Medium)", unit: "Piece", availableQty: 100, minStock: 10, isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "mat-bg-box", name: "Big Box", unit: "Piece", availableQty: 250, minStock: 25, isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
];

export class MockPackingMaterialService implements IPackingMaterialService {
  private materials: PackingMaterial[] = [...DEFAULT_PACKING_MATERIALS_MASTER];
  private jobAllocations: JobMaterialAllocation[] = [];
  private issuances: MaterialIssuance[] = [];
  private returns: MaterialReturn[] = [];
  private changeRequests: MaterialChangeRequest[] = [];

  constructor() {
    // Seed initial demo approved material allocation for cs-4001
    const defaultJobAlloc: JobMaterialAllocation = {
      id: "jma-4001-v1",
      jobId: "cs-4001",
      version: 1,
      isApproved: true,
      approvedBy: "Operations Admin",
      approvedAt: "2026-10-06T08:30:00Z",
      items: [
        { materialId: "mat-sm-box", materialName: "Small Box", approvedQty: 10 },
        { materialId: "mat-md-box", materialName: "Medium Box", approvedQty: 15 },
        { materialId: "mat-cling", materialName: "Cling Wrap", approvedQty: 3 },
        { materialId: "mat-bubble", materialName: "Bubble Wrap", approvedQty: 2 },
        { materialId: "mat-tape", materialName: "Packing Tape", approvedQty: 12 },
        { materialId: "mat-paper", materialName: "Paper Wrap", approvedQty: 5 },
        { materialId: "mat-old-sm", materialName: "Old Box (Small)", approvedQty: 0 },
        { materialId: "mat-old-md", materialName: "Old Box (Medium)", approvedQty: 0 },
        { materialId: "mat-bg-box", materialName: "Big Box", approvedQty: 8 },
      ],
      createdAt: "2026-10-06T08:30:00Z",
      updatedAt: "2026-10-06T08:30:00Z",
    };
    this.jobAllocations.push(defaultJobAlloc);
  }

  async getMaterials(): Promise<PackingMaterial[]> {
    return JSON.parse(JSON.stringify(this.materials));
  }

  async getMaterialById(id: string): Promise<PackingMaterial | null> {
    const found = this.materials.find((m) => m.id === id || m.name.toLowerCase() === id.toLowerCase());
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async createMaterial(input: CreatePackingMaterialInput, performedBy: string = "Admin User"): Promise<PackingMaterial> {
    const newMat: PackingMaterial = {
      id: `mat-${Date.now()}`,
      name: input.name,
      unit: input.unit,
      availableQty: input.availableQty,
      minStock: input.minStock,
      isActive: input.isActive !== undefined ? input.isActive : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.materials.push(newMat);

    await auditService.recordEvent({
      entityType: "PACKING_MATERIAL",
      entityId: newMat.id,
      action: "MATERIAL_CREATED",
      description: `Created new packing material '${newMat.name}' (${newMat.availableQty} ${newMat.unit}).`,
      performedBy,
      metadata: { name: newMat.name, availableQty: newMat.availableQty, minStock: newMat.minStock },
    });

    return JSON.parse(JSON.stringify(newMat));
  }

  async updateMaterial(
    id: string,
    updates: Partial<PackingMaterial>,
    userRole: UserRole = "SUPER_ADMIN",
    performedBy: string = "Admin User"
  ): Promise<PackingMaterial> {
    await PermissionGuard.enforce(userRole, "PACKING_MATERIAL", "EDIT", { entityId: id, attemptedState: updates }, performedBy);

    const idx = this.materials.findIndex((m) => m.id === id);
    if (idx === -1) {
      throw new Error(`Packing Material '${id}' not found.`);
    }

    const current = this.materials[idx];
    const updated: PackingMaterial = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.materials[idx] = updated;

    await auditService.recordEvent({
      entityType: "PACKING_MATERIAL",
      entityId: updated.id,
      action: "MATERIAL_EDITED",
      description: `Updated packing material '${updated.name}'. Available Stock: ${updated.availableQty}, Min Stock: ${updated.minStock}.`,
      performedBy,
      metadata: { oldStock: current.availableQty, newStock: updated.availableQty },
    });

    return JSON.parse(JSON.stringify(updated));
  }

  async allocateMaterialsForJob(
    jobId: string,
    items: ApprovedMaterialItem[],
    userRole: UserRole = "SUPER_ADMIN",
    performedBy: string = "Admin User"
  ): Promise<JobMaterialAllocation> {
    const existingApproved = this.jobAllocations.find((a) => a.jobId === jobId && a.isApproved);
    if (existingApproved) {
      await PermissionGuard.enforce(
        userRole,
        "PACKING_MATERIAL",
        "APPROVE",
        { entityId: jobId, statusContext: "APPROVED", attemptedState: items },
        performedBy
      );
    }

    const nowIso = new Date().toISOString();
    const existing = this.jobAllocations.filter((a) => a.jobId === jobId);
    const version = existing.length + 1;

    const newAlloc: JobMaterialAllocation = {
      id: `jma-${jobId}-v${version}`,
      jobId,
      version,
      isApproved: false,
      items: JSON.parse(JSON.stringify(items)),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.jobAllocations.unshift(newAlloc);

    return JSON.parse(JSON.stringify(newAlloc));
  }

  async approveJobMaterialList(
    jobId: string,
    userRole: UserRole = "SUPER_ADMIN",
    performedBy: string = "Admin User"
  ): Promise<JobMaterialAllocation> {
    if (userRole === "STORAGE_OPERATOR") {
      throw new Error("Locked: Only Operations Admin can approve Packing Material Lists for jobs.");
    }

    const allocs = this.jobAllocations.filter((a) => a.jobId === jobId);
    if (allocs.length === 0) {
      throw new Error(`No material allocation found for job '${jobId}'.`);
    }

    const target = allocs[0]; // latest version
    target.isApproved = true;
    target.approvedBy = performedBy;
    target.approvedAt = new Date().toISOString();
    target.updatedAt = new Date().toISOString();

    await auditService.recordEvent({
      entityType: "PACKING_MATERIAL",
      entityId: target.id,
      action: "MATERIAL_APPROVED_FOR_JOB",
      description: `Approved Packing Material List v${target.version} for Job '${jobId}'.`,
      performedBy,
      metadata: { jobId, version: target.version, itemHits: target.items.length },
    });

    return JSON.parse(JSON.stringify(target));
  }

  async getJobMaterialList(jobId: string, version?: number): Promise<JobMaterialAllocation | null> {
    const list = this.jobAllocations.filter((a) => a.jobId === jobId);
    if (list.length === 0) return null;
    if (version) {
      const match = list.find((a) => a.version === version);
      return match ? JSON.parse(JSON.stringify(match)) : null;
    }
    // Return latest version
    return JSON.parse(JSON.stringify(list[0]));
  }

  async issueMaterial(
    input: IssueMaterialInput,
    _userRole: UserRole = "SUPER_ADMIN",
    performedBy: string = "User"
  ): Promise<MaterialIssuance> {
    if (input.quantityOut <= 0) {
      throw new Error("Quantity OUT must be greater than zero.");
    }

    const mat = this.materials.find(
      (m) => m.id === input.materialId || m.name.toLowerCase() === input.materialId.toLowerCase()
    );
    if (!mat) {
      throw new Error(`Packing material '${input.materialId}' not found.`);
    }

    // Section 4: Prevent negative stock
    if (mat.availableQty < input.quantityOut) {
      throw new Error(`Insufficient stock for material '${mat.name}'. Required: ${input.quantityOut}, Available: ${mat.availableQty}.`);
    }

    // Reduce available stock
    mat.availableQty -= input.quantityOut;
    mat.updatedAt = new Date().toISOString();

    const nowIso = new Date().toISOString();
    const issuance: MaterialIssuance = {
      id: `mat-out-${Date.now()}`,
      jobId: input.jobId,
      materialId: mat.id,
      materialName: mat.name,
      quantityOut: input.quantityOut,
      dateTime: input.dateTime || nowIso.replace("T", " ").substring(0, 16),
      issuedBy: input.issuedBy || performedBy,
      receivedBy: input.receivedBy || "Storekeeper",
      teamLeaderId: input.teamLeaderId || "emp-tl-1",
      signature: input.signature,
      createdAt: nowIso,
    };

    this.issuances.unshift(issuance);

    // Synchronize into Crew Sheet packing material details table if available
    try {
      if (services.crewSheetService) {
        const cs = await services.crewSheetService.getCrewSheetById(input.jobId);
        if (cs) {
          const updatedDetails = cs.packingMaterialDetails.map((pm) => {
            if (pm.materialName.toLowerCase() === mat.name.toLowerCase()) {
              const currentOut = pm.materialOutQty || 0;
              return {
                ...pm,
                materialOutQty: currentOut + input.quantityOut,
                qtyOut: currentOut + input.quantityOut,
              };
            }
            return pm;
          });
          await services.crewSheetService.updateCrewSheet(cs.id, { packingMaterialDetails: updatedDetails }, "SUPER_ADMIN", performedBy);
        }
      }
    } catch (e) {
      console.warn("Crew sheet sync notice:", e);
    }

    await auditService.recordEvent({
      entityType: "PACKING_MATERIAL",
      entityId: issuance.id,
      action: "MATERIAL_ISSUED",
      description: `Issued ${input.quantityOut} ${mat.unit}(s) of '${mat.name}' for Job '${input.jobId}'. Remaining stock: ${mat.availableQty}.`,
      performedBy,
      metadata: { jobId: input.jobId, material: mat.name, qtyOut: input.quantityOut, remainingStock: mat.availableQty },
    });

    return JSON.parse(JSON.stringify(issuance));
  }

  async returnMaterial(
    input: ReturnMaterialInput,
    _userRole: UserRole = "SUPER_ADMIN",
    performedBy: string = "User"
  ): Promise<MaterialReturn> {
    if (input.quantityIn <= 0) {
      throw new Error("Quantity IN must be greater than zero.");
    }

    const mat = this.materials.find(
      (m) => m.id === input.materialId || m.name.toLowerCase() === input.materialId.toLowerCase()
    );
    if (!mat) {
      throw new Error(`Packing material '${input.materialId}' not found.`);
    }

    // Increase available stock
    mat.availableQty += input.quantityIn;
    mat.updatedAt = new Date().toISOString();

    const nowIso = new Date().toISOString();
    const ret: MaterialReturn = {
      id: `mat-in-${Date.now()}`,
      jobId: input.jobId,
      materialId: mat.id,
      materialName: mat.name,
      quantityIn: input.quantityIn,
      dateTime: input.dateTime || nowIso.replace("T", " ").substring(0, 16),
      receivedBy: input.receivedBy || performedBy,
      returnedBy: input.returnedBy || "Team Leader",
      notes: input.notes,
      createdAt: nowIso,
    };

    this.returns.unshift(ret);

    // Synchronize into Crew Sheet packing material details table if available
    try {
      if (services.crewSheetService) {
        const cs = await services.crewSheetService.getCrewSheetById(input.jobId);
        if (cs) {
          const updatedDetails = cs.packingMaterialDetails.map((pm) => {
            if (pm.materialName.toLowerCase() === mat.name.toLowerCase()) {
              const currentIn = pm.materialInQty || 0;
              return {
                ...pm,
                materialInQty: currentIn + input.quantityIn,
                qtyIn: currentIn + input.quantityIn,
              };
            }
            return pm;
          });
          await services.crewSheetService.updateCrewSheet(cs.id, { packingMaterialDetails: updatedDetails }, "SUPER_ADMIN", performedBy);
        }
      }
    } catch (e) {
      console.warn("Crew sheet sync notice:", e);
    }

    await auditService.recordEvent({
      entityType: "PACKING_MATERIAL",
      entityId: ret.id,
      action: "MATERIAL_RETURNED",
      description: `Returned ${input.quantityIn} ${mat.unit}(s) of '${mat.name}' for Job '${input.jobId}'. Restored stock: ${mat.availableQty}.`,
      performedBy,
      metadata: { jobId: input.jobId, material: mat.name, qtyIn: input.quantityIn, restoredStock: mat.availableQty },
    });

    return JSON.parse(JSON.stringify(ret));
  }

  async requestMaterialChange(
    input: CreateMaterialChangeRequestInput,
    performedBy: string = "Team Leader"
  ): Promise<MaterialChangeRequest> {
    const req: MaterialChangeRequest = {
      id: `mcr-${Date.now()}`,
      jobId: input.jobId,
      requestedBy: input.requestedBy || performedBy,
      reason: input.reason,
      status: "PENDING",
      items: JSON.parse(JSON.stringify(input.items)),
      createdAt: new Date().toISOString(),
    };

    this.changeRequests.unshift(req);

    await auditService.recordEvent({
      entityType: "PACKING_MATERIAL",
      entityId: req.id,
      action: "MATERIAL_CHANGE_REQUESTED",
      description: `Team Leader '${req.requestedBy}' requested material list change for Job '${req.jobId}'. Reason: ${req.reason}`,
      performedBy,
      metadata: { jobId: req.jobId, reason: req.reason },
    });

    return JSON.parse(JSON.stringify(req));
  }

  async reviewMaterialChange(
    requestId: string,
    approve: boolean,
    userRole: UserRole = "SUPER_ADMIN",
    performedBy: string = "Operations Admin"
  ): Promise<MaterialChangeRequest> {
    if (userRole === "STORAGE_OPERATOR") {
      throw new Error("Only Operations Admin can review and approve material change requests.");
    }

    const idx = this.changeRequests.findIndex((r) => r.id === requestId);
    if (idx === -1) {
      throw new Error(`Material Change Request '${requestId}' not found.`);
    }

    const req = this.changeRequests[idx];
    req.status = approve ? "APPROVED" : "REJECTED";
    req.reviewedBy = performedBy;
    req.reviewedAt = new Date().toISOString();

    if (approve) {
      // Create new version of approved material allocation list for job
      const existingVersions = this.jobAllocations.filter((a) => a.jobId === req.jobId);
      const newVersion = existingVersions.length + 1;

      const newAllocItems: ApprovedMaterialItem[] = req.items.map((item) => ({
        materialId: item.materialId,
        materialName: item.materialName,
        approvedQty: item.requestedQty,
      }));

      const newAlloc: JobMaterialAllocation = {
        id: `jma-${req.jobId}-v${newVersion}`,
        jobId: req.jobId,
        version: newVersion,
        isApproved: true,
        approvedBy: performedBy,
        approvedAt: new Date().toISOString(),
        items: newAllocItems,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.jobAllocations.unshift(newAlloc);

      await auditService.recordEvent({
        entityType: "PACKING_MATERIAL",
        entityId: req.id,
        action: "MATERIAL_CHANGE_APPROVED",
        description: `Approved Material Change Request '${req.id}' for Job '${req.jobId}'. Created approved material list v${newVersion}.`,
        performedBy,
        metadata: { jobId: req.jobId, newVersion },
      });
    }

    return JSON.parse(JSON.stringify(req));
  }

  async getChangeRequests(jobId?: string): Promise<MaterialChangeRequest[]> {
    if (jobId) {
      return JSON.parse(JSON.stringify(this.changeRequests.filter((r) => r.jobId === jobId)));
    }
    return JSON.parse(JSON.stringify(this.changeRequests));
  }

  async getMaterialUsage(jobId: string): Promise<MaterialUsageRecord[]> {
    const latestAlloc = await this.getJobMaterialList(jobId);
    const approvedMap = new Map<string, number>();
    if (latestAlloc) {
      latestAlloc.items.forEach((item) => {
        approvedMap.set(item.materialName.toLowerCase(), item.approvedQty);
      });
    }

    const jobIssuances = this.issuances.filter((i) => i.jobId === jobId);
    const jobReturns = this.returns.filter((r) => r.jobId === jobId);

    const outMap = new Map<string, number>();
    jobIssuances.forEach((i) => {
      const key = i.materialName.toLowerCase();
      outMap.set(key, (outMap.get(key) || 0) + i.quantityOut);
    });

    const inMap = new Map<string, number>();
    jobReturns.forEach((r) => {
      const key = r.materialName.toLowerCase();
      inMap.set(key, (inMap.get(key) || 0) + r.quantityIn);
    });

    return this.materials.map((m) => {
      const key = m.name.toLowerCase();
      const approvedQty = approvedMap.get(key) || 0;
      const quantityOut = outMap.get(key) || 0;
      const quantityIn = inMap.get(key) || 0;
      const used = Math.max(0, quantityOut - quantityIn);

      return {
        materialId: m.id,
        materialName: m.name,
        approvedQty,
        quantityOut,
        quantityIn,
        used,
      };
    });
  }

  async getLowStockAlerts(): Promise<PackingMaterial[]> {
    return JSON.parse(
      JSON.stringify(this.materials.filter((m) => m.isActive && m.availableQty <= m.minStock))
    );
  }

  async getIssuancesForJob(jobId: string): Promise<MaterialIssuance[]> {
    return JSON.parse(JSON.stringify(this.issuances.filter((i) => i.jobId === jobId)));
  }

  async getReturnsForJob(jobId: string): Promise<MaterialReturn[]> {
    return JSON.parse(JSON.stringify(this.returns.filter((r) => r.jobId === jobId)));
  }
}
