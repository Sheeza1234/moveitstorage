import { MockAllocationService } from "../src/services/mock/allocation-service";
import { MockAIStorageRecommendationService } from "../src/services/mock/ai-recommendation-service";
import { auditService } from "../src/services/mock/audit-service";
import { StorageRequirementInput } from "../src/types";

async function runAIAllocationUAT() {
  console.log("==================================================");
  console.log("AI STORAGE ALLOCATION & AUDIT LOGGING UAT");
  console.log("==================================================\n");

  const allocationService = new MockAllocationService();
  const aiService = new MockAIStorageRecommendationService();

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, title: string, details?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  [PASS] ${title}`);
      if (details) console.log(`         ↳ ${details}`);
    } else {
      console.log(`  [FAIL] ${title}`);
      if (details) console.log(`         ↳ ${details}`);
    }
  }

  // --- 1. Inputs Verification ---
  console.log("--- 1. Storage Allocation Input Verification ---");
  const input: StorageRequirementInput = {
    customerId: "cust-01",
    storageType: "FLOOR",
    requiredCapacity: 450,
    capacityUnit: "SQ_FT",
    startDate: "2026-11-01",
    expectedEndDate: "2027-10-31",
    preferredWarehouseId: "wh-01",
    notes: "High priority commercial goods requiring optimal climate storage",
  };

  assert(typeof input.requiredCapacity === "number" && input.requiredCapacity === 450, "Verify Required SQ.FT Input", `Required SQ.FT: ${input.requiredCapacity}`);
  assert(Boolean(input.startDate && input.expectedEndDate), "Verify Storage Duration Input", `Period: ${input.startDate} to ${input.expectedEndDate}`);
  assert(input.preferredWarehouseId === "wh-01", "Verify Preferred Warehouse Input", `Preferred Warehouse ID: ${input.preferredWarehouseId}`);

  // --- 2. AI Recommendation & Candidate Filtering ---
  console.log("\n--- 2. AI Recommendation & Candidate Location Filtering ---");
  const aiResult = await aiService.recommendStorageLocations(input);

  assert(aiResult.candidateLocations.length > 0, "Retrieve Candidate Locations", `Found ${aiResult.candidateLocations.length} eligible candidates`);
  
  // Verify candidate filtering logic (all returned locations have available capacity >= required capacity)
  const allValidCapacity = aiResult.candidateLocations.every((c) => c.availableCapacity >= input.requiredCapacity);
  assert(allValidCapacity, "Verify Candidate Capacity Filtering", "All candidates meet or exceed required 450 SQ.FT capacity");

  const topRec = aiResult.topRecommendation;
  assert(Boolean(topRec), "Verify Recommended Location Present", `Top Location: "${topRec?.locationPath}"`);
  assert(Boolean(topRec?.recommendationReason), "Verify Recommendation Explanation", `Reasoning: "${topRec?.recommendationReason}"`);
  assert(topRec?.availableCapacity !== undefined && topRec.availableCapacity >= 450, "Verify Candidate Available Capacity", `Available: ${topRec?.availableCapacity} SQ.FT`);
  assert(topRec?.compatibilityScore !== undefined && topRec.compatibilityScore > 50, "Verify Compatibility Score Computation", `Score: ${topRec?.compatibilityScore}% match`);

  // --- 3. Requirement Creation with AI Metadata ---
  console.log("\n--- 3. Requirement Creation & Draft Allocation ---");
  const newAlloc = await allocationService.createAllocationRequirement(input);
  assert(newAlloc.aiRecommended === true, "Verify AI Assistance Flag Recorded on Allocation", `aiRecommended: ${newAlloc.aiRecommended}`);
  assert(newAlloc.recommendationScore === topRec?.compatibilityScore, "Verify Compatibility Score Stored", `Stored Score: ${newAlloc.recommendationScore}%`);
  assert(Boolean(newAlloc.recommendationReason), "Verify Recommendation Rationale Stored", `Rationale: ${newAlloc.recommendationReason}`);

  // --- 4. Admin Approval & Permission Oversight ---
  console.log("\n--- 4. Admin Approval & Location Confirmation ---");
  assert(newAlloc.status === "RECOMMENDED" || newAlloc.status === "PENDING_REVIEW", "Verify Initial Status Pending Admin Review", `Initial Status: ${newAlloc.status}`);

  const targetLocationId = topRec?.locationId || "slot-01";
  const confirmedAlloc = await allocationService.confirmAllocation(newAlloc.id, targetLocationId);
  assert(confirmedAlloc.status === "CONFIRMED", "Verify Admin Approval Execution", `Updated Status: ${confirmedAlloc.status}`);
  assert(Boolean(confirmedAlloc.confirmedAt), "Verify Confirmation Timestamp Tracked", `Confirmed At: ${confirmedAlloc.confirmedAt}`);

  // --- 5. AI Recommendation Audit Trail Verification ---
  console.log("\n--- 5. AI Recommendation Audit History Record ---");
  const auditEvents = await auditService.getAuditEventsByEntity("ALLOCATION", confirmedAlloc.id);
  assert(auditEvents.length >= 2, "Retrieve Audit Trail Events for Allocation", `Found ${auditEvents.length} audit trail event(s)`);

  const confirmEvent = auditEvents.find((e) => e.action === "ALLOCATION_CONFIRMED");
  assert(Boolean(confirmEvent), "Verify ALLOCATION_CONFIRMED Audit Event Logged", `Event ID: ${confirmEvent?.id}`);
  assert(confirmEvent?.metadata?.aiRecommended === true, "Verify Audit Record Tracks AI Assistance Used", `Metadata aiRecommended: ${confirmEvent?.metadata?.aiRecommended}`);
  assert(confirmEvent?.metadata?.acceptedLocationId === targetLocationId, "Verify Audit Record Tracks Accepted Recommendation Location", `Accepted Location ID: ${confirmEvent?.metadata?.acceptedLocationId}`);
  assert(confirmEvent?.metadata?.adminApproved === true, "Verify Audit Record Tracks Admin Approval Oversight", `Metadata adminApproved: ${confirmEvent?.metadata?.adminApproved}`);

  console.log("\n==================================================");
  console.log(`AI ALLOCATION UAT RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log("==================================================");

  if (passed < total) {
    process.exit(1);
  }
}

runAIAllocationUAT().catch((err) => {
  console.error("UAT Execution Error:", err);
  process.exit(1);
});
