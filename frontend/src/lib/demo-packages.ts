import type { PackageRecord } from "@/types";

/** Sample package records shown in the 3D explorer position panel (static demo data; the backend has no package listing endpoint yet). */
export const MOCK_PACKAGES: PackageRecord[] = [
  {
    id: "pkg-01",
    packageId: "PKG-DXB-2026-8801",
    customerId: "cust-01",
    customerName: "Al Habtoor Commercial Group",
    allocationId: "alloc-101",
    description: "Executive Suite Italian Leather Armchairs (Set of 4)",
    quantity: 4,
    packageType: "CRATE",
    status: "IN_STORAGE",
    currentLocationPath: "Dubai Hub > Floor 1 > Zone A > Rack 101",
    slotId: "slot-101-a",
    createdAt: "2026-01-16T10:00:00Z",
  },
  {
    id: "pkg-02",
    packageId: "PKG-DXB-2026-8802",
    customerId: "cust-03",
    customerName: "Horizon Interior Architecture",
    allocationId: "alloc-102",
    description: "Polished Carrara Marble Tiles Pallet #04",
    quantity: 12,
    packageType: "PALLET",
    status: "IN_STORAGE",
    currentLocationPath: "Dubai Hub > Floor 1 > Zone B > Open Bay B1",
    slotId: "slot-open-1",
    createdAt: "2026-03-02T11:20:00Z",
  },
];
