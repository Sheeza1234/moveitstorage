import { services } from "../src/server/script-registry";

async function runE2EWorkflowTest() {
  console.log("==================================================");
  console.log("PROMPT 13: END-TO-END BUSINESS WORKFLOW VERIFICATION");
  console.log("==================================================\n");

  let passCount = 0;
  let totalTests = 0;

  function assertTest(description: string, condition: boolean, detail?: string) {
    totalTests++;
    if (condition) {
      passCount++;
      console.log(`  [PASS] ${description}`);
      if (detail) console.log(`         ↳ ${detail}`);
    } else {
      console.error(`  [FAIL] ${description}`);
      if (detail) console.error(`         ↳ ${detail}`);
    }
  }

  // --- Step 1: Customer Creation & Requirement Persist ---
  console.log("--- 1. Customer Creation & Storage Requirement ---");
  const newCust = await services.customerService.createCustomer({
    type: "CORPORATE",
    companyName: "Apex Logistics Tech FZ-LLC",
    email: "ops@apexlogistics.ae",
    phone: "+97148810099",
    address: "Dubai CommerCity, Building 4",
    city: "Dubai",
    country: "UAE",
    status: "ACTIVE",
    requiredSqFt: 500,
    storageStartDate: "2026-11-01",
    storageDurationMonths: 12,
    notes: "Requires high-security climate storage for tech server racks.",
  });

  assertTest(
    "Create Customer with Storage Requirements",
    Boolean(newCust.id && newCust.requiredSqFt === 500 && newCust.storageDurationMonths === 12),
    `Customer Code: ${newCust.code}, Required SQ.FT: ${newCust.requiredSqFt}`
  );

  // --- Step 2: Storage Requirement & AI Recommendation ---
  console.log("\n--- 2. Storage Requirement & AI Allocation ---");
  const reqAlloc = await services.allocationService.createAllocationRequirement({
    customerId: newCust.id,
    storageType: "SLOT",
    requiredCapacity: 250,
    capacityUnit: "SQ_FT",
    preferredWarehouseId: "wh-001",
    startDate: "2026-11-01",
    expectedEndDate: "2027-10-31",
    notes: "Server equipment rack placement",
  });

  assertTest(
    "Create Allocation Requirement & AI Recommendation",
    Boolean(reqAlloc.id && (reqAlloc.status === "RECOMMENDED" || reqAlloc.status === "PENDING_REVIEW")),
    `Alloc Code: ${reqAlloc.allocationCode}, Status: ${reqAlloc.status}, AI Rec: ${reqAlloc.aiRecommended}`
  );

  // --- Step 3: Block Unknown & BLOCKED Location Confirmations ---
  console.log("\n--- 3. Location Validation & Block Protection ---");
  let blockedUnknownCaught = false;
  try {
    await services.allocationService.confirmAllocation(reqAlloc.id, "invalid-slot-999");
  } catch (err: unknown) {
    blockedUnknownCaught = (err as Error).message.includes("does not exist");
  }

  assertTest(
    "Prevent Allocation Confirmation Against Unknown Location",
    blockedUnknownCaught,
    "Unknown location correctly BLOCKED."
  );

  // Find valid slot slot-101-c
  const validSlotId = "slot-101-c"; // Total 250, available 250
  const confirmAlloc = await services.allocationService.confirmAllocation(reqAlloc.id, validSlotId);

  assertTest(
    "Confirm Allocation Against Valid Physical Slot",
    confirmAlloc.status === "CONFIRMED" && confirmAlloc.locationId === validSlotId,
    `Confirmed at ${confirmAlloc.locationPath}`
  );

  // --- Step 4: Contract Creation & Document Upload ---
  console.log("\n--- 4. Storage Contract & Compliance Documents ---");
  const contract = await services.contractService.createContract({
    customerId: newCust.id,
    contractType: "CORPORATE_STORAGE",
    allocationIds: [confirmAlloc.id],
    startDate: "2026-11-01",
    endDate: "2027-10-31",
    storageRate: 150,
    rateUnit: "SQ_FT",
    billingFrequency: "MONTHLY",
    notes: "Annual corporate server storage contract",
  });

  assertTest(
    "Generate Storage Contract Linked to Customer & Allocation",
    Boolean(contract.id && contract.customerId === newCust.id),
    `Contract Code: ${contract.contractCode}, Type: ${contract.contractType}`
  );

  const doc = await services.documentService.uploadDocumentMetadata({
    customerId: newCust.id,
    contractId: contract.id,
    documentType: "SIGNED_CONTRACT",
    title: "Signed Storage Agreement — Apex Logistics",
    fileName: "signed_contract_apex.pdf",
    fileType: "application/pdf",
    fileSize: 2048000,
    issueDate: "2026-10-06",
    uploadedBy: "Compliance Specialist",
  });

  assertTest(
    "Upload Storage Agreement Compliance Document",
    doc.status === "UPLOADED" && doc.customerId === newCust.id,
    `Doc Code: ${doc.documentCode}`
  );

  const approvedDoc = await services.documentService.updateDocumentStatus(doc.id, "APPROVED");
  assertTest(
    "Approve Compliance Document",
    approvedDoc.status === "APPROVED",
    "Document status updated to APPROVED."
  );

  // --- Step 5: Physical Inventory Intake & Reserved -> Occupied Transition ---
  console.log("\n--- 5. Inventory Intake & Reserved -> Occupied Transition ---");
  const invRecord = await services.inventoryService.recordItemsIn({
    customerId: newCust.id,
    allocationId: confirmAlloc.id,
    warehouseId: "wh-001",
    locationId: validSlotId,
    packageType: "CRATE",
    itemCount: 100,
    capacityFootprintSqFt: 200,
    capacityUnit: "SQ_FT",
    description: "Climate-Controlled Server Hardware Crates",
    items: [
      { name: "Blade Server Module A", quantity: 50 },
      { name: "Blade Server Module B", quantity: 50 },
    ],
    notes: "Intake verified by shift supervisor.",
  });

  assertTest(
    "Execute Physical Items In Intake",
    invRecord.status === "IN_STORAGE" && invRecord.itemCount === 100,
    `Inventory Code: ${invRecord.inventoryCode}, Pkg ID: ${invRecord.packageId}`
  );

  const updatedAlloc = await services.allocationService.getAllocationById(confirmAlloc.id);
  assertTest(
    "Allocation Status Updates to ACTIVE on Physical Intake",
    updatedAlloc?.status === "ACTIVE",
    `Allocation Status: ${updatedAlloc?.status}`
  );

  // --- Step 6: Billing & Payment Processing ---
  console.log("\n--- 6. Billing & Payment Processing ---");
  const invoice = await services.billingService.createInvoice({
    customerId: newCust.id,
    contractId: contract.id,
    billingPeriodStart: "2026-11-01",
    billingPeriodEnd: "2026-11-30",
    issueDate: "2026-10-06",
    dueDate: "2026-11-15",
    lineItems: [
      {
        description: "Monthly Storage Rental (200 SQ.FT @ 150 AED/SQ.FT/YR)",
        quantity: 1,
        unit: "MONTH",
        unitRate: 2500,
        allocationId: confirmAlloc.id,
      },
    ],
    notes: "First month storage invoice",
  });

  assertTest(
    "Create Storage Invoice (DRAFT)",
    invoice.status === "DRAFT" && invoice.totalAmount > 0,
    `Invoice: ${invoice.invoiceNumber}, Total Amount: AED ${invoice.totalAmount}`
  );

  const issuedInv = await services.billingService.issueInvoice(invoice.id);
  assertTest(
    "Issue Invoice to Customer",
    issuedInv.status === "ISSUED",
    `Invoice Status: ${issuedInv.status}`
  );

  // Partial Payment
  const partialPayInv = await services.billingService.recordPayment({
    invoiceId: issuedInv.id,
    amount: 1000,
    paymentDate: "2026-10-06",
    paymentMethod: "BANK_TRANSFER",
    referenceNumber: "TXN-998811",
  });

  assertTest(
    "Record Partial Invoice Payment",
    partialPayInv.status === "PARTIALLY_PAID" && partialPayInv.balanceDue > 0,
    `Amount Paid: AED ${partialPayInv.amountPaid}, Balance Due: AED ${partialPayInv.balanceDue}`
  );

  // Overpayment Protection Test
  let overpayBlocked = false;
  try {
    await services.billingService.recordPayment({
      invoiceId: issuedInv.id,
      amount: 5000, // Exceeds balance
      paymentDate: "2026-10-06",
      paymentMethod: "BANK_TRANSFER",
    });
  } catch (err: unknown) {
    overpayBlocked = (err as Error).message.includes("exceeds outstanding balance");
  }

  assertTest(
    "Prevent Invoice Overpayment",
    overpayBlocked,
    "Overpayment correctly rejected by billing validation."
  );

  // --- Step 7: Internal Inventory Movement ---
  console.log("\n--- 7. Internal Location Movement ---");
  const targetMoveSlotId = "slot-open-2"; // Valid slot with 500 SQ.FT available
  const movedInv = await services.inventoryService.moveInventory({
    inventoryId: invRecord.id,
    toWarehouseId: "wh-001",
    toLocationId: targetMoveSlotId,
    reason: "Optimizing climate rack space distribution",
  });

  assertTest(
    "Move Physical Inventory to Target Location",
    movedInv.locationId === targetMoveSlotId,
    `New Location Path: ${movedInv.locationPath}`
  );

  const moves = await services.movementService.getInventoryMovements(invRecord.id);
  assertTest(
    "Verify Movement History Logged",
    moves.length >= 2,
    `Movement Log Count: ${moves.length}`
  );

  // --- Step 8: Partial & Full Inventory Release ---
  console.log("\n--- 8. Partial & Full Inventory Release ---");
  const partRelease = await services.inventoryService.recordItemsOut({
    inventoryId: invRecord.id,
    releaseQuantity: 40,
    reason: "Partial withdrawal requested by client.",
  });

  assertTest(
    "Partial Inventory Release (40/100 items)",
    partRelease.status === "PARTIALLY_RELEASED" && partRelease.releasedItemCount === 40,
    `Remaining stored items: ${partRelease.itemCount - (partRelease.releasedItemCount || 0)}`
  );

  // Over-Release Protection Test
  let overReleaseBlocked = false;
  try {
    await services.inventoryService.recordItemsOut({
      inventoryId: invRecord.id,
      releaseQuantity: 999,
      reason: "Invalid bulk release test",
    });
  } catch (err: unknown) {
    overReleaseBlocked = (err as Error).message.includes("Cannot release");
  }

  assertTest(
    "Prevent Over-Release of Stored Inventory",
    overReleaseBlocked,
    "Over-release attempt blocked."
  );

  // Complete Invoice Payment
  const finalPayInv = await services.billingService.recordPayment({
    invoiceId: issuedInv.id,
    amount: partialPayInv.balanceDue,
    paymentDate: "2026-10-06",
    paymentMethod: "CREDIT_CARD",
  });

  assertTest(
    "Complete Remaining Balance Payment",
    finalPayInv.status === "PAID" && finalPayInv.balanceDue === 0,
    `Final Status: ${finalPayInv.status}`
  );

  // Full Inventory Release
  const fullRelease = await services.inventoryService.recordItemsOut({
    inventoryId: invRecord.id,
    releaseQuantity: 60, // Remaining 60 items
    reason: "Final release of project inventory.",
  });

  assertTest(
    "Full Inventory Release (Remaining 60 items)",
    fullRelease.status === "RELEASED" && fullRelease.releasedItemCount === 100,
    `Status: ${fullRelease.status}`
  );

  // --- Step 9: Allocation Release & Account Closure ---
  console.log("\n--- 9. Allocation Release & Customer Deactivation ---");
  const relAlloc = await services.allocationService.releaseAllocation(confirmAlloc.id);
  assertTest(
    "Release Storage Allocation & Free Capacity",
    relAlloc.status === "RELEASED",
    `Allocation Status: ${relAlloc.status}`
  );

  const deactivatedCust = await services.customerService.updateCustomer(newCust.id, {
    status: "INACTIVE",
  });

  assertTest(
    "Deactivate Customer Account",
    deactivatedCust.status === "INACTIVE",
    `Customer Status: ${deactivatedCust.status}`
  );

  // Historical Record Protection Audit
  const custAllocations = (await services.allocationService.getAllocations()).filter(a => a.customerId === newCust.id);
  const custInvoices = await services.billingService.getCustomerInvoices(newCust.id);
  const custDocs = await services.documentService.getCustomerDocuments(newCust.id);
  const custAuditLogs = await services.auditService.getAuditEventsByEntity("CUSTOMER", newCust.id);

  assertTest(
    "Preserve All Historical Records Post Customer Deactivation",
    Boolean(custAllocations.length > 0 && custInvoices.length > 0 && custDocs.length > 0),
    `Preserved: ${custAllocations.length} alloc, ${custInvoices.length} inv, ${custDocs.length} docs, ${custAuditLogs.length} audit logs`
  );

  console.log("\n==================================================");
  console.log(`END-TO-END WORKFLOW RESULTS: ${passCount}/${totalTests} TESTS PASSED`);
  console.log("==================================================");

  if (passCount !== totalTests) {
    process.exit(1);
  }
}

runE2EWorkflowTest().catch((err) => {
  console.error("E2E Test Execution Error:", err);
  process.exit(1);
});
