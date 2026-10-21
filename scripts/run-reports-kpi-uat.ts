import { services } from "../src/server/script-registry";

async function runReportsAndKPIUAT() {
  console.log("==================================================");
  console.log("PROMPT 11: DASHBOARD KPI & OPERATIONAL REPORTS UAT");
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

  // --- 1. Pending Movements Dashboard KPI ---
  console.log("--- 1. Pending Movements Dashboard KPI Verification ---");
  const metricsGlobal = await services.dashboardService.getMetrics("ALL");
  assert(typeof metricsGlobal.pendingMovementsCount === "number", "Verify pendingMovementsCount property on DashboardMetrics", `Value: ${metricsGlobal.pendingMovementsCount}`);
  assert(metricsGlobal.pendingMovementsCount === 2, "Verify dynamic count of pending movements (Global)", `Global Pending Movements: ${metricsGlobal.pendingMovementsCount}`);

  const metricsWH1 = await services.dashboardService.getMetrics("wh-001");
  assert(metricsWH1.pendingMovementsCount === 1, "Verify facility filtering for pending movements KPI (wh-001)", `wh-001 Pending Movements: ${metricsWH1.pendingMovementsCount}`);

  const metricsWH2 = await services.dashboardService.getMetrics("wh-002");
  assert(metricsWH2.pendingMovementsCount === 1, "Verify facility filtering for pending movements KPI (wh-002)", `wh-002 Pending Movements: ${metricsWH2.pendingMovementsCount}`);

  // --- 2. Operational Reports Service Abstractions ---
  console.log("\n--- 2. Operational Reporting Data Integrity & Service Layer Audit ---");
  const [customers, warehouses, allocations, inventory, movements, documents, contracts, invoices] = await Promise.all([
    services.customerService.getCustomers(),
    services.warehouseService.getWarehouses(),
    services.allocationService.getAllocations(),
    services.inventoryService.getInventoryRecords(),
    services.movementService.getMovements(),
    services.documentService.getDocuments(),
    services.contractService.getContracts(),
    services.billingService.getInvoices(),
  ]);

  assert(customers.length > 0, "Retrieve Customer Storage Records", `Found ${customers.length} customer records`);
  assert(warehouses.length > 0, "Retrieve Warehouse Capacity Records", `Found ${warehouses.length} warehouse records`);
  assert(allocations.length > 0, "Retrieve Storage Allocations Records", `Found ${allocations.length} allocation records`);
  assert(inventory.length > 0, "Retrieve Stored Inventory Records", `Found ${inventory.length} inventory records`);
  assert(movements.length > 0, "Retrieve Movement Logs Records", `Found ${movements.length} movement records`);
  assert(documents.length > 0, "Retrieve Compliance Document Records", `Found ${documents.length} document records`);
  assert(contracts.length > 0, "Retrieve Storage Contract Records", `Found ${contracts.length} contract records`);
  assert(invoices.length > 0, "Retrieve Billing & Invoice Records", `Found ${invoices.length} invoice records`);

  // --- 3. Report Filtering Verification ---
  console.log("\n--- 3. Report Filtering Verification ---");
  const activeAllocations = allocations.filter((a) => a.status === "CONFIRMED" || a.status === "ACTIVE");
  assert(activeAllocations.length > 0, "Filter Allocations by Status (ACTIVE/CONFIRMED)", `Found ${activeAllocations.length} active/confirmed allocations`);

  const pendingMovementsList = movements.filter((m) => m.status === "PENDING");
  assert(pendingMovementsList.length === 2, "Filter Movements by Status (PENDING)", `Found ${pendingMovementsList.length} pending movement records`);

  const overdueInvoicesList = invoices.filter((i) => i.status === "OVERDUE");
  assert(overdueInvoicesList.length > 0, "Filter Invoices by Status (OVERDUE)", `Found ${overdueInvoicesList.length} overdue invoices`);

  const expiringContractsList = contracts.filter((c) => c.status === "EXPIRING_SOON" || c.status === "EXPIRED");
  assert(expiringContractsList.length > 0, "Filter Contracts by Expiry Status", `Found ${expiringContractsList.length} expiring/expired contract(s)`);

  // --- 4. CSV Export Capability Verification ---
  console.log("\n--- 4. CSV Export Capability Verification ---");
  const headers = ["Movement Code", "Package Code", "Customer Name", "Status"];
  const rows = pendingMovementsList.map((m) => [m.movementCode, m.packageCode, m.customerName, m.status]);
  
  const escapeCell = (cell: unknown) => `"${String(cell ?? "").replace(/"/g, '""')}"`;
  const csvContent = [headers.map(escapeCell).join(","), ...rows.map((r) => r.map(escapeCell).join(","))].join("\n");
  
  assert(csvContent.includes('"MOV-2026-00003"') && csvContent.includes('"PENDING"'), "Verify CSV Export String Formatting", "CSV payload correctly formatted with proper quoting");

  console.log("\n==================================================");
  console.log(`REPORTS & KPI UAT RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log("==================================================");

  if (passed < total) {
    process.exit(1);
  }
}

runReportsAndKPIUAT().catch((err) => {
  console.error("UAT Error:", err);
  process.exit(1);
});
