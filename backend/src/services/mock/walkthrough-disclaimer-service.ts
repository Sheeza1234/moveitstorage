import { 
  WalkthroughDisclaimer, 
  CreateWalkthroughDisclaimerInput,
  WalkthroughChecklistItem,
  RecordDamageInput,
  DamageItemRecord,
  RecordMissingItemInput,
  MissingItemRecord,
  SignWalkthroughInput,
  WalkthroughDisclaimerStatus
} from "@/types/walkthrough-disclaimer";
import { UserRole } from "@/types/role";
import { IWalkthroughDisclaimerService } from "../interfaces/IWalkthroughDisclaimerService";
import { auditService } from "./audit-service";
import { services } from "../index";
import { MOCK_CUSTOMERS } from "./mock-db";

export const DEFAULT_WALKTHROUGH_CHECKLIST: WalkthroughChecklistItem[] = [
  { sl: 1, particulars: "Checked all my items and removed from the ORIGIN OF REMOVALS", yes: true, no: false },
  { sl: 2, particulars: "Checked the STORAGE/VEHICLE/TRUCK/CONTAINER and there are no ITEMS left behind.", yes: true, no: false },
  { sl: 3, particulars: "Walk through with the CREW LEADER and everything is unpack the way I requested to.", yes: true, no: false },
  { sl: 4, particulars: "Walk through with the CREW LEADER and check all my items are complete and intact.", yes: true, no: false },
  { sl: 5, particulars: "Items are mishandled and broken", yes: false, no: true },
  { sl: 6, particulars: "I have broken cupboards, cabinets, bed, tables, etc.", yes: false, no: true },
];

export const DEFAULT_WALKTHROUGH_DISCLAIMERS: WalkthroughDisclaimer[] = [
  {
    id: "wt-5001",
    disclaimerNumber: "WT-5001",
    customerId: "cust-01",
    customerName: "Al Habtoor Group",
    allocationId: "alloc-101",
    crewSheetId: "cs-4001",
    date: "2026-10-06",
    checklist: JSON.parse(JSON.stringify(DEFAULT_WALKTHROUGH_CHECKLIST)),
    damageRecords: [],
    missingItemRecords: [],
    boxesToBeCollected: 30,
    emptyBoxCollectionDate: "2026-10-15",
    customerNameDetails: "Saeed Al Habtoor",
    customerSignature: "DATA:IMAGE/PNG;BASE64,MOCK_CUSTOMER_SIG_WT",
    customerSignedAt: "2026-10-06T15:30:00Z",
    crewLeaderNameDetails: "Ahmed Al-Mansoori (Crew Leader)",
    crewLeaderSignature: "DATA:IMAGE/PNG;BASE64,MOCK_CREW_LEADER_SIG_WT",
    crewLeaderSignedAt: "2026-10-06T15:30:00Z",
    status: "COMPLETED",
    createdAt: "2026-10-06T09:00:00Z",
    updatedAt: "2026-10-06T15:30:00Z",
  },
];

export class MockWalkthroughDisclaimerService implements IWalkthroughDisclaimerService {
  private disclaimers: WalkthroughDisclaimer[] = [...DEFAULT_WALKTHROUGH_DISCLAIMERS];

  async getDisclaimers(): Promise<WalkthroughDisclaimer[]> {
    return JSON.parse(JSON.stringify(this.disclaimers));
  }

