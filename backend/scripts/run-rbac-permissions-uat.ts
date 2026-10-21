/**
 * End-to-End UAT Test Script for PROMPT 22:
 * "Field-Level Roles, Permissions & Operational Access Control"
 */

import { services } from "../src/server/script-registry";
import { PermissionGuard, PermissionDeniedError } from "../src/services/permission-guard";

async function runRbacPermissionsUAT() {
  console.log("=======================================================================");
  console.log("PROMPT 22 UAT: Field-Level Roles & Operational Access Control Test");
  console.log("=======================================================================\n");

  try {
    // -------------------------------------------------------------------------
    // Disclaimer Output (Section 1 & 6)
    // -------------------------------------------------------------------------
    console.log("ℹ️ SECURITY ARCHITECTURE STATUS:");
    console.log("   [ARCHITECTURE READY]: Fine-grained module, action, and field-level permission guards implemented in code layer with audit denial logging.");
    console.log("   [PRODUCTION AUTHENTICATION ENFORCED]: Pending secure session token infrastructure; client-side role switcher is not production auth.\n");

    // -------------------------------------------------------------------------
    // Test Scenario 1: Team Leader / Operator Allowed & Prohibited Actions
    // -------------------------------------------------------------------------
    console.log("👉 Step 1: Testing Team Leader / Operator Permissions (STORAGE_OPERATOR)...");
    
    // 1a. Allowed Action: Submit Extra Items
    const plList = await services.packingListService.getPackingLists();
    const targetPl = plList.find((p) => p.status === "APPROVED") || plList[0];
    
    const extraItemResult = await services.packingListService.addExtraItem(
      targetPl.id,
      {
        name: "Additional Unlisted Storage Crate",
        quantity: 2,
        cbm: 0.5,
        reason: "Customer presented extra crate on-site during pickup.",
        submittedBy: "Ahmed Al-Mansoori (Team Leader)"
      },
      "STORAGE_OPERATOR",
      "Ahmed Al-Mansoori"
    );
    console.log(`   ✓ Team Leader CAN submit Extra Items: Created extra item '${extraItemResult.name}' (Status: ${extraItemResult.status})`);

    // 1b. Prohibited Action: Modify Approved Packing List (Service Layer Enforcement)
    console.log("   - Attempting prohibited Team Leader action: updatePackingList() on APPROVED Packing List...");
    let rejectedAsExpected = false;
    try {
      await services.packingListService.updatePackingList(
        targetPl.id,
        { header: { totalPackaging: "Bypassed Security Packaging" } },
        "STORAGE_OPERATOR",
        "Ahmed Al-Mansoori"
      );
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        rejectedAsExpected = true;
        console.log(`   ✓ REJECTED BY SERVICE GUARD: ${err.message}`);
      } else {
        throw err;
      }
    }

    if (!rejectedAsExpected) {
      throw new Error("Security check failed: Team Leader was able to bypass UI and modify an APPROVED Packing List!");
    }

    // 1c. Prohibited Action: Modify Approved Packing Material List
    console.log("   - Attempting prohibited Team Leader action: updateMaterial() master catalogue...");
    rejectedAsExpected = false;
    try {
      const matList = await services.packingMaterialService.getMaterials();
      await services.packingMaterialService.updateMaterial(
        matList[0].id,
        { availableQty: 99999 },
        "STORAGE_OPERATOR",
        "Ahmed Al-Mansoori"
      );
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        rejectedAsExpected = true;
        console.log(`   ✓ REJECTED BY SERVICE GUARD: ${err.message}`);
      }
    }

    if (!rejectedAsExpected) {
      throw new Error("Security check failed: Team Leader was able to modify master Packing Material inventory!");
    }

    // 1d. Prohibited Action: Storage Allocation Release
    console.log("   - Attempting prohibited Team Leader action: releaseAllocation()...");
    rejectedAsExpected = false;
    try {
      const allocs = await services.allocationService.getAllocations();
      await services.allocationService.releaseAllocation(allocs[0].id, "STORAGE_OPERATOR");
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        rejectedAsExpected = true;
        console.log(`   ✓ REJECTED BY SERVICE GUARD: ${err.message}`);
      }
    }

    if (!rejectedAsExpected) {
      throw new Error("Security check failed: Team Leader was able to release a Storage Allocation!");
    }

    // -------------------------------------------------------------------------
    // Test Scenario 2: Billing User Prohibited Actions
    // -------------------------------------------------------------------------
    console.log("\n👉 Step 2: Testing Billing User Permissions (BILLING_USER)...");
    
    // 2a. Prohibited Action: Modify Warehouse Capacity
    console.log("   - Attempting prohibited Billing action: modify warehouse capacity...");
    rejectedAsExpected = false;
    try {
      await PermissionGuard.enforce("BILLING_USER", "CAPACITY", "EDIT", { entityId: "wh-01" }, "Finance Staff");
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        rejectedAsExpected = true;
        console.log(`   ✓ REJECTED BY SERVICE GUARD: ${err.message}`);
      }
    }

    if (!rejectedAsExpected) {
      throw new Error("Security check failed: Billing user was able to modify warehouse capacity!");
    }

    // -------------------------------------------------------------------------
    // Test Scenario 3: Document/Compliance User Prohibited Actions
    // -------------------------------------------------------------------------
    console.log("\n👉 Step 3: Testing Compliance User Permissions (DOCUMENT_COMPLIANCE_USER)...");
    
    // 3a. Prohibited Action: Change Storage Allocation
    console.log("   - Attempting prohibited Compliance action: change storage allocation...");
    rejectedAsExpected = false;
    try {
      await PermissionGuard.enforce("DOCUMENT_COMPLIANCE_USER", "ALLOCATIONS", "EDIT", { entityId: "alloc-101" }, "Compliance Officer");
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        rejectedAsExpected = true;
        console.log(`   ✓ REJECTED BY SERVICE GUARD: ${err.message}`);
      }
    }

    if (!rejectedAsExpected) {
      throw new Error("Security check failed: Compliance user was able to modify storage allocation!");
    }

    // -------------------------------------------------------------------------
    // Test Scenario 4: Read-Only User Prohibited Mutation Actions
    // -------------------------------------------------------------------------
    console.log("\n👉 Step 4: Testing Read-Only / Management User Permissions (READ_ONLY_USER)...");
    
    // 4a. Prohibited Action: Create Customer or Perform Mutation
    console.log("   - Attempting prohibited Read-Only action: create or approve operational record...");
    rejectedAsExpected = false;
    try {
      await PermissionGuard.enforce("READ_ONLY_USER", "CUSTOMERS", "CREATE", { entityId: "cust-new" }, "Management Auditor");
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        rejectedAsExpected = true;
        console.log(`   ✓ REJECTED BY SERVICE GUARD: ${err.message}`);
      }
    }

    if (!rejectedAsExpected) {
      throw new Error("Security check failed: Read-Only user was able to perform mutation action!");
    }

    // -------------------------------------------------------------------------
    // Test Scenario 5: Audit Denial Verification
    // -------------------------------------------------------------------------
    console.log("\n👉 Step 5: Verifying Security Audit Denial Logs...");
    const auditLogs = await services.auditService.getAuditEventsByEntity("SECURITY", "pl-1001");
    const allSecurityAudits = await services.auditService.getAuditEvents({ entityType: "SECURITY" });
    
    console.log(`   ✓ Total Security Audit Rejection Logs recorded: ${allSecurityAudits.length}`);
    allSecurityAudits.forEach((l, idx) => {
      console.log(`      ${idx + 1}. Action: [${l.action}] by ${l.performedBy} -> ${l.description}`);
    });

    if (allSecurityAudits.length < 4) {
      throw new Error(`Expected at least 4 security rejection logs, found ${allSecurityAudits.length}`);
    }

    console.log("\n=======================================================================");
    console.log("🎉 ALL PROMPT 22 UAT RBAC PERMISSION TESTS PASSED SUCCESSFULLY!");
    console.log("=======================================================================\n");
  } catch (error) {
    console.error("\n❌ UAT TEST FAILED WITH ERROR:");
    console.error(error);
    process.exit(1);
  }
}

runRbacPermissionsUAT();
