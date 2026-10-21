import { 
  BoxCollectionTracker, 
  CreateBoxTrackerInput,
  RecordBoxCollectionInput,
  ScheduleCollectionInput,
  BoxCollectionEvent,
  BoxCollectionStatus
} from "@/types/box-collection";
import { UserRole } from "@/types/role";
import { IBoxCollectionService } from "../interfaces/IBoxCollectionService";
import { auditService } from "./audit-service";
import { MOCK_CUSTOMERS } from "./mock-db";

export const DEFAULT_BOX_TRACKERS: BoxCollectionTracker[] = [
  {
    id: "bct-4001",
    customerId: "cust-01",
    customerName: "Al Habtoor Group",
    allocationId: "alloc-101",
    crewSheetId: "cs-4001",
    boxesRequired: 100,
    boxesCollected: 70,
    boxesRemaining: 30,
    collectionDate: "2026-10-01",
    nextCollectionDate: "2026-10-15",
    status: "PARTIALLY_COLLECTED",
    hasPendingAlert: true,
    alertMessage: "30 customer boxes are still pending collection.",
    createdAt: "2026-10-01T08:00:00Z",
    updatedAt: "2026-10-05T10:00:00Z",
  },
  {
    id: "bct-4002",
    customerId: "cust-02",
    customerName: "Emaar Commercial",
    allocationId: "alloc-102",
    crewSheetId: "cs-4002",
    boxesRequired: 50,
    boxesCollected: 50,
    boxesRemaining: 0,
    collectionDate: "2026-10-04",
    status: "FULLY_COLLECTED",
    hasPendingAlert: false,
    createdAt: "2026-10-02T08:00:00Z",
    updatedAt: "2026-10-04T12:00:00Z",
  },
];

export const DEFAULT_COLLECTION_EVENTS: BoxCollectionEvent[] = [
  {
    id: "bce-101",
    trackerId: "bct-4001",
    quantityCollected: 40,
    collectionDate: "2026-10-01",
    responsibleEmployee: "Ahmed Al-Mansoori (TL)",
    notes: "Initial collection after unpacking.",
    customerAcknowledgement: true,
    isAdminException: false,
    createdAt: "2026-10-01T14:00:00Z",
  },
  {
    id: "bce-102",
    trackerId: "bct-4001",
    quantityCollected: 30,
    collectionDate: "2026-10-05",
    responsibleEmployee: "Tariq Mahmoud (TL)",
    notes: "Second batch collection.",
    customerAcknowledgement: true,
    isAdminException: false,
    createdAt: "2026-10-05T10:00:00Z",
  },
  {
    id: "bce-201",
    trackerId: "bct-4002",
    quantityCollected: 50,
    collectionDate: "2026-10-04",
    responsibleEmployee: "Rajesh Kumar (TL)",
    notes: "All 50 empty boxes collected upon arrival.",
    customerAcknowledgement: true,
    isAdminException: false,
    createdAt: "2026-10-04T12:00:00Z",
  },
];

export class MockBoxCollectionService implements IBoxCollectionService {
  private trackers: BoxCollectionTracker[] = [...DEFAULT_BOX_TRACKERS];
  private events: BoxCollectionEvent[] = [...DEFAULT_COLLECTION_EVENTS];

  async getTrackers(): Promise<BoxCollectionTracker[]> {
    return JSON.parse(JSON.stringify(this.trackers));
  }