  async getDisclaimerById(id: string): Promise<WalkthroughDisclaimer | null> {
    const found = this.disclaimers.find((d) => d.id === id || d.disclaimerNumber === id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async getDisclaimerByCustomer(customerId: string): Promise<WalkthroughDisclaimer | null> {
    const found = this.disclaimers.find((d) => d.customerId === customerId);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async getDisclaimerByCrewSheet(crewSheetId: string): Promise<WalkthroughDisclaimer | null> {
    const found = this.disclaimers.find((d) => d.crewSheetId === crewSheetId);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async createDisclaimer(
    input: CreateWalkthroughDisclaimerInput,
    performedBy: string = "Crew Leader"
  ): Promise<WalkthroughDisclaimer> {
    let custName = input.customerName || "";
    if (!custName && input.customerId) {
      const cust = MOCK_CUSTOMERS.find((c) => c.id === input.customerId);
      if (cust) custName = cust.companyName || cust.name;
    }

    const seq = this.disclaimers.length + 5001;
    const nowIso = new Date().toISOString();
    const todayStr = input.date || nowIso.substring(0, 10);

    const newDisclaimer: WalkthroughDisclaimer = {
      id: `wt-${Date.now()}`,
      disclaimerNumber: `WT-${seq}`,
      customerId: input.customerId || "cust-01",
      customerName: custName || "Client Unspecified",
      allocationId: input.allocationId,
      crewSheetId: input.crewSheetId,
      date: todayStr,
      checklist: JSON.parse(JSON.stringify(DEFAULT_WALKTHROUGH_CHECKLIST)),
      damageRecords: [],
      missingItemRecords: [],
      boxesToBeCollected: input.boxesToBeCollected || 0,
      emptyBoxCollectionDate: input.emptyBoxCollectionDate || "",
      customerNameDetails: input.customerNameDetails || custName,
      crewLeaderNameDetails: input.crewLeaderNameDetails || "Ahmed Al-Mansoori (Crew Leader)",
      status: "DRAFT",
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.disclaimers.unshift(newDisclaimer);

    // Box Collection integration (Prompt 19)
    if (input.boxesToBeCollected && input.boxesToBeCollected > 0 && services.boxCollectionService) {
      try {
        await services.boxCollectionService.createTracker({
          customerId: input.customerId || "cust-01",
          customerName: custName,
          allocationId: input.allocationId,
          crewSheetId: input.crewSheetId,
          boxesRequired: input.boxesToBeCollected,
          nextCollectionDate: input.emptyBoxCollectionDate,
        }, performedBy);
      } catch (e) {
        console.warn("Box tracker sync notice:", e);
      }
    }

    await auditService.recordEvent({
      entityType: "WALKTHROUGH_DISCLAIMER",
      entityId: newDisclaimer.id,
      action: "WALKTHROUGH_DISCLAIMER_CREATED",
      description: `Created Walk Through & Damage Disclaimer '${newDisclaimer.disclaimerNumber}' for customer '${newDisclaimer.customerName}'.`,
      performedBy,
      metadata: { disclaimerNumber: newDisclaimer.disclaimerNumber, customerId: newDisclaimer.customerId },
    });

    return JSON.parse(JSON.stringify(newDisclaimer));
  }

  async updateChecklist(
    disclaimerId: string,
    checklist: WalkthroughChecklistItem[],
    performedBy: string = "Crew Leader"
  ): Promise<WalkthroughDisclaimer> {
    const idx = this.disclaimers.findIndex((d) => d.id === disclaimerId);
    if (idx === -1) {
      throw new Error(`Walk Through Disclaimer '${disclaimerId}' not found.`);
    }

    const current = this.disclaimers[idx];
    const hasMishandled = checklist.some((c) => (c.sl === 5 || c.sl === 6) && c.yes);

    let status: WalkthroughDisclaimerStatus = current.status;
    if (hasMishandled || current.damageRecords.length > 0 || current.missingItemRecords.length > 0) {
      status = "FLAGGED_WITH_ISSUES";
    }

    const updated: WalkthroughDisclaimer = {
      ...current,
      checklist: JSON.parse(JSON.stringify(checklist)),
      status,
      updatedAt: new Date().toISOString(),
    };

    this.disclaimers[idx] = updated;

    await auditService.recordEvent({
      entityType: "WALKTHROUGH_DISCLAIMER",
      entityId: updated.id,
      action: "WALKTHROUGH_DISCLAIMER_UPDATED",
      description: `Updated Walk Through Checklist for '${updated.disclaimerNumber}'.`,
      performedBy,
      metadata: { disclaimerNumber: updated.disclaimerNumber, status },
    });

    return JSON.parse(JSON.stringify(updated));
  }

  async recordDamage(
    input: RecordDamageInput,
    performedBy: string = "Crew Leader"
  ): Promise<{ disclaimer: WalkthroughDisclaimer; damage: DamageItemRecord }> {
    const idx = this.disclaimers.findIndex((d) => d.id === input.disclaimerId);
    if (idx === -1) {
      throw new Error(`Walk Through Disclaimer '${input.disclaimerId}' not found.`);
    }

    const current = this.disclaimers[idx];
    const nowIso = new Date().toISOString();

    const damage: DamageItemRecord = {
      id: `dmg-${Date.now()}`,
      itemName: input.itemName,
      packingListItemId: input.packingListItemId,
      description: input.description,
      location: input.location,
      photos: input.photos || [],
      severity: input.severity,
      status: "REPORTED",
      reportedBy: input.reportedBy || performedBy,
      reportedAt: nowIso,
    };

    // Update checklist item 5 or 6 to YES if damage is reported
    const updatedChecklist = current.checklist.map((c) => {
      if (c.sl === 5 || c.sl === 6) {
        return { ...c, yes: true, no: false, comments: `Damage recorded: ${damage.itemName} (${damage.description})` };
      }
      return c;
    });

    const updatedDamageRecords = [damage, ...current.damageRecords];

    const updatedDisclaimer: WalkthroughDisclaimer = {
      ...current,
      checklist: updatedChecklist,
      damageRecords: updatedDamageRecords,
      status: "FLAGGED_WITH_ISSUES",
      adminReviewNotes: `Damage reported on item '${damage.itemName}'. Evidence preserved. Admin review required.`,
      updatedAt: nowIso,
    };

    this.disclaimers[idx] = updatedDisclaimer;

    await auditService.recordEvent({
      entityType: "WALKTHROUGH_DISCLAIMER",
      entityId: updatedDisclaimer.id,
      action: "DAMAGE_RECORDED",
      description: `Recorded damage on '${damage.itemName}' (${damage.severity} severity) for '${updatedDisclaimer.disclaimerNumber}'.`,
      performedBy,
      metadata: { damageId: damage.id, itemName: damage.itemName, severity: damage.severity },
    });

    return {
      disclaimer: JSON.parse(JSON.stringify(updatedDisclaimer)),
      damage: JSON.parse(JSON.stringify(damage)),
    };
  }

  async recordMissingItem(
    input: RecordMissingItemInput,
    performedBy: string = "Crew Leader"
  ): Promise<{ disclaimer: WalkthroughDisclaimer; missing: MissingItemRecord }> {
    const idx = this.disclaimers.findIndex((d) => d.id === input.disclaimerId);
    if (idx === -1) {
      throw new Error(`Walk Through Disclaimer '${input.disclaimerId}' not found.`);
    }

    const current = this.disclaimers[idx];
    const discrepancyCount = Math.max(0, input.expectedQty - input.returnedQty);
    const nowIso = new Date().toISOString();

    const missingRecord: MissingItemRecord = {
      id: `msg-${Date.now()}`,
      packingListItemId: input.packingListItemId,
      itemName: input.itemName,
      expectedQty: input.expectedQty,
      returnedQty: input.returnedQty,
      discrepancyCount,
      notes: input.notes,
      reportedAt: nowIso,
    };

    const updatedMissingRecords = [missingRecord, ...current.missingItemRecords];

    const updatedDisclaimer: WalkthroughDisclaimer = {
      ...current,
      missingItemRecords: updatedMissingRecords,
      status: discrepancyCount > 0 ? "FLAGGED_WITH_ISSUES" : current.status,
      adminReviewNotes: discrepancyCount > 0 
        ? `Missing item discrepancy: ${discrepancyCount} unit(s) of '${missingRecord.itemName}' missing. Admin review required.`
        : current.adminReviewNotes,
      updatedAt: nowIso,
    };

    this.disclaimers[idx] = updatedDisclaimer;

    await auditService.recordEvent({
      entityType: "WALKTHROUGH_DISCLAIMER",
      entityId: updatedDisclaimer.id,
      action: "MISSING_ITEM_FLAGGED",
      description: `Flagged missing item discrepancy for '${missingRecord.itemName}'. Expected: ${input.expectedQty}, Returned: ${input.returnedQty}, Missing: ${discrepancyCount}.`,
      performedBy,
      metadata: { itemName: missingRecord.itemName, discrepancyCount },
    });

    return {
      disclaimer: JSON.parse(JSON.stringify(updatedDisclaimer)),
      missing: JSON.parse(JSON.stringify(missingRecord)),
    };
  }

  async signDisclaimer(
    input: SignWalkthroughInput,
    performedBy: string = "User"
  ): Promise<WalkthroughDisclaimer> {
    const idx = this.disclaimers.findIndex((d) => d.id === input.disclaimerId);
    if (idx === -1) {
      throw new Error(`Walk Through Disclaimer '${input.disclaimerId}' not found.`);
    }

    const current = this.disclaimers[idx];
    const nowIso = new Date().toISOString();

    const updated: WalkthroughDisclaimer = { ...current };

    if (input.signedByRole === "CUSTOMER" || input.signedByRole === "BOTH") {
      if (input.customerSignature) updated.customerSignature = input.customerSignature;
      if (input.customerNameDetails) updated.customerNameDetails = input.customerNameDetails;
      updated.customerSignedAt = nowIso;
    }

    if (input.signedByRole === "CREW_LEADER" || input.signedByRole === "BOTH") {
      if (input.crewLeaderSignature) updated.crewLeaderSignature = input.crewLeaderSignature;
      if (input.crewLeaderNameDetails) updated.crewLeaderNameDetails = input.crewLeaderNameDetails;
      updated.crewLeaderSignedAt = nowIso;
    }

    updated.updatedAt = nowIso;
    this.disclaimers[idx] = updated;

    return JSON.parse(JSON.stringify(updated));
  }

  async completeDisclaimer(
    disclaimerId: string,
    _userRole: UserRole = "SUPER_ADMIN",
    performedBy: string = "User"
  ): Promise<WalkthroughDisclaimer> {
    const idx = this.disclaimers.findIndex((d) => d.id === disclaimerId);
    if (idx === -1) {
      throw new Error(`Walk Through Disclaimer '${disclaimerId}' not found.`);
    }

    const current = this.disclaimers[idx];

    // Section 6 & 7: Mandatory customer & crew leader signatures check
    if (!current.customerSignature || !current.crewLeaderSignature) {
      throw new Error("Cannot complete Walk Through Disclaimer: Both Customer Signature and Crew Leader Signature are required.");
    }

    const hasDamageOrMissing = current.damageRecords.length > 0 || current.missingItemRecords.length > 0;
    const finalStatus: WalkthroughDisclaimerStatus = hasDamageOrMissing ? "FLAGGED_WITH_ISSUES" : "COMPLETED";

    const updated: WalkthroughDisclaimer = {
      ...current,
      status: finalStatus,
      updatedAt: new Date().toISOString(),
    };

    this.disclaimers[idx] = updated;

    await auditService.recordEvent({
      entityType: "WALKTHROUGH_DISCLAIMER",
      entityId: updated.id,
      action: "WALKTHROUGH_COMPLETED",
      description: `Completed Walk Through & Damage Disclaimer '${updated.disclaimerNumber}'. Final Status: ${finalStatus}.`,
      performedBy,
      metadata: { disclaimerNumber: updated.disclaimerNumber, finalStatus, hasDamageOrMissing },
    });

    return JSON.parse(JSON.stringify(updated));
  }
}
