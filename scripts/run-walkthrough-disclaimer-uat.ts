/**
 * End-to-End UAT Test Script for PROMPT 20:
 * "Walk Through, Damage Disclaimer, Customer Sign-Off & Storage Redelivery Completion"
 */

import { services } from "../src/server/script-registry";

async function runWalkthroughDisclaimerUAT() {
  console.log("=======================================================================");
  console.log("PROMPT 20 UAT: Walk Through & Damage Disclaimer Digital Workflow Test");
  console.log("=======================================================================\n");

  try {
    // -------------------------------------------------------------------------
    // Step 1: Initialize Service & Verify Master Template Structure
    // -------------------------------------------------------------------------
    console.log("👉 Step 1: Initializing disclaimers and checking Master Document Structure...");
    const initialList = await services.walkthroughDisclaimerService.getDisclaimers();
    console.log(`   Found ${initialList.length} initial disclaimer forms in memory.`);

    // -------------------------------------------------------------------------
    // Step 2: Create a new Walkthrough Disclaimer form
    // -------------------------------------------------------------------------
    console.log("\n👉 Step 2: Creating a new official Walk Through Disclaimer...");
    const created = await services.walkthroughDisclaimerService.createDisclaimer({
      customerId: "cust-01",
      customerName: "Al Habtoor Group (Dubai Branch)",
      date: "2026-10-06",
      crewLeaderNameDetails: "Ahmed Al-Mansoori",
      crewSheetId: "cs-4001",
      boxesToBeCollected: 45,
      emptyBoxCollectionDate: "2026-10-14",
    });

    console.log(`   ✓ Created Disclaimer Form [${created.id}] for Customer: "${created.customerName}"`);
    console.log(`   ✓ Disclaimer Number: ${created.disclaimerNumber}`);
    console.log(`   ✓ Initial Status: ${created.status}`);
    console.log(`   ✓ Form Checklist Items Count: ${created.checklist.length}`);

    // Verify all 6 official particulars exist
    const checklistParticulars = created.checklist.map((c) => c.particulars);
    console.log("   Checklist Particulars in Master Template:");
    checklistParticulars.forEach((p, idx) => console.log(`      ${idx + 1}. ${p}`));

    if (created.checklist.length !== 6) {
      throw new Error("Master template checklist does not have exactly 6 particulars!");
    }

    // -------------------------------------------------------------------------
    // Step 3: Test Scenario A - Checklist completion
    // -------------------------------------------------------------------------
    console.log("\n👉 Step 3: Testing Checklist Responses...");
    const updatedChecklist = created.checklist.map((c) => ({
      ...c,
      yes: c.sl <= 4,
      no: c.sl > 4,
      comments: "Verified by customer & crew during walk-through."
    }));

    const updatedWithChecklist = await services.walkthroughDisclaimerService.updateChecklist(
      created.id,
      updatedChecklist
    );

    console.log("   ✓ Successfully updated checklist responses.");

    // -------------------------------------------------------------------------
    // Step 4: Test Damage Recording
    // -------------------------------------------------------------------------
    console.log("\n👉 Step 4: Recording a Damage Incident (Item damaged during redelivery)...");
    const { disclaimer: afterDamage, damage } = await services.walkthroughDisclaimerService.recordDamage(
      {
        disclaimerId: created.id,
        itemName: "Mahogany Dining Table",
        description: "Deep scratch on top surface right corner",
        location: "Living Room Ground Floor",
        photos: ["https://storage.moveit.ae/photos/damage-001.jpg"],
        reportedBy: "Customer (Mr. Al Habtoor)",
        severity: "MODERATE",
      },
      "Ahmed Al-Mansoori (Crew Leader)"
    );

    console.log(`   ✓ Damage recorded! ID: ${damage.id}`);
    console.log(`     - Item: ${damage.itemName}`);
    console.log(`     - Severity: ${damage.severity}`);
    console.log(`     - Photos Attached: ${damage.photos?.length || 0}`);
    console.log(`     - Form Status after damage: ${afterDamage.status}`);

    // -------------------------------------------------------------------------
    // Step 5: Test Missing Items Recording & Discrepancy Flagging
    // -------------------------------------------------------------------------
    console.log("\n👉 Step 5: Recording a Missing Item Discrepancy against Packing List...");
    const { disclaimer: afterMissing, missing } = await services.walkthroughDisclaimerService.recordMissingItem(
      {
        disclaimerId: created.id,
        packingListItemId: "PL-ITEM-88",
        itemName: "Executive Leather Office Chair",
        expectedQty: 2,
        returnedQty: 1,
        notes: "1 chair missing from container allocation #3",
      },
      "Ahmed Al-Mansoori (Crew Leader)"
    );

    console.log(`   ✓ Missing item recorded! Discrepancy count: ${missing.discrepancyCount}`);
    console.log(`     - Expected: ${missing.expectedQty}, Returned: ${missing.returnedQty}`);
    console.log(`     - Form Status: ${afterMissing.status}`);

    // -------------------------------------------------------------------------
    // Step 6: Test Customer & Crew Leader Signatures
    // -------------------------------------------------------------------------
    console.log("\n👉 Step 6: Capturing Customer & Crew Leader Digital Signatures...");
    
    // Customer Sign-off
    const custSigned = await services.walkthroughDisclaimerService.signDisclaimer({
      disclaimerId: created.id,
      signedByRole: "CUSTOMER",
      customerSignature: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      customerNameDetails: "Tariq Al-Habtoor"
    });
    console.log(`   ✓ Customer Signature Recorded: "${custSigned.customerNameDetails}" at ${custSigned.customerSignedAt}`);

    // Crew Leader Sign-off
    const crewSigned = await services.walkthroughDisclaimerService.signDisclaimer({
      disclaimerId: created.id,
      signedByRole: "CREW_LEADER",
      crewLeaderSignature: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      crewLeaderNameDetails: "Ahmed Al-Mansoori"
    });
    console.log(`   ✓ Crew Leader Signature Recorded: "${crewSigned.crewLeaderNameDetails}" at ${crewSigned.crewLeaderSignedAt}`);

    // -------------------------------------------------------------------------
    // Step 7: Test Job Completion & Issue Preservation Rules
    // -------------------------------------------------------------------------
    console.log("\n👉 Step 7: Submitting Job Completion for Redelivery...");
    const completedResult = await services.walkthroughDisclaimerService.completeDisclaimer(
      created.id,
      "SUPER_ADMIN",
      "Operations Admin User"
    );

    console.log(`   ✓ Final Job Completion Status: ${completedResult.status}`);
    console.log(`   ✓ Damage Records Preserved: ${completedResult.damageRecords.length}`);
    console.log(`   ✓ Missing Item Records Preserved: ${completedResult.missingItemRecords.length}`);
    console.log(`   ✓ Admin Review Notes: "${completedResult.adminReviewNotes}"`);

    if (completedResult.status !== "FLAGGED_WITH_ISSUES") {
      throw new Error(`Expected status FLAGGED_WITH_ISSUES due to damage/missing items, got: ${completedResult.status}`);
    }

    // -------------------------------------------------------------------------
    // Step 8: Audit Log Trail Verification
    // -------------------------------------------------------------------------
    console.log("\n👉 Step 8: Verifying System Audit Logs for Disclaimer Workflow...");
    const auditLogs = await services.auditService.getAuditEventsByEntity("WALKTHROUGH_DISCLAIMER", created.id);
    console.log(`   ✓ Total Audit Trail Entries logged for Disclaimer [${created.id}]: ${auditLogs.length}`);
    auditLogs.forEach((l) => console.log(`      - Action: [${l.action}] by ${l.performedBy} -> ${l.description}`));

    console.log("\n=======================================================================");
    console.log("🎉 ALL PROMPT 20 UAT TESTS PASSED SUCCESSFULLY!");
    console.log("=======================================================================\n");
  } catch (error) {
    console.error("\n❌ UAT TEST FAILED WITH ERROR:");
    console.error(error);
    process.exit(1);
  }
}

runWalkthroughDisclaimerUAT();