  async getTrackerById(id: string): Promise<BoxCollectionTracker | null> {
    const found = this.trackers.find((t) => t.id === id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async getTrackerByCustomer(customerId: string): Promise<BoxCollectionTracker | null> {
    const found = this.trackers.find((t) => t.customerId === customerId);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async getTrackerByAllocation(allocationId: string): Promise<BoxCollectionTracker | null> {
    const found = this.trackers.find((t) => t.allocationId === allocationId);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async createTracker(input: CreateBoxTrackerInput, performedBy: string = "Admin User"): Promise<BoxCollectionTracker> {
    let custName = input.customerName || "";
    if (!custName && input.customerId) {
      const cust = MOCK_CUSTOMERS.find((c) => c.id === input.customerId);
      if (cust) custName = cust.companyName || cust.name;
    }

    const initialCollected = input.initialCollected || 0;
    const remaining = Math.max(0, input.boxesRequired - initialCollected);
    const nowIso = new Date().toISOString();

    let status: BoxCollectionStatus = "NOT_STARTED";
    if (remaining === 0) {
      status = "FULLY_COLLECTED";
    } else if (input.nextCollectionDate) {
      status = "COLLECTION_SCHEDULED";
    } else if (initialCollected > 0) {
      status = "PARTIALLY_COLLECTED";
    }

    const hasPendingAlert = remaining > 0;
    const alertMessage = hasPendingAlert ? `${remaining} customer boxes are still pending collection.` : undefined;

    const newTracker: BoxCollectionTracker = {
      id: `bct-${Date.now()}`,
      customerId: input.customerId,
      customerName: custName || "Client Unspecified",
      allocationId: input.allocationId,
      crewSheetId: input.crewSheetId,
      boxesRequired: input.boxesRequired,
      boxesCollected: initialCollected,
      boxesRemaining: remaining,
      collectionDate: input.collectionDate,
      nextCollectionDate: input.nextCollectionDate,
      status,
      hasPendingAlert,
      alertMessage,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.trackers.unshift(newTracker);

    await auditService.recordEvent({
      entityType: "BOX_COLLECTION",
      entityId: newTracker.id,
      action: "BOX_COLLECTION_TRACKER_CREATED",
      description: `Created Box Collection Tracker for '${newTracker.customerName}'. Required: ${newTracker.boxesRequired} boxes.`,
      performedBy,
      metadata: { boxesRequired: newTracker.boxesRequired, customerId: newTracker.customerId },
    });

    return JSON.parse(JSON.stringify(newTracker));
  }

  async recordCollection(
    input: RecordBoxCollectionInput,
    _userRole: UserRole = "SUPER_ADMIN",
    performedBy: string = "User"
  ): Promise<{ tracker: BoxCollectionTracker; event: BoxCollectionEvent }> {
    if (input.quantityCollected <= 0) {
      throw new Error("Quantity collected must be greater than zero.");
    }

    const idx = this.trackers.findIndex((t) => t.id === input.trackerId);
    if (idx === -1) {
      throw new Error(`Box Collection Tracker '${input.trackerId}' not found.`);
    }

    const current = this.trackers[idx];
    const newTotalCollected = current.boxesCollected + input.quantityCollected;

    // Rule: Collected cannot exceed Required unless Admin exception is explicitly approved
    if (newTotalCollected > current.boxesRequired && !input.allowAdminException) {
      throw new Error(
        `Validation Error: Cannot collect ${newTotalCollected} boxes because required amount is ${current.boxesRequired}. Admin exception approval required for extra boxes.`
      );
    }

    const isAdminException = newTotalCollected > current.boxesRequired && !!input.allowAdminException;
    const remaining = Math.max(0, current.boxesRequired - newTotalCollected);
    const nowIso = new Date().toISOString();

    let status: BoxCollectionStatus = "PARTIALLY_COLLECTED";
    if (remaining === 0) {
      status = "FULLY_COLLECTED";
    } else if (current.nextCollectionDate) {
      status = "COLLECTION_SCHEDULED";
    }

    const hasPendingAlert = remaining > 0;
    const alertMessage = hasPendingAlert ? `${remaining} customer boxes are still pending collection.` : undefined;

    const updatedTracker: BoxCollectionTracker = {
      ...current,
      boxesCollected: newTotalCollected,
      boxesRemaining: remaining,
      collectionDate: input.collectionDate || new Date().toISOString().substring(0, 10),
      status,
      hasPendingAlert,
      alertMessage,
      updatedAt: nowIso,
    };

    this.trackers[idx] = updatedTracker;

    const event: BoxCollectionEvent = {
      id: `bce-${Date.now()}`,
      trackerId: current.id,
      quantityCollected: input.quantityCollected,
      collectionDate: input.collectionDate || new Date().toISOString().substring(0, 10),
      responsibleEmployee: input.responsibleEmployee,
      notes: input.notes,
      customerAcknowledgement: input.customerAcknowledgement !== undefined ? input.customerAcknowledgement : true,
      isAdminException,
      createdAt: nowIso,
    };

    this.events.unshift(event);

    await auditService.recordEvent({
      entityType: "BOX_COLLECTION",
      entityId: updatedTracker.id,
      action: isAdminException ? "BOX_COLLECTION_EXCEPTION_APPROVED" : "BOX_COLLECTION_RECORDED",
      description: `Recorded collection of ${input.quantityCollected} boxes for '${updatedTracker.customerName}'. Total Collected: ${newTotalCollected}/${updatedTracker.boxesRequired}. Remaining: ${remaining}.`,
      performedBy,
      metadata: { quantityCollected: input.quantityCollected, newTotalCollected, remaining, isAdminException },
    });

    return {
      tracker: JSON.parse(JSON.stringify(updatedTracker)),
      event: JSON.parse(JSON.stringify(event)),
    };
  }

  async scheduleNextCollection(
    input: ScheduleCollectionInput,
    performedBy: string = "Admin User"
  ): Promise<BoxCollectionTracker> {
    const idx = this.trackers.findIndex((t) => t.id === input.trackerId);
    if (idx === -1) {
      throw new Error(`Box Collection Tracker '${input.trackerId}' not found.`);
    }

    const current = this.trackers[idx];
    const updatedTracker: BoxCollectionTracker = {
      ...current,
      nextCollectionDate: input.nextCollectionDate,
      status: current.boxesRemaining === 0 ? "FULLY_COLLECTED" : "COLLECTION_SCHEDULED",
      updatedAt: new Date().toISOString(),
    };

    this.trackers[idx] = updatedTracker;

    await auditService.recordEvent({
      entityType: "BOX_COLLECTION",
      entityId: updatedTracker.id,
      action: "BOX_COLLECTION_SCHEDULED",
      description: `Scheduled next collection for '${updatedTracker.customerName}' on ${input.nextCollectionDate}.`,
      performedBy,
      metadata: { nextCollectionDate: input.nextCollectionDate, notes: input.notes },
    });

    return JSON.parse(JSON.stringify(updatedTracker));
  }

  async getCollectionHistory(trackerId: string): Promise<BoxCollectionEvent[]> {
    return JSON.parse(
      JSON.stringify(this.events.filter((e) => e.trackerId === trackerId))
    );
  }

  async getPendingAlerts(): Promise<BoxCollectionTracker[]> {
    return JSON.parse(
      JSON.stringify(this.trackers.filter((t) => t.hasPendingAlert && t.boxesRemaining > 0))
    );
  }
}
