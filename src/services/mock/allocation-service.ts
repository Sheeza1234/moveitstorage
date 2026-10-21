import { IAllocationService } from "../interfaces/IAllocationService";
import { 
  StorageAllocation, 
  StorageRequirementInput, 
  AllocationCandidateLocation, 
  AllocationSummary 
} from "@/types";
import { MOCK_ALLOCATIONS, MOCK_CUSTOMERS, MOCK_WAREHOUSES, MOCK_INVENTORY_RECORDS, MOCK_INVOICES, MOCK_CONTRACTS } from "./mock-db";
import { MockAIStorageRecommendationService } from "./ai-recommendation-service";
import { auditService } from "./audit-service";
import { calculateLocationCapacity } from "@/lib/utils/capacity";
import { findLocationInWarehouses } from "@/lib/utils/location-resolver";
import { PermissionGuard } from "../permission-guard";
import { UserRole } from "@/types/role";

export class MockAllocationService implements IAllocationService {
  private aiService = new MockAIStorageRecommendationService();

  async getAllocations(): Promise<StorageAllocation[]> {
    return MOCK_ALLOCATIONS.map((a) => ({ ...a }));
  }

  async getAllocationById(id: string): Promise<StorageAllocation | null> {
    const alloc = MOCK_ALLOCATIONS.find((a) => a.id === id);
    return alloc ? { ...alloc } : null;
  }

