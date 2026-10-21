import { MockInventoryService } from "../src/services/mock/inventory-service";
import { MockMovementService } from "../src/services/mock/movement-service";
import { MOCK_CUSTOMERS, MOCK_ALLOCATIONS, MOCK_WAREHOUSES } from "../src/services/mock/mock-db";

async function runUAT7A() {
  console.log("==================================================");
  console.log("7A. INVENTORY DATA & STATUS LIFECYCLE UAT");
  console.log("==================================================\n");

  const inventoryService = new MockInventoryService();
  const movementService = new MockMovementService();

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] ${testName}`);
      if (detail) console.log(`         ↳ ${detail}`);
    } else {
      console.error(`  [FAIL] ${testName}`);
      if (detail) console.error(`         ↳ ${detail}`);
      process.exitCode = 1;
    }
  }

  // Pick target active customer, allocation & warehouse
  const targetCustomer = MOCK_CUSTOMERS[0]; // Al Habtoor Commercial Group
  const targetAllocation = MOCK_ALLOCATIONS.find((a) => a.customerId === targetCustomer.id && (a.status === "CONFIRMED" || a.status === "ACTIVE"))!;
  const targetWarehouse = MOCK_WAREHOUSES[0]; // DXB-HUB-01
  const targetSlotId = targetWarehouse.floors![0].zones[0].racks![0].slots[0].id; // slot-101-a

  // -------------------------------------------------------------
  // TEST SECTION 1: PACKAGE-LEVEL & ITEM-LEVEL INFORMATION
  // -------------------------------------------------------------
  console.log("--- 1. Package-Level & Item-Level Information Verification ---");

  const newPackage = await inventoryService.createInventoryRecord({
    customerId: targetCustomer.id,
    allocationId: targetAllocation.id,
    warehouseId: targetWarehouse.id,
    locationId: targetSlotId,
    packageType: "CRATE",
    itemCount: 8,
    capacityFootprintSqFt: 100,
    capacityUnit: "SQ_FT",
    description: "Precision Industrial CNC Machine Tools & Calibrated Sensors",
    weightKg: 450,
    volumeCuFt: 85,
    notes: "Requires anti-vibration padding and temperature monitoring.",
    items: [
      {
        name: "Calibrated Laser Sensors",
        quantity: 4,
        fragile: true,
        specialHandling: "Handle with electrostatic discharge protection glove.",
        notes: "Calibration certificate attached inside pouch #1",
      },
      {
        name: "Heavy Duty CNC Milling Heads",
        quantity: 4,
        heavy: true,
        specialHandling: "Forklift crane sling required.",
        notes: "Pre-oiled anti-rust coating applied",
      },
    ],
  });

  assert(Boolean(newPackage.packageId), "Verify Package ID", `Package Code: ${newPackage.packageId}`);
  assert(
    newPackage.description === "Precision Industrial CNC Machine Tools & Calibrated Sensors",
    "Verify Package Description",
    `Description: "${newPackage.description}"`
  );
  assert(newPackage.itemCount === 8, "Verify Package Quantity", `Quantity: ${newPackage.itemCount} items`);
  assert(newPackage.packageType === "CRATE", "Verify Package Type", `Package Type: ${newPackage.packageType}`);
  assert(
    newPackage.locationPath.includes("Dubai Hub") || newPackage.locationPath.includes("MoveIt"),
    "Verify Current Location",
    `Current Location Path: "${newPackage.locationPath}"`
  );

  // Individual item verification
  assert(
    Array.isArray(newPackage.items) && newPackage.items.length === 2,
    "Verify Itemized Breakdown Present",
    `Item Count: ${newPackage.items?.length} distinct item types`
  );

  const item1 = newPackage.items![0];
  assert(
    item1.name === "Calibrated Laser Sensors" && item1.quantity === 4,
    "Verify Item Description & Quantity",
    `Item 1: "${item1.name}" (Quantity: ${item1.quantity})`
  );

  assert(
    item1.fragile === true && item1.specialHandling?.includes("electrostatic") === true && item1.notes?.includes("Calibration certificate") === true,
    "Verify Item Notes & Special Handling Attributes",
    `Fragile: ${item1.fragile}, Notes: "${item1.notes}"`
  );

  // -------------------------------------------------------------
  // TEST SECTION 2: APPROVED INVENTORY LIFECYCLE STATUSES
  // -------------------------------------------------------------
  console.log("\n--- 2. Approved Inventory Lifecycle Statuses & Transitions ---");

  // 2.1 Lifecycle Status: EXPECTED
  const expectedPackage = await inventoryService.createInventoryRecord({
    customerId: targetCustomer.id,
    allocationId: targetAllocation.id,
    warehouseId: targetWarehouse.id,
    locationId: targetSlotId,
    packageType: "PALLET",
    itemCount: 15,
    capacityFootprintSqFt: 50,
    capacityUnit: "SQ_FT",
    description: "Expected Solar Inverter Units (Inbound Scheduled)",
  });

  // Explicitly update to EXPECTED state
  const statusExpected = await inventoryService.updateInventoryStatus({
    inventoryId: expectedPackage.id,
    newStatus: "EXPECTED",
    reason: "Inbound shipment manifest registered prior to warehouse arrival",
  });
  assert(statusExpected.status === "EXPECTED", "Verify Lifecycle Status: EXPECTED", `Status: ${statusExpected.status}`);

  // 2.2 Lifecycle Status: RECEIVED
  const statusReceived = await inventoryService.updateInventoryStatus({
    inventoryId: expectedPackage.id,
    newStatus: "RECEIVED",
    reason: "Inspected and checked in at Receiving Gate Bay 3",
  });
  assert(
    statusReceived.status === "RECEIVED" && Boolean(statusReceived.receivedAt),
    "Verify Lifecycle Status: RECEIVED",
    `Status: ${statusReceived.status}, ReceivedAt: ${statusReceived.receivedAt}`
  );

  // 2.3 Lifecycle Status: STORED
  const statusStored = await inventoryService.updateInventoryStatus({
    inventoryId: expectedPackage.id,
    newStatus: "STORED",
    reason: "Putaway completed in Rack 101 Slot A",
  });
  assert(
    statusStored.status === "STORED" && Boolean(statusStored.storedAt),
    "Verify Lifecycle Status: STORED",
    `Status: ${statusStored.status}, StoredAt: ${statusStored.storedAt}`
  );

  // 2.4 Lifecycle Status: MOVED
  const statusMoved = await inventoryService.updateInventoryStatus({
    inventoryId: expectedPackage.id,
    newStatus: "MOVED",
    reason: "Inter-facility transfer to Abu Dhabi Hub",
  });
  assert(statusMoved.status === "MOVED", "Verify Lifecycle Status: MOVED", `Status: ${statusMoved.status}`);

  // 2.5 Lifecycle Status: RELEASED
  const statusReleased = await inventoryService.updateInventoryStatus({
    inventoryId: expectedPackage.id,
    newStatus: "RELEASED",
    reason: "Final customer checkout dispatch",
  });
  assert(
    statusReleased.status === "RELEASED" && Boolean(statusReleased.releasedAt),
    "Verify Lifecycle Status: RELEASED",
    `Status: ${statusReleased.status}, ReleasedAt: ${statusReleased.releasedAt}`
  );

  // -------------------------------------------------------------
  // TEST SECTION 3: PHYSICAL OPERATIONAL TRANSITION VALIDATION
  // -------------------------------------------------------------
  console.log("\n--- 3. Physical Operational Transition Constraints ---");

  // Operational Rule 1: Cannot jump directly from EXPECTED to RELEASED
  const freshExpected = await inventoryService.createInventoryRecord({
    customerId: targetCustomer.id,
    allocationId: targetAllocation.id,
    warehouseId: targetWarehouse.id,
    locationId: targetSlotId,
    packageType: "BOX",
    itemCount: 5,
    capacityFootprintSqFt: 20,
    capacityUnit: "SQ_FT",
    description: "Expected Air Cargo Freight Box",
  });
  await inventoryService.updateInventoryStatus({
    inventoryId: freshExpected.id,
    newStatus: "EXPECTED",
    reason: "Inbound expected",
  });

  let jumpedInvalid = false;
  try {
    await inventoryService.updateInventoryStatus({
      inventoryId: freshExpected.id,
      newStatus: "RELEASED",
      reason: "Attempting illegal direct jump from EXPECTED to RELEASED",
    });
  } catch (err) {
    jumpedInvalid = true;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`         ↳ Caught invalid transition: "${msg}"`);
  }
  assert(jumpedInvalid, "Reject Direct Status Jump EXPECTED → RELEASED", "Direct release of unreceived inventory prevented");

  // Operational Rule 2: Cannot modify/move fully RELEASED inventory
  let moveReleasedInvalid = false;
  try {
    await inventoryService.updateInventoryStatus({
      inventoryId: statusReleased.id,
      newStatus: "STORED",
      reason: "Attempting to re-store already released inventory",
    });
  } catch (err) {
    moveReleasedInvalid = true;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`         ↳ Caught invalid transition: "${msg}"`);
  }
  assert(moveReleasedInvalid, "Prevent Modifying / Re-storing RELEASED Inventory", "Already released inventory locked from state changes");

  // -------------------------------------------------------------
  // TEST SECTION 4: END-TO-END TRACEABILITY VERIFICATION
  // -------------------------------------------------------------
  console.log("\n--- 4. End-to-End Traceability Verification ---");

  // Query traceability for newPackage: Customer → Allocation → Location → Movement History
  const fetchedPkg = await inventoryService.getInventoryById(newPackage.id);
  assert(Boolean(fetchedPkg), "Retrieve Package Record for Traceability", `Package ID: ${fetchedPkg?.packageId}`);

  // Trace to Customer
  assert(
    fetchedPkg?.customerId === targetCustomer.id && fetchedPkg?.customerName === targetCustomer.name,
    "Trace Package → Customer Record",
    `Customer Code/Name: ${targetCustomer.code} / ${fetchedPkg?.customerName}`
  );

  // Trace to Storage Allocation
  assert(
    fetchedPkg?.allocationId === targetAllocation.id && fetchedPkg?.allocationCode === targetAllocation.allocationCode,
    "Trace Package → Storage Allocation",
    `Allocation Code: ${fetchedPkg?.allocationCode}`
  );

  // Trace to Warehouse Location
  assert(
    fetchedPkg?.warehouseId === targetWarehouse.id && Boolean(fetchedPkg?.locationPath),
    "Trace Package → Warehouse Location",
    `Location Path: "${fetchedPkg?.locationPath}"`
  );

  // Trace to Movement History
  const pkgMovements = await movementService.getInventoryMovements(fetchedPkg!.id);
  assert(
    Array.isArray(pkgMovements) && pkgMovements.length > 0,
    "Trace Package → Complete Movement History Log",
    `Movement Log Count: ${pkgMovements.length} log entry(s)`
  );

  const initialIntakeLog = pkgMovements[0];
  assert(
    initialIntakeLog.movementType === "IN" && initialIntakeLog.packageId === fetchedPkg?.packageId,
    "Verify Movement Log Details match Package",
    `Movement Code: ${initialIntakeLog.movementCode}, Type: ${initialIntakeLog.movementType}, Reason: "${initialIntakeLog.reason}"`
  );

  console.log("\n==================================================");
  console.log(`UAT 7A RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("==================================================");

  if (passedTests === totalTests) {
    console.log("SUCCESS: All 7A Inventory Data & Status Lifecycle UAT criteria satisfied.");
  } else {
    throw new Error(`UAT failed with ${totalTests - passedTests} failures.`);
  }
}

runUAT7A().catch((err) => {
  console.error("UAT Execution Error:", err);
  process.exit(1);
});
