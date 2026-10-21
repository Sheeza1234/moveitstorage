import { services } from "../src/server/script-registry";
import { CreateBoxTrackerInput, RecordBoxCollectionInput } from "../src/types/box-collection";

async function runBoxCollectionUat() {
  console.log("=================================================");
  console.log("PROMPT 19 — CUSTOMER BOX COLLECTION TRACKING UAT");
  console.log("=================================================\n");

  try {
    // ---------------------------------------------------------
    // STEP 1: Test 100 Required / 0 Collected
    // ---------------------------------------------------------
    console.log("STEP 1: Testing 100 Required / 0 Collected initial state...");
    const createInput: CreateBoxTrackerInput = {
      customerId: "cust-test-100",
      customerName: "Sharjah Commercial Warehouse",
      boxesRequired: 100,
      initialCollected: 0,
    };
    const tracker = await services.boxCollectionService.createTracker(createInput, "Admin User");

    console.log(`✓ Created Tracker ID: ${tracker.id} for '${tracker.customerName}'`);
    console.log(`  - Required: ${tracker.boxesRequired}`);
    console.log(`  - Collected: ${tracker.boxesCollected}`);
    console.log(`  - Remaining: ${tracker.boxesRemaining}`);
    console.log(`  - Status: ${tracker.status}`);
    console.log(`  - Pending Alert: ${tracker.hasPendingAlert} ("${tracker.alertMessage}")`);

    if (tracker.boxesRemaining !== 100 || tracker.status !== "NOT_STARTED" || !tracker.hasPendingAlert) {
      throw new Error(`Initial state mismatch! Expected remaining 100, status NOT_STARTED.`);
    }

    // ---------------------------------------------------------
    // STEP 2: Test Partial Collection (100 Required / 50 Collected)
    // ---------------------------------------------------------
    console.log("\nSTEP 2: Testing Partial Collection (100 Required / 50 Collected)...");
    const partialInput: RecordBoxCollectionInput = {
      trackerId: tracker.id,
      quantityCollected: 50,
      collectionDate: "2026-10-06",
      responsibleEmployee: "Ahmed Al-Mansoori (TL)",
      notes: "First batch of 50 empty boxes collected from site.",
    };

    const res1 = await services.boxCollectionService.recordCollection(partialInput, "SUPER_ADMIN", "TL Ahmed");
    console.log(`✓ Recorded Partial Collection (+${partialInput.quantityCollected} boxes)`);
    console.log(`  - New Total Collected: ${res1.tracker.boxesCollected}`);
    console.log(`  - Calculated Remaining: ${res1.tracker.boxesRemaining} (Expected: 50)`);
    console.log(`  - Updated Status: ${res1.tracker.status}`);
    console.log(`  - Alert Message: "${res1.tracker.alertMessage}"`);

    if (res1.tracker.boxesRemaining !== 50 || res1.tracker.status !== "PARTIALLY_COLLECTED") {
      throw new Error(`Partial state mismatch! Expected remaining 50, status PARTIALLY_COLLECTED.`);
    }

    // ---------------------------------------------------------
    // STEP 3: Test Attempting > Required (Attempt 101 Total without Admin Exception)
    // ---------------------------------------------------------
    console.log("\nSTEP 3: Testing Over-Collection Rejection (Attempting 101 Total without Exception)...");
    let overCollectErrorCaught = false;
    try {
      await services.boxCollectionService.recordCollection({
        trackerId: tracker.id,
        quantityCollected: 51, // 50 + 51 = 101 > 100
        collectionDate: "2026-10-06",
        responsibleEmployee: "TL Ahmed",
        allowAdminException: false,
      });
    } catch (err: unknown) {
      overCollectErrorCaught = true;
      console.log(`✓ Successfully rejected over-collection without exception: ${(err as Error).message}`);
    }

    if (!overCollectErrorCaught) {
      throw new Error("VALIDATION FAILURE: System allowed collection exceeding required limit without Admin exception!");
    }

    // ---------------------------------------------------------
    // STEP 4: Test Full Collection (100 Required / 100 Collected)
    // ---------------------------------------------------------
    console.log("\nSTEP 4: Testing Complete Collection (100 Required / 100 Total Collected)...");
    const fullInput: RecordBoxCollectionInput = {
      trackerId: tracker.id,
      quantityCollected: 50, // 50 + 50 = 100
      collectionDate: "2026-10-07",
      responsibleEmployee: "Tariq Mahmoud (TL)",
      notes: "Final 50 boxes collected. All boxes returned.",
    };

    const res2 = await services.boxCollectionService.recordCollection(fullInput, "SUPER_ADMIN", "TL Tariq");
    console.log(`✓ Recorded Final Collection (+${fullInput.quantityCollected} boxes)`);
    console.log(`  - Total Collected: ${res2.tracker.boxesCollected}`);
    console.log(`  - Calculated Remaining: ${res2.tracker.boxesRemaining} (Expected: 0)`);
    console.log(`  - Updated Status: ${res2.tracker.status}`);
    console.log(`  - Alert Cleared: ${!res2.tracker.hasPendingAlert}`);

    if (res2.tracker.boxesRemaining !== 0 || res2.tracker.status !== "FULLY_COLLECTED" || res2.tracker.hasPendingAlert) {
      throw new Error(`Full collection state mismatch! Expected remaining 0, status FULLY_COLLECTED, alert cleared.`);
    }

    // ---------------------------------------------------------
    // STEP 5: Test Approved Admin Exception (Attempting Extra Collection Beyond Required)
    // ---------------------------------------------------------
    console.log("\nSTEP 5: Testing Approved Admin Exception Over-Collection...");
    const exceptionInput: RecordBoxCollectionInput = {
      trackerId: tracker.id,
      quantityCollected: 5, // Total becomes 105 (exceeding original 100)
      collectionDate: "2026-10-08",
      responsibleEmployee: "Supervisor Saeed",
      notes: "Customer returned 5 additional old boxes from previous move.",
      allowAdminException: true,
    };

    const res3 = await services.boxCollectionService.recordCollection(exceptionInput, "SUPER_ADMIN", "Admin Saeed");
    console.log(`✓ Approved Admin Exception Collection (+${exceptionInput.quantityCollected} extra boxes)`);
    console.log(`  - Total Collected: ${res3.tracker.boxesCollected} (105 / ${res3.tracker.boxesRequired})`);
    console.log(`  - Event Admin Exception Flag: ${res3.event.isAdminException}`);

    if (!res3.event.isAdminException || res3.tracker.boxesCollected !== 105) {
      throw new Error("Admin exception recording failed!");
    }

    // ---------------------------------------------------------
    // STEP 6: Test Multiple Collection Events & History Preservation
    // ---------------------------------------------------------
    console.log("\nSTEP 6: Verifying Historical Event Log Preservation...");
    const historyEvents = await services.boxCollectionService.getCollectionHistory(tracker.id);
    console.log(`✓ Total Historical Collection Events for Tracker '${tracker.id}': ${historyEvents.length}`);
    historyEvents.forEach((evt, idx) => {
      console.log(`  - Event ${idx + 1} [${evt.collectionDate}]: +${evt.quantityCollected} boxes by ${evt.responsibleEmployee} (Admin Exception: ${evt.isAdminException})`);
    });

    if (historyEvents.length !== 3) {
      throw new Error(`Expected 3 historical events, found ${historyEvents.length}`);
    }

    // ---------------------------------------------------------
    // STEP 7: Verify Audit Logging
    // ---------------------------------------------------------
    console.log("\nSTEP 7: Verifying Audit Log Events...");
    const auditLogs = await services.auditService.getAuditEvents();
    const boxAuditEvents = auditLogs.filter((e) => e.entityType === "BOX_COLLECTION");
    console.log(`✓ Total Box Collection Audit Events Logged: ${boxAuditEvents.length}`);
    boxAuditEvents.slice(0, 4).forEach((evt) => {
      console.log(`  - [${evt.action}] ${evt.description} (By: ${evt.performedBy})`);
    });

    if (boxAuditEvents.length < 3) {
      throw new Error("Audit logging for box collection failed!");
    }

    console.log("\n=================================================");
    console.log("PROMPT 19 VERIFICATION RESULT: PASS");
    console.log("=================================================");
  } catch (err: unknown) {
    console.error("\n=================================================");
    console.error("PROMPT 19 VERIFICATION RESULT: FAIL");
    console.error(`Error: ${(err as Error).message}`);
    console.error("=================================================");
    process.exit(1);
  }
}

runBoxCollectionUat();
