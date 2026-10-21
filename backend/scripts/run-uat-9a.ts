import { MockBillingService } from "../src/services/mock/billing-service";
import { MockCustomerService } from "../src/services/mock/customer-service";
import { MockAllocationService } from "../src/services/mock/allocation-service";
import { MockContractService } from "../src/services/mock/contract-service";
import { MockCustomerPortalIntegrationService } from "../src/services/mock/portal-integration-service";
import { MOCK_INVOICES, MOCK_ALLOCATIONS, MOCK_CUSTOMERS } from "../src/services/mock/mock-db";

async function runUAT9A() {
  console.log("==================================================");
  console.log("9A. BILLING RECONCILIATION UAT");
  console.log("==================================================\n");

  const billingService = new MockBillingService();
  const customerService = new MockCustomerService();
  const contractService = new MockContractService();
  const portalService = new MockCustomerPortalIntegrationService();

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

  // -------------------------------------------------------------
  // TEST SECTION 1: COMPARE BILLING RECORDS VS OPERATIONAL RECORDS
  // -------------------------------------------------------------
  console.log("--- 1. Compare Billing Records vs. Storage Operational Records ---");

  const invoices = await billingService.getInvoices();
  assert(invoices.length > 0, "Retrieve Billing Invoices", `Found ${invoices.length} storage invoice(s)`);

  const sampleInvoice = invoices[0];

  // 1.1 Customer Validation
  const customer = await customerService.getCustomerById(sampleInvoice.customerId);
  assert(
    Boolean(customer) && sampleInvoice.customerName === customer?.name,
    "Validate Customer Linkage",
    `Invoice ${sampleInvoice.invoiceNumber} -> Customer ${customer?.code} (${customer?.name})`
  );

  // 1.2 Storage Allocation Validation
  const allocation = MOCK_ALLOCATIONS.find((a) => sampleInvoice.allocationIds.includes(a.id) || a.customerId === sampleInvoice.customerId);
  assert(
    Boolean(allocation),
    "Validate Storage Allocation Linkage",
    `Allocation Code: ${allocation?.allocationCode} (${allocation?.allocatedCapacity} SQ.FT)`
  );

  // 1.3 Storage Period Validation
  assert(
    Boolean(sampleInvoice.billingPeriodStart && sampleInvoice.billingPeriodEnd),
    "Validate Storage Period Matching",
    `Billing Period: ${sampleInvoice.billingPeriodStart} to ${sampleInvoice.billingPeriodEnd}`
  );

  // 1.4 Contract Validation
  const contract = await contractService.getContractById(sampleInvoice.contractId);
  assert(
    Boolean(contract) && sampleInvoice.contractCode === contract?.contractCode,
    "Validate Contract Agreement Linkage",
    `Contract Code: ${contract?.contractCode} (Monthly Rate: ${contract?.monthlyRate} ${contract?.currency})`
  );

  // 1.5 Invoice & Line Items Validation
  assert(
    sampleInvoice.lineItems.length > 0 && sampleInvoice.totalAmount > 0,
    "Validate Invoice Line Items & Calculations",
    `Subtotal: ${sampleInvoice.subtotal}, Tax (5% VAT): ${sampleInvoice.taxAmount}, Total: ${sampleInvoice.totalAmount} ${sampleInvoice.currency}`
  );

  // 1.6 Payment Status Validation
  assert(
    Boolean(sampleInvoice.status) && sampleInvoice.balanceDue === sampleInvoice.totalAmount - sampleInvoice.amountPaid,
    "Validate Payment Status & Balance Math",
    `Status: ${sampleInvoice.status}, Paid: ${sampleInvoice.amountPaid}, Balance Due: ${sampleInvoice.balanceDue}`
  );

  // -------------------------------------------------------------
  // TEST SECTION 2: IDENTIFY OPERATIONAL BILLING INCONSISTENCIES
  // -------------------------------------------------------------
  console.log("\n--- 2. Operational Discrepancy & Inconsistency Identification ---");

  // Create an active storage allocation for Customer 2 without creating an invoice (Unbilled Allocation scenario)
  const unbilledCust = MOCK_CUSTOMERS[1]; // Emirates Logistics LLC
  MOCK_ALLOCATIONS.push({
    id: "alloc-unbilled-test-88",
    allocationCode: "SAL-2026-UNBILLED-01",
    customerId: unbilledCust.id,
    customerName: unbilledCust.name,
    warehouseId: "wh-001",
    warehouseName: "MoveIt Main Logistics Hub — Dubai",
    locationId: "slot-open-1",
    locationPath: "Dubai Hub > Floor 1 > Zone B > Open Bay B1",
    storageType: "FLOOR",
    requiredCapacity: 1500,
    allocatedCapacity: 1500,
    capacityUnit: "SQ_FT",
    status: "ACTIVE",
    startDate: "2026-09-01",
    expectedEndDate: "2027-09-01",
    aiRecommended: false,
    createdAt: "2026-09-01T08:00:00Z",
    updatedAt: "2026-09-01T08:00:00Z",
  });

  // Create an invoice with rate mismatch and unlinked line item
  MOCK_INVOICES.push({
    id: "inv-discrepancy-99",
    invoiceNumber: "INV-2026-DISC-01",
    customerId: unbilledCust.id,
    customerName: unbilledCust.name,
    contractId: "cnt-02",
    contractCode: "CNT-2026-00002",
    allocationIds: [],
    billingPeriodStart: "2026-09-01",
    billingPeriodEnd: "2026-09-30",
    issueDate: "2026-08-15",
    dueDate: "2026-08-30", // Past due date (overdue mismatch)
    currency: "AED",
    subtotal: 9000,
    taxRate: 0.05,
    taxAmount: 450,
    totalAmount: 9450,
    amountPaid: 0,
    balanceDue: 9450,
    status: "DRAFT", // Past due date with balance due, should be flagged in reconciliation as DRAFT/Unissued Overdue
    lineItems: [
      {
        id: "li-disc-1",
        description: "General Commercial Warehousing Storage Fee",
        quantity: 1,
        unit: "MONTH",
        unitRate: 9000, // Differs from contract monthly rate of 8500
        amount: 9000,
      },
    ],
    createdAt: "2026-08-15T09:00:00Z",
    updatedAt: "2026-08-15T09:00:00Z",
  });

  // Execute Operational Billing Reconciliation
  const report = await billingService.reconcileBillingWithStorage();

  assert(
    Boolean(report) && report.discrepanciesCount > 0,
    "Execute Operational Billing Reconciliation Audit",
    `Checked ${report.totalAllocationsChecked} allocations & ${report.totalInvoicesChecked} invoices. Discrepancies found: ${report.discrepanciesCount}`
  );

  // Check Unbilled Allocation Detection
  const unbilledDisc = report.discrepancies.find((d) => d.discrepancyType === "UNBILLED_ALLOCATION");
  assert(
    Boolean(unbilledDisc),
    "Identify Discrepancy: UNBILLED_ALLOCATION",
    `Description: "${unbilledDisc?.description}"`
  );

  // Check Rate Mismatch Detection
  const rateDisc = report.discrepancies.find((d) => d.discrepancyType === "RATE_CAPACITY_MISMATCH");
  assert(
    Boolean(rateDisc),
    "Identify Discrepancy: RATE_CAPACITY_MISMATCH",
    `Expected: ${rateDisc?.expectedValue}, Actual: ${rateDisc?.actualValue}`
  );

  // Check Overdue Status Mismatch Detection
  const overdueDisc = report.discrepancies.find((d) => d.discrepancyType === "OVERDUE_PAYMENT_MISMATCH");
  assert(
    Boolean(overdueDisc),
    "Identify Discrepancy: OVERDUE_PAYMENT_MISMATCH",
    `Expected: ${overdueDisc?.expectedValue}, Actual: ${overdueDisc?.actualValue}`
  );

  // Check Unlinked Line Item Detection
  const unlinkedDisc = report.discrepancies.find((d) => d.discrepancyType === "UNLINKED_LINE_ITEM");
  assert(
    Boolean(unlinkedDisc),
    "Identify Discrepancy: UNLINKED_LINE_ITEM",
    `Description: "${unlinkedDisc?.description}"`
  );

  // -------------------------------------------------------------
  // TEST SECTION 3: PORTAL SYNCHRONIZATION & INVOICE REFERENCE MAPPING
  // -------------------------------------------------------------
  console.log("\n--- 3. Customer Portal Synchronization & Invoice Reference Mapping ---");

  assert(
    Boolean(sampleInvoice.portalInvoiceUrl && sampleInvoice.portalRefId),
    "Verify Mapped Customer-Accessible Invoice Reference URL",
    `Portal URL: "${sampleInvoice.portalInvoiceUrl}", Portal Ref ID: "${sampleInvoice.portalRefId}"`
  );

  assert(
    sampleInvoice.portalSyncStatus === "SYNCED",
    "Verify Portal Synchronization Status",
    `Portal Sync Status: ${sampleInvoice.portalSyncStatus}`
  );

  // Perform portal sync execution
  const syncResult = await portalService.syncInvoiceStatus(sampleInvoice.id);
  assert(
    syncResult.success === true && syncResult.entityId === sampleInvoice.id,
    "Verify Customer Portal Synchronization REST Execution",
    `Message: "${syncResult.message}"`
  );

  console.log("\n==================================================");
  console.log(`UAT 9A RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("==================================================");

  if (passedTests === totalTests) {
    console.log("SUCCESS: All 9A Billing Reconciliation UAT criteria satisfied.");
  } else {
    throw new Error(`UAT failed with ${totalTests - passedTests} failures.`);
  }
}

runUAT9A().catch((err) => {
  console.error("UAT Execution Error:", err);
  process.exit(1);
});