  private generateAllocationCode(): string {
    const highestNumber = MOCK_ALLOCATIONS.reduce((max, a) => {
      const match = a.allocationCode.match(/SAL-\d+-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 90);

    const nextNumber = highestNumber + 1;
    return `SAL-2026-${String(nextNumber).padStart(4, "0")}`;
  }

  async createAllocationRequirement(input: StorageRequirementInput): Promise<StorageAllocation> {
    // 1. Capacity Unit Validation
    if (!input.capacityUnit || input.capacityUnit !== "SQ_FT") {
      throw new Error(`Unsupported or missing capacity unit '${input.capacityUnit}'. MoveIt Storage operates strictly in 'SQ_FT'.`);
    }

    if (!input.requiredCapacity || input.requiredCapacity <= 0) {
      throw new Error("Requested capacity must be greater than zero.");
    }

    const customer = MOCK_CUSTOMERS.find((c) => c.id === input.customerId);
    if (!customer) {
      throw new Error("Specified customer does not exist.");
    }

    const aiResult = await this.aiService.recommendStorageLocations(input);
    const topCandidate = aiResult.topRecommendation;

    const code = this.generateAllocationCode();

    const newAllocation: StorageAllocation = {
      id: `alloc-${Date.now()}`,
      allocationCode: code,
      customerId: customer.id,
      customerName: customer.name,
      warehouseId: topCandidate ? topCandidate.warehouseId : (input.preferredWarehouseId || "wh-001"),
      warehouseName: topCandidate ? topCandidate.warehouseName : "MoveIt Logistics Hub",
      locationId: topCandidate ? topCandidate.locationId : "",
      locationPath: topCandidate ? topCandidate.locationPath : "Pending Location Selection",
      storageType: input.storageType,
      requiredCapacity: input.requiredCapacity,
      allocatedCapacity: input.requiredCapacity,
      capacityUnit: input.capacityUnit,
      status: topCandidate ? "RECOMMENDED" : "PENDING_REVIEW",
      startDate: input.startDate,
      expectedEndDate: input.expectedEndDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      aiRecommended: Boolean(topCandidate),
      recommendationReason: topCandidate?.recommendationReason,
      recommendationScore: topCandidate?.compatibilityScore,
      notes: input.notes,
    };

    MOCK_ALLOCATIONS.unshift(newAllocation);
    await auditService.recordEvent({
      entityType: "ALLOCATION",
      entityId: newAllocation.id,
      action: "ALLOCATION_CREATED",
      description: `Storage allocation requirement ${newAllocation.allocationCode} created for ${newAllocation.customerName} (${newAllocation.requiredCapacity} ${newAllocation.capacityUnit}).`,
      performedBy: "Admin User",
      metadata: {
        aiRecommended: newAllocation.aiRecommended,
        recommendationReason: newAllocation.recommendationReason,
        recommendationScore: newAllocation.recommendationScore,
        locationPath: newAllocation.locationPath,
        requiredSqFt: newAllocation.requiredCapacity,
      },
    });
    return { ...newAllocation };
  }

  async findAvailableLocations(requirement: StorageRequirementInput): Promise<AllocationCandidateLocation[]> {
    const aiResult = await this.aiService.recommendStorageLocations(requirement);
    return aiResult.candidateLocations;
  }

  async confirmAllocation(allocationId: string, locationId: string): Promise<StorageAllocation> {
    const index = MOCK_ALLOCATIONS.findIndex((a) => a.id === allocationId);
    if (index === -1) {
      throw new Error("Allocation record not found.");
    }

    const current = MOCK_ALLOCATIONS[index];

    // Rule 1: Prevent Repeated Allocation Confirmation
    if (current.status === "CONFIRMED" || current.status === "ACTIVE") {
      throw new Error(
        `Allocation '${current.allocationCode}' is already ${current.status}. Repeated confirmation is prohibited to prevent double capacity reservation.`
      );
    }
    if (current.status === "RELEASED" || current.status === "CANCELLED") {
      throw new Error(`Cannot confirm an allocation in '${current.status}' status.`);
    }

    // Rule 7: Capacity Unit Validation
    if (current.capacityUnit !== "SQ_FT") {
      throw new Error(
        `Unsupported capacity unit '${current.capacityUnit}' on allocation requirement. Storage system enforces 'SQ_FT'.`
      );
    }

    // Rule 2 & 8: Centralized Universal Location Resolution across all hierarchy levels
    const resLoc = findLocationInWarehouses(MOCK_WAREHOUSES, locationId);
    if (!resLoc) {
      throw new Error("Selected location does not exist or is invalid.");
    }

    const matchedSlot = resLoc.slot;
    if (matchedSlot.status === "BLOCKED") {
      throw new Error("Selected location is BLOCKED and unavailable for allocation.");
    }

    const { availableSqFt } = calculateLocationCapacity(
      matchedSlot.totalCapacitySqFt,
      matchedSlot.occupiedCapacitySqFt,
      matchedSlot.reservedCapacitySqFt,
      matchedSlot.status
    );

    if (availableSqFt < current.requiredCapacity) {
      throw new Error(
        `Capacity Changed: The selected location no longer has sufficient available capacity. Required: ${current.requiredCapacity} ${current.capacityUnit}, Available: ${availableSqFt} ${current.capacityUnit}, Shortfall: ${current.requiredCapacity - availableSqFt} ${current.capacityUnit}.`
      );
    }

    // Reserve physical capacity on target slot
    matchedSlot.reservedCapacitySqFt += current.requiredCapacity;
    const { status: updatedSlotStatus } = calculateLocationCapacity(
      matchedSlot.totalCapacitySqFt,
      matchedSlot.occupiedCapacitySqFt,
      matchedSlot.reservedCapacitySqFt,
      matchedSlot.status
    );
    matchedSlot.status = updatedSlotStatus;

    const updated: StorageAllocation = {
      ...current,
      locationId,
      locationPath: resLoc.locationPath,
      warehouseId: resLoc.warehouse.id,
      warehouseName: resLoc.warehouse.name,
      status: "CONFIRMED",
      confirmedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    MOCK_ALLOCATIONS[index] = updated;
    await auditService.recordEvent({
      entityType: "ALLOCATION",
      entityId: updated.id,
      action: "ALLOCATION_CONFIRMED",
      description: `Allocation ${updated.allocationCode} confirmed for location '${updated.locationPath}' under admin oversight.`,
      performedBy: "Admin User",
      metadata: {
        aiRecommended: updated.aiRecommended,
        recommendationScore: updated.recommendationScore,
        recommendationReason: updated.recommendationReason,
        acceptedLocationId: locationId,
        acceptedLocationPath: resLoc.locationPath,
        allocatedCapacitySqFt: updated.allocatedCapacity,
        adminApproved: true,
      },
    });
    return { ...updated };
  }

  async releaseAllocation(allocationId: string, userRole: UserRole = "SUPER_ADMIN"): Promise<StorageAllocation> {
    await PermissionGuard.enforce(userRole, "ALLOCATIONS", "RELEASE", { entityId: allocationId });

    const index = MOCK_ALLOCATIONS.findIndex((a) => a.id === allocationId);
    if (index === -1) {
      throw new Error("Allocation record not found.");
    }

    const current = MOCK_ALLOCATIONS[index];

    // Idempotent safe return if already released
    if (current.status === "RELEASED") {
      return { ...current };
    }

    // Rule 1: Inventory Check - Ensure no active stored inventory remains
    const storedInventory = MOCK_INVENTORY_RECORDS.filter(
      (record) => record.allocationId === allocationId && record.status !== "RELEASED"
        && (record.itemCount - (record.releasedItemCount || 0)) > 0
    );
    if (storedInventory.length > 0) {
      const remainingItems = storedInventory.reduce((sum, r) => sum + (r.itemCount - (r.releasedItemCount || 0)), 0);
      throw new Error(
        `Cannot close storage allocation '${current.allocationCode}'. ${remainingItems} item(s) across ${storedInventory.length} package(s) remain in storage. All physical inventory must be released via Items Out before storage closure.`
      );
    }

    // Rule 2: Financial Clearance Check - Outstanding billing balance check
    const unpaidInvoices = MOCK_INVOICES.filter(
      (inv) => inv.customerId === current.customerId
        && (inv.contractId || (inv.allocationIds && inv.allocationIds.includes(allocationId)))
        && inv.status !== 'CANCELLED' && inv.status !== 'VOID' && inv.status !== 'DRAFT' && inv.status !== 'PAID'
        && inv.balanceDue > 0
    );

    if (unpaidInvoices.length > 0) {
      const totalOutstanding = unpaidInvoices.reduce((sum, i) => sum + i.balanceDue, 0);
      const invNumbers = unpaidInvoices.map((i) => i.invoiceNumber).join(", ");
      throw new Error(
        `Cannot close storage allocation '${current.allocationCode}'. Outstanding billing balance of AED ${totalOutstanding.toFixed(2)} remains across ${unpaidInvoices.length} invoice(s) (${invNumbers}). Financial clearance required before final storage closure.`
      );
    }

    // Rule 3: Contract Check - Ensure contract is not in CANCELLED state
    const contract = MOCK_CONTRACTS.find((c) => c.allocationIds && c.allocationIds.includes(allocationId));
    if (contract && contract.status === "CANCELLED") {
      throw new Error(`Cannot close allocation under CANCELLED contract '${contract.contractCode}'.`);
    }

    // Rule 4: Capacity Release Calculation across all warehouse hierarchies
    if (current.locationId) {
      const resLoc = findLocationInWarehouses(MOCK_WAREHOUSES, current.locationId);
      if (resLoc) {
        const slot = resLoc.slot;
        const receivedFootprint = MOCK_INVENTORY_RECORDS
          .filter((record) => record.allocationId === allocationId)
          .reduce((sum, record) => sum + record.capacityFootprintSqFt, 0);
        const unOccupiedReserved = Math.max(0, current.allocatedCapacity - receivedFootprint);
        slot.reservedCapacitySqFt = Math.max(0, slot.reservedCapacitySqFt - unOccupiedReserved);

        const { status: st } = calculateLocationCapacity(
          slot.totalCapacitySqFt,
          slot.occupiedCapacitySqFt,
          slot.reservedCapacitySqFt,
          slot.status
        );
        slot.status = st;
      }
    }

    const updated: StorageAllocation = {
      ...current,
      status: "RELEASED",
      releasedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    MOCK_ALLOCATIONS[index] = updated;

    await auditService.recordEvent({
      entityType: "ALLOCATION",
      entityId: updated.id,
      action: "ALLOCATION_RELEASED",
      description: `Storage allocation ${updated.allocationCode} released. Capacity freed. Storage closed.`,
      performedBy: "Admin User",
      metadata: {
        previousValue: current.status,
        newValue: "RELEASED",
        locationId: current.locationId,
        allocatedCapacity: current.allocatedCapacity,
      },
    });

    return { ...updated };
  }

  async cancelAllocation(allocationId: string): Promise<StorageAllocation> {
    const index = MOCK_ALLOCATIONS.findIndex((a) => a.id === allocationId);
    if (index === -1) {
      throw new Error("Allocation record not found.");
    }

    const current = MOCK_ALLOCATIONS[index];
    if (current.status === "CANCELLED" || current.status === "RELEASED") {
      throw new Error(`Cannot cancel an allocation in '${current.status}' status.`);
    }

    const storedInventory = MOCK_INVENTORY_RECORDS.filter(
      (record) => record.allocationId === allocationId && record.status !== "RELEASED"
        && (record.itemCount - (record.releasedItemCount || 0)) > 0
    );
    if (storedInventory.length > 0) {
      throw new Error("Cannot cancel an allocation while inventory remains in storage.");
    }

    if ((current.status === "CONFIRMED" || current.status === "ACTIVE") && current.locationId) {
      const resLoc = findLocationInWarehouses(MOCK_WAREHOUSES, current.locationId);
      if (resLoc) {
        const receivedFootprint = MOCK_INVENTORY_RECORDS
          .filter((record) => record.allocationId === allocationId)
          .reduce((sum, record) => sum + record.capacityFootprintSqFt, 0);
        const unOccupiedReserved = Math.max(0, current.allocatedCapacity - receivedFootprint);
        resLoc.slot.reservedCapacitySqFt = Math.max(0, resLoc.slot.reservedCapacitySqFt - unOccupiedReserved);
        const { status } = calculateLocationCapacity(
          resLoc.slot.totalCapacitySqFt,
          resLoc.slot.occupiedCapacitySqFt,
          resLoc.slot.reservedCapacitySqFt,
          resLoc.slot.status
        );
        resLoc.slot.status = status;
      }
    }

    const updated: StorageAllocation = {
      ...current,
      status: "CANCELLED",
      updatedAt: new Date().toISOString(),
    };

    MOCK_ALLOCATIONS[index] = updated;
    await auditService.recordEvent({
      entityType: "ALLOCATION",
      entityId: updated.id,
      action: "ALLOCATION_CANCELLED",
      description: `Storage allocation ${updated.allocationCode} cancelled.`,
      performedBy: "Admin User",
      metadata: {
        previousValue: current.status,
        newValue: "CANCELLED",
      },
    });
    return { ...updated };
  }

  async getAllocationSummary(): Promise<AllocationSummary> {
    const totalAllocations = MOCK_ALLOCATIONS.length;
    const activeAllocations = MOCK_ALLOCATIONS.filter((a) => a.status === "ACTIVE" || a.status === "CONFIRMED").length;
    const confirmedAllocations = MOCK_ALLOCATIONS.filter((a) => a.status === "CONFIRMED").length;
    const pendingAllocations = MOCK_ALLOCATIONS.filter((a) => a.status === "PENDING_REVIEW" || a.status === "RECOMMENDED" || a.status === "DRAFT").length;
    const releasedAllocations = MOCK_ALLOCATIONS.filter((a) => a.status === "RELEASED").length;

    const totalReservedCapacitySqFt = MOCK_ALLOCATIONS
      .filter((a) => a.status === "CONFIRMED" || a.status === "RECOMMENDED")
      .reduce((sum, a) => sum + a.allocatedCapacity, 0);

    const totalOccupiedCapacitySqFt = MOCK_ALLOCATIONS
      .filter((a) => a.status === "ACTIVE")
      .reduce((sum, a) => sum + a.allocatedCapacity, 0);

    return {
      totalAllocations,
      activeAllocations,
      confirmedAllocations,
      pendingAllocations,
      releasedAllocations,
      totalReservedCapacitySqFt,
      totalOccupiedCapacitySqFt,
    };
  }
}
