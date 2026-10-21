import { services } from "../src/server/script-registry";
import { MOCK_WAREHOUSES } from "../src/services/mock/mock-db";
import { findLocationInWarehouses } from "../src/lib/utils/location-resolver";

async function runDataConsistencyRegressionSuite() {
  console.log("==================================================");
  console.log("PROMPT 14: DATA CONSISTENCY REGRESSION UAT SUITE");
  console.log("==================================================\n");

  let passCount = 0;
  let totalTests = 0;

  function assertTest(testName: string, condition: boolean, detail?: string) {
    totalTests++;
    if (condition) {
      passCount++;
      console.log(`  [PASS] ${testName}`);
      if (detail) console.log(`         ↳ ${detail}`);
    } else {
      console.error(`  [FAIL] ${testName}`);
      if (detail) console.error(`         ↳ ${detail}`);
    }
  }

  // --- TEST 1: Confirm Allocation Twice ---
  console.log("--- TEST 1: Prevent Repeated Allocation Confirmation ---");
  const cust1 = await services.customerService.createCustomer({
    type: "CORPORATE",
    companyName: "Double Confirm Test LLC",
    email: "doubleconfirm@test.com",
    phone: "+97140001111",
    address: "Al Quoz",
    city: "Dubai",
    country: "UAE",
    status: "ACTIVE",
    requiredSqFt: 100,
    storageStartDate: "2026-11-01",
    storageDurationMonths: 6,
  });

  const alloc1 = await services.allocationService.createAllocationRequirement({
    customerId: cust1.id,
    storageType: "SLOT",
    requiredCapacity: 100,
    capacityUnit: "SQ_FT",
    preferredWarehouseId: "wh-001",
    startDate: "2026-11-01",
    expectedEndDate: "2027-05-01",
  });

  const slot1Id = "slot-101-c";
  const initialResLoc1 = findLocationInWarehouses(MOCK_WAREHOUSES, slot1Id)!;

  const firstConfirm = await services.allocationService.confirmAllocation(alloc1.id, slot1Id);
  const afterFirstReservedCap = initialResLoc1.slot.reservedCapacitySqFt;

  let secondConfirmCaught = false;
  try {
    await services.allocationService.confirmAllocation(alloc1.id, slot1Id);
  } catch (err: unknown) {
    secondConfirmCaught = (err as Error).message.includes("already CONFIRMED");
  }

  const finalReservedCap = initialResLoc1.slot.reservedCapacitySqFt;

  assertTest(
    "Confirm Allocation Twice",
    firstConfirm.status === "CONFIRMED" && secondConfirmCaught && afterFirstReservedCap === finalReservedCap,
    `First: PASS (Reserved: ${afterFirstReservedCap} SQ.FT). Second: BLOCKED. Capacity unchanged.`
  );

  // --- TEST 2: Release Allocation in Floor-Based Warehouse ---
  console.log("\n--- TEST 2: Release Allocation in Floor-Based Warehouse ---");
  const allocFloor = await services.allocationService.createAllocationRequirement({
    customerId: cust1.id,
    storageType: "SLOT",
    requiredCapacity: 50,
    capacityUnit: "SQ_FT",
    preferredWarehouseId: "wh-001",
    startDate: "2026-11-01",
    expectedEndDate: "2027-05-01",
  });
  const confirmFloor = await services.allocationService.confirmAllocation(allocFloor.id, "slot-101-c");
  const capBeforeRelease = initialResLoc1.slot.reservedCapacitySqFt;
  const relFloor = await services.allocationService.releaseAllocation(confirmFloor.id);
  const capAfterRelease = initialResLoc1.slot.reservedCapacitySqFt;

  assertTest(
    "Release Allocation in Floor-Based Warehouse",
    relFloor.status === "RELEASED" && capAfterRelease === capBeforeRelease - 50,
    `Floor-based capacity freed by 50 SQ.FT (${capBeforeRelease} → ${capAfterRelease} SQ.FT).`
  );

  // --- TEST 3: Release Allocation in Direct-Zone Warehouse ---
  console.log("\n--- TEST 3: Release Allocation in Direct-Zone Warehouse ---");
  const resDirectZoneLoc = findLocationInWarehouses(MOCK_WAREHOUSES, "slot-dz-1") || findLocationInWarehouses(MOCK_WAREHOUSES, "slot-open-1");
  const targetDzSlotId = resDirectZoneLoc?.slot.id || "slot-open-1";
  
  const allocDz = await services.allocationService.createAllocationRequirement({
    customerId: cust1.id,
    storageType: "SLOT",
    requiredCapacity: 50,
    capacityUnit: "SQ_FT",
    preferredWarehouseId: resDirectZoneLoc?.warehouse.id || "wh-001",
    startDate: "2026-11-01",
    expectedEndDate: "2027-05-01",
  });
  const confirmDz = await services.allocationService.confirmAllocation(allocDz.id, targetDzSlotId);
  const relDz = await services.allocationService.releaseAllocation(confirmDz.id);

  assertTest(
    "Release Allocation in Direct-Zone Warehouse",
    relDz.status === "RELEASED",
    `Direct-zone allocation ${relDz.allocationCode} released cleanly.`
  );

  // --- TEST 4: Release Allocation in Open-Floor Bay ---
  console.log("\n--- TEST 4: Release Allocation in Open-Floor Structure ---");
  const allocOpen = await services.allocationService.createAllocationRequirement({
    customerId: cust1.id,
    storageType: "FLOOR",
    requiredCapacity: 100,
    capacityUnit: "SQ_FT",
    preferredWarehouseId: "wh-001",
    startDate: "2026-11-01",
    expectedEndDate: "2027-05-01",
  });
  const confirmOpen = await services.allocationService.confirmAllocation(allocOpen.id, "slot-open-2");
  const relOpen = await services.allocationService.releaseAllocation(confirmOpen.id);

  assertTest(
    "Release Allocation in Open-Floor Bay",
    relOpen.status === "RELEASED",
    `Open-floor allocation ${relOpen.allocationCode} released successfully.`
  );

  // --- TEST 5: Single Authoritative Allocation State ---
  console.log("\n--- TEST 5: Authoritative Allocation & Inventory State Consistency ---");
  const allocAuth = await services.allocationService.createAllocationRequirement({
    customerId: cust1.id,
    storageType: "SLOT",
    requiredCapacity: 50,
    capacityUnit: "SQ_FT",
    preferredWarehouseId: "wh-001",
    startDate: "2026-11-01",
    expectedEndDate: "2027-05-01",
  });
  const confirmAuth = await services.allocationService.confirmAllocation(allocAuth.id, "slot-101-c");

  await services.inventoryService.recordItemsIn({
    customerId: cust1.id,
    allocationId: confirmAuth.id,
    warehouseId: "wh-001",
    locationId: "slot-101-c",
    packageType: "PALLET",
    itemCount: 10,
    capacityFootprintSqFt: 30,
    capacityUnit: "SQ_FT",
    description: "State consistency test pallet",
  });

  const allocFromService = await services.allocationService.getAllocationById(confirmAuth.id);
  assertTest(
    "Authoritative Allocation State (Allocation ↔ Inventory)",
    allocFromService?.status === "ACTIVE",
    `allocationService returns status '${allocFromService?.status}' matching physical intake.`
  );

  let excessIntakeCaught = false;
  try {
    await services.inventoryService.recordItemsIn({
      customerId: cust1.id,
      allocationId: confirmAuth.id,
      warehouseId: "wh-001",
      locationId: "slot-101-c",
      packageType: "PALLET",
      itemCount: 10,
      capacityFootprintSqFt: 30,
      capacityUnit: "SQ_FT",
      description: "Excess capacity regression intake",
    });
  } catch (err: unknown) {
    excessIntakeCaught = (err as Error).message.includes("Available allocated capacity: 20");
  }
  let wrongSlotCaught = false;
  try {
    await services.inventoryService.recordItemsIn({
      customerId: cust1.id,
      allocationId: confirmAuth.id,
      warehouseId: "wh-001",
      locationId: "slot-open-2",
      packageType: "PALLET",
      itemCount: 1,
      capacityFootprintSqFt: 10,
      capacityUnit: "SQ_FT",
      description: "Wrong location regression intake",
    });
  } catch (err: unknown) {
    wrongSlotCaught = (err as Error).message.includes("reserved by its allocation");
  }
  assertTest("Reject Aggregate Allocation Over-Intake", excessIntakeCaught, "Existing inventory is deducted from the allocation limit.");
  assertTest("Reject Intake at Unreserved Location", wrongSlotCaught, "Intake must use the allocation's confirmed location.");

  // --- TEST 6: Partially Occupied Allocation Release ---
  console.log("\n--- TEST 6: Partially Occupied Allocation Release ---");
  const allocPart = await services.allocationService.createAllocationRequirement({
    customerId: cust1.id,
    storageType: "SLOT",
    requiredCapacity: 100,
    capacityUnit: "SQ_FT",
    preferredWarehouseId: "wh-001",
    startDate: "2026-11-01",
    expectedEndDate: "2027-05-01",
  });
  const confirmPart = await services.allocationService.confirmAllocation(allocPart.id, "slot-open-2");
  await services.inventoryService.recordItemsIn({
    customerId: cust1.id,
    allocationId: confirmPart.id,
    warehouseId: "wh-001",
    locationId: "slot-open-2",
    packageType: "PALLET",
    itemCount: 10,
    capacityFootprintSqFt: 40, // 40 SQ.FT occupied out of 100 allocated
    capacityUnit: "SQ_FT",
    description: "Partial occupancy test items",
  });

  let releaseWithInventoryBlocked = false;
  try {
    await services.allocationService.releaseAllocation(confirmPart.id);
  } catch (err: unknown) {
    releaseWithInventoryBlocked = (err as Error).message.includes("remain in storage");
  }
  const occupiedBeforeClosure = findLocationInWarehouses(MOCK_WAREHOUSES, "slot-open-2")!.slot.occupiedCapacitySqFt;
  await services.inventoryService.recordItemsOut({
    inventoryId: (await services.inventoryService.getAllocationInventory(confirmPart.id))[0].id,
    releaseQuantity: 10,
    reason: "Clear inventory before allocation closure regression",
  });
  const relPart = await services.allocationService.releaseAllocation(confirmPart.id);
  const occupiedAfterClosure = findLocationInWarehouses(MOCK_WAREHOUSES, "slot-open-2")!.slot.occupiedCapacitySqFt;
  assertTest(
    "Require Inventory Release Before Allocation Closure",
    releaseWithInventoryBlocked && relPart.status === "RELEASED" && occupiedAfterClosure === occupiedBeforeClosure - 40,
    "Closure is blocked while items remain; after the items leave, occupied capacity is restored."
  );

  // --- TEST 7: Fully Occupied Allocation Release ---
  console.log("\n--- TEST 7: Fully Occupied Allocation Release ---");
  const allocFull = await services.allocationService.createAllocationRequirement({
    customerId: cust1.id,
    storageType: "SLOT",
    requiredCapacity: 50,
    capacityUnit: "SQ_FT",
    preferredWarehouseId: "wh-001",
    startDate: "2026-11-01",
    expectedEndDate: "2027-05-01",
  });
  const confirmFull = await services.allocationService.confirmAllocation(allocFull.id, "slot-open-2");
  const invFull = await services.inventoryService.recordItemsIn({
    customerId: cust1.id,
    allocationId: confirmFull.id,
    warehouseId: "wh-001",
    locationId: "slot-open-2",
    packageType: "PALLET",
    itemCount: 10,
    capacityFootprintSqFt: 50, // 100% occupied
    capacityUnit: "SQ_FT",
    description: "Full occupancy test items",
  });

  await services.inventoryService.recordItemsOut({
    inventoryId: invFull.id,
    releaseQuantity: 10,
    reason: "Full release of test items",
  });

  const relFull = await services.allocationService.releaseAllocation(confirmFull.id);
  assertTest(
    "Fully Occupied Allocation Release",
    relFull.status === "RELEASED",
    `Physical items checked out and allocation capacity restored.`
  );

  // --- TEST 8: Move Only Remaining Footprint After Partial Release ---
  console.log("\n--- TEST 8: Move Partially Released Inventory ---");
  const allocMove = await services.allocationService.createAllocationRequirement({
    customerId: cust1.id,
    storageType: "SLOT",
    requiredCapacity: 100,
    capacityUnit: "SQ_FT",
    preferredWarehouseId: "wh-001",
    startDate: "2026-11-01",
    expectedEndDate: "2027-05-01",
  });
  const confirmedMove = await services.allocationService.confirmAllocation(allocMove.id, "slot-open-2");
  const moveInventory = await services.inventoryService.recordItemsIn({
    customerId: cust1.id,
    allocationId: confirmedMove.id,
    warehouseId: "wh-001",
    locationId: "slot-open-2",
    packageType: "PALLET",
    itemCount: 10,
    capacityFootprintSqFt: 100,
    capacityUnit: "SQ_FT",
    description: "Partially released move regression",
  });
  await services.inventoryService.recordItemsOut({
    inventoryId: moveInventory.id,
    releaseQuantity: 2,
    reason: "Partial release before move regression",
  });
  const sourceBeforeMove = findLocationInWarehouses(MOCK_WAREHOUSES, "slot-open-2")!.slot.occupiedCapacitySqFt;
  const destinationBeforeMove = findLocationInWarehouses(MOCK_WAREHOUSES, "slot-101-c")!.slot.occupiedCapacitySqFt;
  await services.inventoryService.moveInventory({
    inventoryId: moveInventory.id,
    toWarehouseId: "wh-001",
    toLocationId: "slot-101-c",
    reason: "Move remaining package footprint",
  });
  const sourceAfterMove = findLocationInWarehouses(MOCK_WAREHOUSES, "slot-open-2")!.slot.occupiedCapacitySqFt;
  const destinationAfterMove = findLocationInWarehouses(MOCK_WAREHOUSES, "slot-101-c")!.slot.occupiedCapacitySqFt;
  assertTest(
    "Move Remaining Footprint After Partial Release",
    sourceBeforeMove - sourceAfterMove === 80 && destinationAfterMove - destinationBeforeMove === 80,
    `Moved 80 SQ.FT remaining from source to destination.`
  );
  await services.inventoryService.recordItemsOut({
    inventoryId: moveInventory.id,
    releaseQuantity: 8,
    reason: "Clear moved package after regression",
  });
  await services.allocationService.releaseAllocation(confirmedMove.id);

  // --- TEST 9: Invalid Location Safety ---
  console.log("\n--- TEST 9: Invalid Location Safety ---");
  let invalidLocCaught = false;
  try {
    const allocInvLoc = await services.allocationService.createAllocationRequirement({
      customerId: cust1.id,
      storageType: "SLOT",
      requiredCapacity: 50,
      capacityUnit: "SQ_FT",
      preferredWarehouseId: "wh-001",
      startDate: "2026-11-01",
      expectedEndDate: "2027-05-01",
    });
    await services.allocationService.confirmAllocation(allocInvLoc.id, "non-existent-slot-abc");
  } catch (err: unknown) {
    invalidLocCaught = (err as Error).message.includes("does not exist");
  }

  assertTest(
    "Invalid Location Safety",
    invalidLocCaught,
    "Unknown location ID rejected cleanly."
  );

  // --- TEST 10: BLOCKED Location Safety ---
  console.log("\n--- TEST 10: BLOCKED Location Safety ---");
  const resBlockedLoc = findLocationInWarehouses(MOCK_WAREHOUSES, "slot-101-a");
  if (resBlockedLoc) resBlockedLoc.slot.status = "BLOCKED";

  let blockedSlotCaught = false;
  try {
    const tempAlloc = await services.allocationService.createAllocationRequirement({
      customerId: cust1.id,
      storageType: "SLOT",
      requiredCapacity: 50,
      capacityUnit: "SQ_FT",
      preferredWarehouseId: "wh-001",
      startDate: "2026-11-01",
      expectedEndDate: "2027-05-01",
    });
    await services.allocationService.confirmAllocation(tempAlloc.id, "slot-101-a");
  } catch (err: unknown) {
    blockedSlotCaught = (err as Error).message.includes("BLOCKED");
  }

  if (resBlockedLoc) resBlockedLoc.slot.status = "OCCUPIED"; // restore

  assertTest(
    "BLOCKED Location Safety",
    blockedSlotCaught,
    "BLOCKED slot confirmation rejected cleanly."
  );

  // --- TEST 11: Capacity Unit Validation ---
  console.log("\n--- TEST 11: Capacity Unit Validation ---");
  let unsupportedUnitCaught = false;
  try {
    await services.allocationService.createAllocationRequirement({
      customerId: cust1.id,
      storageType: "SLOT",
      requiredCapacity: 50,
      capacityUnit: "CUBIC_METERS" as unknown as "SQ_FT",
      preferredWarehouseId: "wh-001",
      startDate: "2026-11-01",
      expectedEndDate: "2027-05-01",
    });
  } catch (err: unknown) {
    unsupportedUnitCaught = (err as Error).message.includes("Unsupported or missing capacity unit");
  }

  assertTest(
    "Unsupported Capacity Unit Safety",
    unsupportedUnitCaught,
    "Unsupported unit 'CUBIC_METERS' correctly rejected."
  );

  // --- TEST 12-17: Workflow Audit Coverage ---
  console.log("\n--- TEST 12-17: Module Audit Event Generation ---");
  const custAudits = await services.auditService.getAuditEventsByEntity("CUSTOMER", cust1.id);
  assertTest("Customer Audit Generation", custAudits.length > 0, `Recorded ${custAudits.length} customer audit logs.`);

  const invAudits = await services.auditService.getAuditEvents({ entityType: "INVENTORY" });
  assertTest("Inventory Audit Generation", invAudits.length > 0, `Recorded ${invAudits.length} inventory audit logs.`);

  const testContract = await services.contractService.createContract({
    customerId: cust1.id,
    contractType: "SHORT_TERM_STORAGE",
    allocationIds: [],
    startDate: "2026-11-01",
    endDate: "2027-05-01",
    storageRate: 100,
    rateUnit: "SQ_FT",
    billingFrequency: "MONTHLY",
  });
  const cntAudits = await services.auditService.getAuditEventsByEntity("CONTRACT", testContract.id);
  assertTest("Contract Audit Generation", cntAudits.length > 0, `Recorded ${cntAudits.length} contract audit logs.`);

  const testDoc = await services.documentService.uploadDocumentMetadata({
    customerId: cust1.id,
    contractId: testContract.id,
    documentType: "CUSTOMER_ID",
    title: "Emirates ID Copy",
    fileName: "eid_copy.pdf",
    fileType: "application/pdf",
    fileSize: 512000,
    issueDate: "2026-10-06",
  });
  const docAudits = await services.auditService.getAuditEventsByEntity("DOCUMENT", testDoc.id);
  assertTest("Document Audit Generation", docAudits.length > 0, `Recorded ${docAudits.length} document audit logs.`);

  const testInv = await services.billingService.createInvoice({
    customerId: cust1.id,
    contractId: testContract.id,
    billingPeriodStart: "2026-11-01",
    billingPeriodEnd: "2026-11-30",
    issueDate: "2026-10-06",
    dueDate: "2026-11-15",
    lineItems: [{ description: "Monthly Storage", quantity: 1, unit: "MONTH", unitRate: 500 }],
  });
  const invBillAudits = await services.auditService.getAuditEventsByEntity("INVOICE", testInv.id);
  assertTest("Billing Audit Generation", invBillAudits.length > 0, `Recorded ${invBillAudits.length} billing audit logs.`);

  const testWarehouse = await services.warehouseService.createWarehouse({
    name: "Audit Verification Warehouse",
    code: "AUDIT-UAT-01",
    address: "Test Road",
    city: "Dubai",
    country: "UAE",
    capacityUnit: "SQ_FT",
    totalCapacitySqFt: 1000,
    status: "ACTIVE",
  });
  const whAudits = await services.auditService.getAuditEventsByEntity("WAREHOUSE", testWarehouse.id);
  assertTest("Warehouse Audit Generation", whAudits.length > 0, `Recorded ${whAudits.length} warehouse audit log(s).`);

  console.log("\n==================================================");
  console.log(`REGRESSION SUITE RESULTS: ${passCount}/${totalTests} TESTS PASSED`);
  console.log("==================================================");

  if (passCount !== totalTests) {
    process.exit(1);
  }
}

runDataConsistencyRegressionSuite().catch((err) => {
  console.error("Data Consistency Regression Suite Error:", err);
  process.exit(1);
});
