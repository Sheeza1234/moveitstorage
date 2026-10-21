import { 
  PackingList, 
  CreatePackingListInput, 
  AddExtraItemInput, 
  ExtraItem, 
  PackingListHeader, 
  PackingListItem, 
  PackingListSummary,
  PackingListVersion 
} from "@/types/packing-list";
import { Role } from "@/types/role";
import { IPackingListService } from "../interfaces/IPackingListService";
import { auditService } from "./audit-service";
import { notificationService } from "./notification-service";
import { PermissionGuard } from "../permission-guard";
import { MOCK_CUSTOMERS } from "./mock-db";

const DEFAULT_HEADER: PackingListHeader = {
  companyName: "MOVE IT Cargo Packaging and Movers LLC",
  personName: "",
  mobileNo: "",
  email: "",
  source: "Web Direct",
  jobTypes: ["Storage"],
  origin: "Al Quoz Industrial 1, Dubai",
  originDate: new Date().toISOString().split("T")[0],
  originTime: "09:00 AM",
  destination: "MoveIt Main Logistics Hub — Dubai",
  destinationDate: new Date().toISOString().split("T")[0],
  destinationTime: "11:00 AM",
  totalPackaging: "Standard MoveIt Crates & Stretch Wrap",
};

const DEFAULT_SUMMARY: PackingListSummary = {
  totalCurtainsBlinds: "0",
  totalWallFixtures: "0",
  totalBoxes: "0",
  totalPackages: "0",
  totalValueOfGoods: "0 AED",
  totalCbm: 0,
  estimatedKg: "0",
  totalWorkingDays: "1",
  noOfTrips: "1",
  amountOfMove: "0 AED",
  bldgPermit: "N/A",
  commodity: "Personal / Office Goods",
};

export class MockPackingListService implements IPackingListService {
  private packingLists: PackingList[] = [];

  constructor() {
    // Seed initial demo packing list
    const initialList: PackingList = {
      id: "pl-1001",
      packingListNumber: "S.No. 1001",
      customerId: "cust-01",
      allocationId: "alloc-101",
      currentVersion: 1,
      status: "APPROVED",
      header: {
        ...DEFAULT_HEADER,
        personName: "Al Habtoor Group",
        mobileNo: "+971 4 399 9999",
        email: "logistics@habtoor.com",
        jobTypes: ["Storage", "Commercial"],
      },
      items: [
        { id: "pli-1", name: "3 Seater Sofa", cbm: 1.5, quantity: 2, disassemblyAssembly: "D/A", additionalNotes: "Leather", totalCbm: 3.0 },
        { id: "pli-2", name: "King Bed", cbm: 2.7, quantity: 1, disassemblyAssembly: "D", additionalNotes: "Wooden Frame", totalCbm: 2.7 },
        { id: "pli-3", name: "Fridge", cbm: 0.99, quantity: 1, disassemblyAssembly: "N/A", additionalNotes: "Double Door", totalCbm: 0.99 },
      ],
      extraItems: [],
      summary: {
        ...DEFAULT_SUMMARY,
        totalCbm: 6.69,
        totalPackages: "4 Pcs",
        amountOfMove: "4,500 AED",
      },
      versions: [
        {
          version: 1,
          status: "APPROVED",
          header: {
            ...DEFAULT_HEADER,
            personName: "Al Habtoor Group",
            mobileNo: "+971 4 399 9999",
            email: "logistics@habtoor.com",
            jobTypes: ["Storage", "Commercial"],
          },
          items: [
            { id: "pli-1", name: "3 Seater Sofa", cbm: 1.5, quantity: 2, disassemblyAssembly: "D/A", additionalNotes: "Leather", totalCbm: 3.0 },
            { id: "pli-2", name: "King Bed", cbm: 2.7, quantity: 1, disassemblyAssembly: "D", additionalNotes: "Wooden Frame", totalCbm: 2.7 },
            { id: "pli-3", name: "Fridge", cbm: 0.99, quantity: 1, disassemblyAssembly: "N/A", additionalNotes: "Double Door", totalCbm: 0.99 },
          ],
          summary: {
            ...DEFAULT_SUMMARY,
            totalCbm: 6.69,
            totalPackages: "4 Pcs",
            amountOfMove: "4,500 AED",
          },
          createdAt: "2026-02-01T09:00:00Z",
          createdBy: "Operations Staff",
          approvedAt: "2026-02-01T10:00:00Z",
          approvedBy: "Storage Manager",
        }
      ],
      createdAt: "2026-02-01T09:00:00Z",
      createdBy: "Operations Staff",
      updatedAt: "2026-02-01T10:00:00Z",
      approvedAt: "2026-02-01T10:00:00Z",
      approvedBy: "Storage Manager",
    };
    this.packingLists.push(initialList);
  }

