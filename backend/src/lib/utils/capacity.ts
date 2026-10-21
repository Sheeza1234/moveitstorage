import { LocationStatus } from "@/types";

export interface CapacityCalculation {
  totalSqFt: number;
  occupiedSqFt: number;
  reservedSqFt: number;
  availableSqFt: number;
  utilizationPercentage: number;
  status: LocationStatus;
  computedStatus: LocationStatus;
}

export function calculateLocationCapacity(
  totalSqFt: number,
  occupiedSqFt: number,
  reservedSqFt: number,
  currentStatus?: LocationStatus
): CapacityCalculation {
  const safeTotal = Math.max(0, totalSqFt);
  const safeOccupied = Math.max(0, occupiedSqFt);
  const safeReserved = Math.max(0, reservedSqFt);

  // Available space is Total minus Occupied minus Reserved
  const availableSqFt = Math.max(0, safeTotal - safeOccupied - safeReserved);

  // Utilization calculation (Occupied / Total * 100)
  const utilizationPercentage = safeTotal > 0
    ? Number(((safeOccupied / safeTotal) * 100).toFixed(1))
    : 0;

  // Status computation if blocked is not explicitly forced
  let computedStatus: LocationStatus = currentStatus || "AVAILABLE";
  if (currentStatus !== "BLOCKED") {
    if (safeOccupied >= safeTotal && safeTotal > 0) {
      computedStatus = "OCCUPIED";
    } else if (safeOccupied > 0) {
      computedStatus = "PARTIALLY_OCCUPIED";
    } else if (safeReserved > 0) {
      computedStatus = "RESERVED";
    } else {
      computedStatus = "AVAILABLE";
    }
  }

  return {
    totalSqFt: safeTotal,
    occupiedSqFt: safeOccupied,
    reservedSqFt: safeReserved,
    availableSqFt,
    utilizationPercentage,
    status: computedStatus,
    computedStatus,
  };
}
