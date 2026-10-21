import { IAIStorageRecommendationService } from "../interfaces/IAIStorageRecommendationService";
import { StorageRequirementInput, AIRecommendationResult, AllocationCandidateLocation, WarehouseSlot } from "@/types";
import { MOCK_WAREHOUSES } from "./mock-db";
import { calculateLocationCapacity } from "@/lib/utils/capacity";

export class MockAIStorageRecommendationService implements IAIStorageRecommendationService {
  async recommendStorageLocations(requirement: StorageRequirementInput): Promise<AIRecommendationResult> {
    const candidateLocations: AllocationCandidateLocation[] = [];

    // Helper to evaluate and add a candidate slot
    const evaluateSlot = (slot: WarehouseSlot, parentPath: string, warehouseName: string, warehouseId: string) => {
      const { availableSqFt, utilizationPercentage } = calculateLocationCapacity(
        slot.totalCapacitySqFt,
        slot.occupiedCapacitySqFt,
        slot.reservedCapacitySqFt,
        slot.status
      );

      // Over-allocation protection: Skip if available capacity is less than requested
      if (availableSqFt < requirement.requiredCapacity) {
        return;
      }

      // Skip blocked locations
      if (slot.status === "BLOCKED" || slot.status === "OCCUPIED") {
        return;
      }

      // Calculate transparent compatibility score (0 - 100)
      let score = 50; // Base score for eligible location
      const reasons: string[] = [];

      // 1. Storage Type Match
      if (slot.storageType === requirement.storageType) {
        score += 25;
        reasons.push(`Exact storage type match (${slot.storageType})`);
      } else {
        reasons.push(`Compatible storage model (${slot.storageType})`);
      }

      // 2. Preferred Warehouse Match
      if (requirement.preferredWarehouseId && warehouseId === requirement.preferredWarehouseId) {
        score += 15;
        reasons.push("Located in preferred warehouse facility");
      }

      // 3. Optimal Wasted Capacity Fit
      const remainingAfter = availableSqFt - requirement.requiredCapacity;
      if (remainingAfter <= 200) {
        score += 10;
        reasons.push("Optimal capacity fit with minimal unused space");
      } else {
        reasons.push("Sufficient available capacity for expansion");
      }

      const reasoningText = `Recommended because ${slot.name} has ${availableSqFt} ${requirement.capacityUnit} available (${requirement.requiredCapacity} ${requirement.capacityUnit} requested, ${remainingAfter} ${requirement.capacityUnit} remaining). ${reasons.join(". ")}.`;

      candidateLocations.push({
        warehouseId,
        warehouseName,
        locationId: slot.id,
        locationCode: slot.code,
        locationName: slot.name,
        locationPath: `${parentPath} > ${slot.name}`,
        storageType: slot.storageType,
        capacityUnit: requirement.capacityUnit,
        totalCapacity: slot.totalCapacitySqFt,
        occupiedCapacity: slot.occupiedCapacitySqFt,
        reservedCapacity: slot.reservedCapacitySqFt,
        availableCapacity: availableSqFt,
        remainingAfterAllocation: remainingAfter,
        utilizationPercentage,
        status: slot.status,
        compatibilityScore: Math.min(100, score),
        recommendationReason: reasoningText,
      });
    };

    // Traversal across all warehouse structures
    for (const wh of MOCK_WAREHOUSES) {
      if (wh.status !== "ACTIVE") continue;

      // 1. Traverse Floors -> Zones -> Racks -> Slots
      if (wh.floors) {
        for (const fl of wh.floors) {
          for (const zn of fl.zones) {
            if (zn.racks) {
              for (const rk of zn.racks) {
                for (const sl of rk.slots) {
                  evaluateSlot(sl, `${wh.name} > ${fl.name} > ${zn.name} > ${rk.name}`, wh.name, wh.id);
                }
              }
            }
            if (zn.directSlots) {
              for (const sl of zn.directSlots) {
                evaluateSlot(sl, `${wh.name} > ${fl.name} > ${zn.name}`, wh.name, wh.id);
              }
            }
          }
        }
      }

      // 2. Traverse Direct Zones (for warehouses without floors)
      if (wh.directZones) {
        for (const zn of wh.directZones) {
          if (zn.racks) {
            for (const rk of zn.racks) {
              for (const sl of rk.slots) {
                evaluateSlot(sl, `${wh.name} > ${zn.name} > ${rk.name}`, wh.name, wh.id);
              }
            }
          }
          if (zn.directSlots) {
            for (const sl of zn.directSlots) {
              evaluateSlot(sl, `${wh.name} > ${zn.name}`, wh.name, wh.id);
            }
          }
        }
      }
    }

    // Sort candidate locations by highest compatibility score
    candidateLocations.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    return {
      requirement,
      candidateLocations,
      topRecommendation: candidateLocations[0] || undefined,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