  private calculateTotalCbm(items: PackingListItem[]): number {
    const rawSum = items.reduce((sum, item) => {
      const itemTotal = (item.quantity !== undefined ? item.quantity : 0) * (item.cbm !== undefined ? item.cbm : 0);
      return sum + (isNaN(itemTotal) ? 0 : itemTotal);
    }, 0);
    return Number(rawSum.toFixed(2));
  }

  async getPackingLists(customerId?: string): Promise<PackingList[]> {
    if (customerId) {
      return this.packingLists.filter((pl) => pl.customerId === customerId);
    }
    return [...this.packingLists];
  }

  async getPackingListById(id: string): Promise<PackingList | null> {
    const found = this.packingLists.find((pl) => pl.id === id || pl.packingListNumber === id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async createPackingList(
    input: CreatePackingListInput,
    _userRole: Role = "SUPER_ADMIN",
    performedBy: string = "Admin User"
  ): Promise<PackingList> {
    const header: PackingListHeader = { ...DEFAULT_HEADER, ...input.header };

    if (input.customerId) {
      const cust = MOCK_CUSTOMERS.find((c) => c.id === input.customerId);
      if (cust) {
        header.personName = cust.name;
        header.email = cust.email;
        header.mobileNo = cust.phone;
        if (cust.companyName) header.companyName = cust.companyName;
      }
    }

    const items: PackingListItem[] = (input.items || []).map((item, idx) => {
      const qty = Math.max(0, item.quantity || 1);
      const cbm = Math.max(0, item.cbm || 0);
      return {
        id: item.id || `pli-${Date.now()}-${idx}`,
        catalogueItemId: item.catalogueItemId,
        name: item.name || "Custom Item",
        cbm,
        quantity: qty,
        disassemblyAssembly: item.disassemblyAssembly || "N/A",
        additionalNotes: item.additionalNotes || "",
        totalCbm: Number((qty * cbm).toFixed(2)),
        isCustom: item.isCustom || false,
      };
    });

    const totalCbm = this.calculateTotalCbm(items);
    const summary: PackingListSummary = {
      ...DEFAULT_SUMMARY,
      ...input.summary,
      totalCbm,
    };

    const seq = (this.packingLists.length + 1001);
    const nowIso = new Date().toISOString();

    const newPL: PackingList = {
      id: `pl-${Date.now()}`,
      packingListNumber: `S.No. ${seq}`,
      customerId: input.customerId,
      allocationId: input.allocationId,
      currentVersion: 1,
      status: "DRAFT",
      header,
      items,
      extraItems: [],
      summary,
      versions: [
        {
          version: 1,
          status: "DRAFT",
          header,
          items,
          summary,
          createdAt: nowIso,
          createdBy: performedBy,
        }
      ],
      createdAt: nowIso,
      createdBy: performedBy,
      updatedAt: nowIso,
    };

    this.packingLists.unshift(newPL);

    await auditService.recordEvent({
      entityType: "PACKING_LIST",
      entityId: newPL.id,
      action: "PACKING_LIST_CREATED",
      description: `Packing List '${newPL.packingListNumber}' created for ${header.personName} (Total CBM: ${totalCbm}).`,
      performedBy,
      metadata: { packingListNumber: newPL.packingListNumber, totalCbm },
    });

    return JSON.parse(JSON.stringify(newPL));
  }

  async updatePackingList(
    id: string,
    input: { header?: Partial<PackingListHeader>; items?: PackingListItem[]; summary?: Partial<PackingListSummary> },
    userRole: Role = "SUPER_ADMIN",
    performedBy: string = "User"
  ): Promise<PackingList> {
    const idx = this.packingLists.findIndex((pl) => pl.id === id);
    if (idx === -1) {
      throw new Error(`Packing List '${id}' not found.`);
    }

    const current = this.packingLists[idx];

    // Enforce Permission Guard (Module: PACKING_LIST, Action: EDIT)
    await PermissionGuard.enforce(
      userRole,
      "PACKING_LIST",
      "EDIT",
      {
        entityId: id,
        statusContext: current.status,
        previousState: current,
        attemptedState: input,
      },
      performedBy
    );

    const updatedHeader = { ...current.header, ...input.header };
    const updatedItems = input.items ? input.items.map((item) => {
      const qty = Math.max(0, item.quantity !== undefined ? item.quantity : 1);
      const cbm = Math.max(0, item.cbm !== undefined ? item.cbm : 0);
      return {
        ...item,
        name: item.name || (item as unknown as Record<string, string>).itemDescription || "Custom Item",
        quantity: qty,
        cbm,
        totalCbm: Number((qty * cbm).toFixed(2)),
      };
    }) : current.items;

    const totalCbm = this.calculateTotalCbm(updatedItems);
    const updatedSummary = { ...current.summary, ...input.summary, totalCbm };

    const updatedPL: PackingList = {
      ...current,
      header: updatedHeader,
      items: updatedItems,
      summary: updatedSummary,
      updatedAt: new Date().toISOString(),
    };

    this.packingLists[idx] = updatedPL;
    return JSON.parse(JSON.stringify(updatedPL));
  }

  async approvePackingList(id: string, userRole: Role, approvedBy: string = "Admin User"): Promise<PackingList> {
    const idx = this.packingLists.findIndex((pl) => pl.id === id);
    if (idx === -1) {
      throw new Error(`Packing List '${id}' not found.`);
    }

    const current = this.packingLists[idx];
    const nowIso = new Date().toISOString();

    const approvedPL: PackingList = {
      ...current,
      status: "APPROVED",
      approvedAt: nowIso,
      approvedBy,
      updatedAt: nowIso,
    };

    approvedPL.versions.unshift({
      version: approvedPL.currentVersion,
      status: "APPROVED",
      header: { ...approvedPL.header },
      items: [...approvedPL.items],
      summary: { ...approvedPL.summary },
      createdAt: nowIso,
      createdBy: approvedPL.createdBy,
      approvedAt: nowIso,
      approvedBy,
    });

    this.packingLists[idx] = approvedPL;

    await auditService.recordEvent({
      entityType: "PACKING_LIST",
      entityId: approvedPL.id,
      action: "PACKING_LIST_APPROVED",
      description: `Packing List '${approvedPL.packingListNumber}' approved by ${approvedBy}.`,
      performedBy: approvedBy,
      metadata: { version: approvedPL.currentVersion, totalCbm: approvedPL.summary.totalCbm },
    });

    return JSON.parse(JSON.stringify(approvedPL));
  }

  async revisePackingList(
    id: string,
    updates: { header?: Partial<PackingListHeader>; items?: PackingListItem[]; summary?: Partial<PackingListSummary> },
    reason: string,
    userRole: Role,
    revisedBy: string = "Admin User"
  ): Promise<PackingList> {
    const idx = this.packingLists.findIndex((pl) => pl.id === id);
    if (idx === -1) {
      throw new Error(`Packing List '${id}' not found.`);
    }

    const current = this.packingLists[idx];
    const newVersionNum = current.currentVersion + 1;
    const nowIso = new Date().toISOString();

    const updatedHeader = { ...current.header, ...updates.header };
    const updatedItems = updates.items ? updates.items.map((item) => {
      const qty = Math.max(0, item.quantity);
      const cbm = Math.max(0, item.cbm);
      return {
        ...item,
        quantity: qty,
        cbm,
        totalCbm: Number((qty * cbm).toFixed(2)),
      };
    }) : current.items;

    const totalCbm = this.calculateTotalCbm(updatedItems);
    const updatedSummary = { ...current.summary, ...updates.summary, totalCbm };

    const versionSnapshot: PackingListVersion = {
      version: newVersionNum,
      status: "REVISED",
      header: updatedHeader,
      items: updatedItems,
      summary: updatedSummary,
      createdAt: nowIso,
      createdBy: revisedBy,
      revisionReason: reason,
    };

    const revisedPL: PackingList = {
      ...current,
      currentVersion: newVersionNum,
      status: "REVISED",
      header: updatedHeader,
      items: updatedItems,
      summary: updatedSummary,
      versions: [versionSnapshot, ...current.versions],
      updatedAt: nowIso,
    };

    this.packingLists[idx] = revisedPL;

    await auditService.recordEvent({
      entityType: "PACKING_LIST",
      entityId: revisedPL.id,
      action: "PACKING_LIST_REVISED",
      description: `Packing List '${revisedPL.packingListNumber}' revised to v${newVersionNum}. Reason: ${reason}`,
      performedBy: revisedBy,
      metadata: { newVersion: newVersionNum, reason },
    });

    return JSON.parse(JSON.stringify(revisedPL));
  }

  async addExtraItem(
    packingListId: string,
    input: AddExtraItemInput,
    userRole: Role,
    submittedBy: string = "Team Leader"
  ): Promise<ExtraItem> {
    const idx = this.packingLists.findIndex((pl) => pl.id === packingListId);
    if (idx === -1) {
      throw new Error(`Packing List '${packingListId}' not found.`);
    }

    if (!input.name || input.name.trim() === "") {
      throw new Error("Extra item name is required.");
    }
    if (input.quantity <= 0) {
      throw new Error("Quantity must be greater than 0.");
    }
    if (input.cbm < 0) {
      throw new Error("CBM cannot be negative.");
    }

    const nowIso = new Date().toISOString();
    const extraItem: ExtraItem = {
      id: `ex-${Date.now()}`,
      packingListId,
      name: input.name.trim(),
      quantity: input.quantity,
      cbm: input.cbm,
      totalCbm: Number((input.quantity * input.cbm).toFixed(2)),
      reason: input.reason || "Additional customer item found on site",
      notes: input.notes,
      submittedBy,
      submittedAt: nowIso,
      status: "PENDING_REVIEW",
    };

    this.packingLists[idx].extraItems.push(extraItem);
    this.packingLists[idx].updatedAt = nowIso;

    await auditService.recordEvent({
      entityType: "PACKING_LIST",
      entityId: packingListId,
      action: "EXTRA_ITEM_SUBMITTED",
      description: `Extra item '${extraItem.name}' (${extraItem.quantity} pcs, ${extraItem.totalCbm} CBM) submitted for review by ${submittedBy}.`,
      performedBy: submittedBy,
      metadata: { extraItem },
    });

    return { ...extraItem };
  }

  async reviewExtraItem(
    packingListId: string,
    extraItemId: string,
    action: "APPROVE" | "REJECT",
    userRole: Role,
    reviewedBy: string = "Admin User",
    reviewNotes?: string
  ): Promise<PackingList> {
    const idx = this.packingLists.findIndex((pl) => pl.id === packingListId);
    if (idx === -1) {
      throw new Error(`Packing List '${packingListId}' not found.`);
    }

    const pl = this.packingLists[idx];
    const extraIdx = pl.extraItems.findIndex((ex) => ex.id === extraItemId);
    if (extraIdx === -1) {
      throw new Error(`Extra item '${extraItemId}' not found.`);
    }

    const extra = pl.extraItems[extraIdx];
    const nowIso = new Date().toISOString();

    extra.status = action === "APPROVE" ? "APPROVED" : "REJECTED";
    extra.reviewedBy = reviewedBy;
    extra.reviewedAt = nowIso;
    extra.reviewNotes = reviewNotes;

    if (action === "APPROVE") {
      // Add extra item to active packing list items
      const newPLItem: PackingListItem = {
        id: `pli-ex-${Date.now()}`,
        name: `${extra.name} (Extra Item)`,
        cbm: extra.cbm,
        quantity: extra.quantity,
        disassemblyAssembly: "N/A",
        additionalNotes: `Approved Extra Item: ${extra.reason}`,
        totalCbm: extra.totalCbm,
        isCustom: true,
      };

      pl.items.push(newPLItem);
      const newTotalCbm = this.calculateTotalCbm(pl.items);
      pl.summary.totalCbm = newTotalCbm;

      // Version bump to REVISED
      pl.currentVersion += 1;
      pl.status = "REVISED";

      const versionSnapshot: PackingListVersion = {
        version: pl.currentVersion,
        status: "REVISED",
        header: { ...pl.header },
        items: [...pl.items],
        summary: { ...pl.summary },
        createdAt: nowIso,
        createdBy: reviewedBy,
        revisionReason: `Approved Extra Item: ${extra.name} (${extra.quantity} pcs, ${extra.totalCbm} CBM)`,
      };
      pl.versions.unshift(versionSnapshot);

      pl.summary.quotationReviewRequired = true;

      // Rule 9: Create Admin alert for quotation/storage requirement review
      await notificationService.addNotification({
        title: "Urgent Quotation / Storage Requirement Review Required",
        message: `Urgent quotation/storage requirement review required. Approved extra item '${extra.name}' increased total packing CBM by ${extra.totalCbm} CBM (New Total: ${newTotalCbm} CBM).`,
        severity: "CRITICAL",
        entityId: packingListId,
      });
    }

    pl.updatedAt = nowIso;
    this.packingLists[idx] = pl;

    await auditService.recordEvent({
      entityType: "PACKING_LIST",
      entityId: packingListId,
      action: "EXTRA_ITEM_REVIEWED",
      description: `Extra item '${extra.name}' ${action.toLowerCase()}d by ${reviewedBy}.`,
      performedBy: reviewedBy,
      metadata: { extraItemId, action, totalCbm: pl.summary.totalCbm },
    });

    return JSON.parse(JSON.stringify(pl));
  }

  async approveExtraItem(packingListId: string, extraItemId: string, reviewedBy: string = "Admin User"): Promise<ExtraItem> {
    const pl = await this.reviewExtraItem(packingListId, extraItemId, "APPROVE", "SUPER_ADMIN", reviewedBy);
    const extra = pl.extraItems.find((e) => e.id === extraItemId);
    if (extra) {
      extra.approvedBy = reviewedBy;
      extra.approvedAt = new Date().toISOString();
      return { ...extra };
    }
    return { id: extraItemId, packingListId, name: "", quantity: 1, cbm: 0, totalCbm: 0, reason: "", submittedBy: "", submittedAt: "", status: "APPROVED", approvedBy: reviewedBy };
  }
}
