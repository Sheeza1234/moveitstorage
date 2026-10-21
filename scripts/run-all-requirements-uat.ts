import { services } from "../src/server/script-registry";
import { 
  hasPermission, 
  UserRole, 
  PERMISSION_MATRIX, 
  USER_ROLES 
} from "../src/types";

async function runFullSystemIntegrationUAT() {
  console.log("==================================================");
  console.log("PROMPT 12: ROLES, AUDIT & SYSTEM INTEGRATION UAT");
  console.log("==================================================\n");

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

  // --- 1. Roles & Permissions Verification ---
  console.log("--- 1. Role-Based Access Control (RBAC) Permission Matrix ---");
  assert(USER_ROLES.length === 6, "Verify 6 Core Roles Defined", `Defined Roles: ${USER_ROLES.map((r) => r.name).join(", ")}`);

  // Super Admin: full access
  assert(hasPermission("SUPER_ADMIN", "SETTINGS", "DELETE") === true, "Super Admin: Full Configuration Access", "SUPER_ADMIN has SETTINGS:DELETE");

  // Storage Manager: operational access
  assert(hasPermission("STORAGE_MANAGER", "ALLOCATIONS", "CREATE") === true, "Storage Manager: Allocation Creation", "STORAGE_MANAGER has ALLOCATIONS:CREATE");
  assert(hasPermission("STORAGE_MANAGER", "BILLING", "RECONCILE") === false, "Storage Manager: Billing Reconciliation Restricted", "STORAGE_MANAGER denied BILLING:RECONCILE");

  // Storage Operator: inventory intake & movement
  assert(hasPermission("STORAGE_OPERATOR", "INVENTORY", "CREATE") === true, "Storage Operator: Inventory Operations Allowed", "STORAGE_OPERATOR has INVENTORY:CREATE");
  assert(hasPermission("STORAGE_OPERATOR", "CONTRACTS", "CREATE") === false, "Storage Operator: Contract Creation Restricted", "STORAGE_OPERATOR denied CONTRACTS:CREATE");

  // Billing User: billing & invoice management
  assert(hasPermission("BILLING_USER", "BILLING", "RECONCILE") === true, "Billing User: Billing Reconciliation Allowed", "BILLING_USER has BILLING:RECONCILE");
  assert(hasPermission("BILLING_USER", "INVENTORY", "CREATE") === false, "Billing User: Inventory Operations Restricted", "BILLING_USER denied INVENTORY:CREATE");

  // Document/Compliance User: compliance documents
  assert(hasPermission("DOCUMENT_COMPLIANCE_USER", "DOCUMENTS", "APPROVE") === true, "Compliance User: Document Approval Allowed", "DOCUMENT_COMPLIANCE_USER has DOCUMENTS:APPROVE");
  assert(hasPermission("DOCUMENT_COMPLIANCE_USER", "BILLING", "CREATE") === false, "Compliance User: Invoice Creation Restricted", "DOCUMENT_COMPLIANCE_USER denied BILLING:CREATE");

  // Read-Only User: view only across system
  assert(hasPermission("READ_ONLY_USER", "CUSTOMERS", "VIEW") === true, "Read-Only User: Customer Record Viewing Allowed", "READ_ONLY_USER has CUSTOMERS:VIEW");
  assert(hasPermission("READ_ONLY_USER", "CUSTOMERS", "CREATE") === false, "Read-Only User: Customer Creation Restricted", "READ_ONLY_USER denied CUSTOMERS:CREATE");
  assert(hasPermission("READ_ONLY_USER", "DOCUMENTS", "EDIT") === false, "Read-Only User: Sensitive Document Modification Restricted", "READ_ONLY_USER denied DOCUMENTS:EDIT");

  // --- 2. Audit & Activity Tracking ---
  console.log("\n--- 2. Audit & Activity Tracking Audit ---");
  const auditEvents = await services.auditService.getAuditEvents();
  assert(auditEvents.length > 0, "Retrieve Audit Trail Events", `Total audit log entries: ${auditEvents.length}`);

  const sampleEvent = auditEvents[0];
  assert(
    Boolean(sampleEvent.id && sampleEvent.action && sampleEvent.timestamp && sampleEvent.performedBy),
    "Verify Mandatory Audit Fields (User, Timestamp, Action, Entity)",
    `Action: "${sampleEvent.action}", User: "${sampleEvent.performedBy}", Entity: "${sampleEvent.entityType}:${sampleEvent.entityId}"`
  );

  // --- 3. Customer Storage Duration & Historical Preservation ---
  console.log("\n--- 3. Customer Storage Duration & Historical Preservation ---");
  const customers = await services.customerService.getCustomers();
  const targetCust = customers[0];

  assert(
    typeof targetCust.requiredSqFt === "number" && Boolean(targetCust.storageStartDate) && typeof targetCust.storageDurationMonths === "number",
    "Verify Customer Storage Requirement Fields (SQ.FT, Start Date, Duration)",
    `Required: ${targetCust.requiredSqFt} SQ.FT, Start: ${targetCust.storageStartDate}, Duration: ${targetCust.storageDurationMonths} months`
  );

  // Test Customer Deactivation Preservation
  const updatedCust = await services.customerService.updateCustomer(targetCust.id, { status: "INACTIVE" });
  assert(updatedCust.status === "INACTIVE", "Deactivate Customer Account", `Status updated to ${updatedCust.status}`);

  const preservedAllocations = await services.allocationService.getAllocations();
  const custAllocations = preservedAllocations.filter((a) => a.customerId === targetCust.id);
  assert(custAllocations.length > 0, "Preserve Historical Storage Allocations Upon Closure", `Preserved ${custAllocations.length} allocation record(s) for inactive customer`);

  // --- 4. Dashboard Metrics & Pending Movements KPI ---
  console.log("\n--- 4. Dashboard Metrics & Pending Movements KPI ---");
  const metrics = await services.dashboardService.getMetrics("ALL");

  assert(metrics.totalCustomers > 0, "Verify Metric: Total Customers", `Count: ${metrics.totalCustomers}`);
  assert(metrics.totalCapacitySqFt > 0, "Verify Metric: Total Storage Capacity", `Capacity: ${metrics.totalCapacitySqFt} SQ.FT`);
  assert(metrics.occupiedCapacitySqFt > 0, "Verify Metric: Occupied Capacity", `Occupied: ${metrics.occupiedCapacitySqFt} SQ.FT`);
  assert(metrics.reservedCapacitySqFt >= 0, "Verify Metric: Reserved Capacity", `Reserved: ${metrics.reservedCapacitySqFt} SQ.FT`);
  assert(metrics.availableCapacitySqFt > 0, "Verify Metric: Available Capacity", `Available: ${metrics.availableCapacitySqFt} SQ.FT`);
  assert(metrics.occupancyPercentage > 0, "Verify Metric: Occupancy Rate", `Rate: ${metrics.occupancyPercentage}%`);
  assert(metrics.activeAllocationsCount > 0, "Verify Metric: Active Storage Records", `Count: ${metrics.activeAllocationsCount}`);
  assert(metrics.totalInventoryItemsCount > 0, "Verify Metric: Inventory Packages", `Count: ${metrics.totalInventoryItemsCount}`);
  assert(metrics.pendingMovementsCount === 2, "Verify Metric: Pending Movements KPI (Dynamic)", `Pending Movements: ${metrics.pendingMovementsCount}`);
  assert(metrics.expiringDocumentsCount >= 0, "Verify Metric: Expiring Documents", `Count: ${metrics.expiringDocumentsCount}`);
  assert(metrics.expiredDocumentsCount >= 0, "Verify Metric: Expired Documents", `Count: ${metrics.expiredDocumentsCount}`);
  assert(metrics.expiringContractsCount >= 0, "Verify Metric: Contract Expiries", `Count: ${metrics.expiringContractsCount}`);
  assert(metrics.pendingInvoicesCount >= 0, "Verify Metric: Outstanding Invoices", `Count: ${metrics.pendingInvoicesCount}`);
  assert(metrics.overdueInvoicesCount >= 0, "Verify Metric: Overdue Invoices", `Count: ${metrics.overdueInvoicesCount}`);

  // --- 5. AI Recommendation Audit History ---
  console.log("\n--- 5. AI Recommendation Audit History ---");
  const testInput = {
    customerId: "cust-01",
    storageType: "RACK" as const,
    requiredCapacity: 300,
    capacityUnit: "SQ_FT" as const,
    startDate: "2026-11-01",
    expectedEndDate: "2027-10-31",
    preferredWarehouseId: "wh-001",
  };
  const newAlloc = await services.allocationService.createAllocationRequirement(testInput);
  await services.allocationService.confirmAllocation(newAlloc.id, newAlloc.locationId || "slot-open-2");

  const latestAuditEvents = await services.auditService.getAuditEvents();
  const aiAuditEvents = latestAuditEvents.filter((e) => e.metadata?.aiRecommended === true);
  assert(aiAuditEvents.length > 0, "Verify AI Recommendation Audit Trail Logged", `Found ${aiAuditEvents.length} AI-assisted allocation audit event(s)`);

  const topAIAudit = aiAuditEvents[0];
  assert(
    topAIAudit.metadata?.acceptedLocationId !== undefined && topAIAudit.metadata?.adminApproved === true,
    "Verify AI Audit Retains Recommendation & Admin Approval Metadata",
    `Accepted Location: ${topAIAudit.metadata?.acceptedLocationId}, Admin Approved: ${topAIAudit.metadata?.adminApproved}`
  );

  console.log("\n==================================================");
  console.log(`SYSTEM INTEGRATION UAT RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log("==================================================");

  if (passed < total) {
    process.exit(1);
  }
}

runFullSystemIntegrationUAT().catch((err) => {
  console.error("System Integration UAT Error:", err);
  process.exit(1);
});
