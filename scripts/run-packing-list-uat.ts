import { services } from "../src/server/script-registry";

async function runPackingListUatSuite() {
  console.log("==================================================");
  console.log("PROMPT 16: MOVEIT PACKING LIST, CATALOGUE & CBM UAT");
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

  // --- STEP 1: Item Catalogue Verification & Addition ---
  console.log("--- 1. Item Catalogue Verification & Addition ---");
  const catItems = await services.itemCatalogueService.getCatalogueItems();
  const sofaItem = catItems.find((c) => c.name === "3 Seater Sofa");
  assertTest(
    "Pre-populated Item Catalogue Contains Default MoveIt Items",
    catItems.length >= 70 && sofaItem !== undefined && sofaItem.defaultCbm === 1.5,
    `Found ${catItems.length} default items in catalogue. 3 Seater Sofa default CBM = ${sofaItem?.defaultCbm}.`
  );

  const newCatItem = await services.itemCatalogueService.addCatalogueItem(
    { name: "Executive L-Shaped Desk", defaultCbm: 2.2, category: "Office Furniture", isActive: true },
    "Super Admin"
  );
  assertTest(
    "Admin Can Add Custom Item to Catalogue",
    newCatItem.id !== undefined && newCatItem.defaultCbm === 2.2,
    `Added catalogue item '${newCatItem.name}' (${newCatItem.defaultCbm} CBM).`
  );

  // --- STEP 2: Create Packing List ---
  console.log("\n--- 2. Create Packing List ---");
  const pl = await services.packingListService.createPackingList(
    {
      header: {
        companyName: "Emirates Trading LLC",
        personName: "John Smith",
        mobileNo: "+971501234567",
        email: "john@emirates.com",
        jobTypes: ["Storage", "Local"],
        origin: "Dubai Marina",
        destination: "MoveIt Logistics Hub",
      },
      items: [
        { name: "3 Seater Sofa", cbm: 1.5, quantity: 2, disassemblyAssembly: "D/A" },
        { name: "King Bed", cbm: 2.7, quantity: 1, disassemblyAssembly: "D" },
      ],
    },
    "SUPER_ADMIN",
    "Admin User"
  );

  assertTest(
    "Create Packing List with Header & Items",
    pl.id !== undefined && pl.packingListNumber.startsWith("S.No.") && pl.status === "DRAFT",
    `Created '${pl.packingListNumber}' for ${pl.header.personName}. Status: ${pl.status}.`
  );

  // --- STEP 3 & 4: CBM Calculation Verification ---
  console.log("\n--- 3 & 4. CBM Calculation Verification ---");
  // 2 * 1.5 = 3.0, 1 * 2.7 = 2.7 => Total = 5.7 CBM
  assertTest(
    "Item Level & Total Packing List CBM Calculation",
    pl.summary.totalCbm === 5.7,
    `Calculated Total CBM = ${pl.summary.totalCbm} CBM (Expected: 5.70 CBM).`
  );

  // --- STEP 5: Add Custom Item ---
  console.log("\n--- 5. Add Custom Item ---");
  const updatedPL1 = await services.packingListService.updatePackingList(
    pl.id,
    {
      items: [
        ...pl.items,
        {
          id: `custom-1`,
          name: "Custom Heavy Sculpture",
          cbm: 1.3,
          quantity: 1,
          disassemblyAssembly: "N/A",
          additionalNotes: "Fragile marble",
          totalCbm: 1.3,
          isCustom: true,
        },
      ],
    },
    "SUPER_ADMIN",
    "Admin User"
  );

  assertTest(
    "Add Custom Heavy Item & Update CBM Total",
    updatedPL1.items.length === 3 && updatedPL1.summary.totalCbm === 7.0,
    `Added 'Custom Heavy Sculpture' (1.3 CBM). New Total CBM = ${updatedPL1.summary.totalCbm} CBM.`
  );

  // --- STEP 6 & 7: Team Leader Submit Extra Item ---
  console.log("\n--- 6 & 7. Team Leader Submit Extra Item ---");
  const extraItem = await services.packingListService.addExtraItem(
    pl.id,
    {
      name: "Unplanned Patio Dining Table",
      quantity: 1,
      cbm: 1.2,
      reason: "Found on site during pickup",
    },
    "STORAGE_OPERATOR",
    "Team Leader Ahmed"
  );

  assertTest(
    "Team Leader Submits Extra Item for Admin Review",
    extraItem.status === "PENDING_REVIEW" && extraItem.totalCbm === 1.2,
    `Submitted Extra Item '${extraItem.name}' (${extraItem.totalCbm} CBM). Status: PENDING_REVIEW.`
  );

  // --- STEP 8 & 9: Admin Review Extra Item & Quotation Alert ---
  console.log("\n--- 8 & 9. Admin Review Extra Item & Quotation Alert ---");
  const plAfterExtraApproved = await services.packingListService.reviewExtraItem(
    pl.id,
    extraItem.id,
    "APPROVE",
    "SUPER_ADMIN",
    "Storage Manager"
  );

  const notifications = await services.notificationService.getNotifications();
  const alertFound = notifications.some((n) => n.message.includes("Urgent quotation/storage requirement review required"));

  assertTest(
    "Admin Approves Extra Item & Generates Urgent Quotation Alert",
    plAfterExtraApproved.status === "REVISED" && alertFound && plAfterExtraApproved.summary.totalCbm === 8.2,
    `Extra item approved. New Packing CBM = ${plAfterExtraApproved.summary.totalCbm} CBM. Urgent quotation alert logged.`
  );

  // --- STEP 10: Approve Packing List ---
  console.log("\n--- 10. Approve Packing List ---");
  const approvedPL = await services.packingListService.approvePackingList(pl.id, "SUPER_ADMIN", "Admin User");

  assertTest(
    "Approve Packing List",
    approvedPL.status === "APPROVED" && approvedPL.approvedBy === "Admin User",
    `Packing List '${approvedPL.packingListNumber}' status set to APPROVED.`
  );

  // --- STEP 11 & 12: Team Leader Direct Modification Blocked ---
  console.log("\n--- 11 & 12. Team Leader Direct Modification Blocked ---");
  let tlBlockError = "";
  try {
    await services.packingListService.updatePackingList(
      pl.id,
      {
        header: { personName: "Illegal Edit" },
      },
      "STORAGE_OPERATOR",
      "Team Leader"
    );
  } catch (err: unknown) {
    tlBlockError = (err as Error).message;
  }

  assertTest(
    "Team Leader Modification on Approved List Blocked",
    tlBlockError.includes("Team Leaders cannot directly modify an approved Packing List"),
    `Direct edit blocked correctly: ${tlBlockError}`
  );

  // --- STEP 13 & 14: Authorized Revision & Version Preservation ---
  console.log("\n--- 13 & 14. Authorized Revision & Version Preservation ---");
  const revisedPL = await services.packingListService.revisePackingList(
    pl.id,
    {
      summary: { totalWorkingDays: "2" },
    },
    "Customer requested extra packing day",
    "SUPER_ADMIN",
    "Storage Manager"
  );

  assertTest(
    "Create Revision & Preserve Previous Versions",
    revisedPL.status === "REVISED" && revisedPL.versions.length >= 2,
    `Revised to version v${revisedPL.currentVersion}. Historical versions count = ${revisedPL.versions.length}.`
  );

  // --- STEP 15: Total CBM Verification ---
  console.log("\n--- 15. Total CBM Verification ---");
  assertTest(
    "Total CBM Equation Verification",
    revisedPL.summary.totalCbm === 8.2,
    `Final Total CBM = ${revisedPL.summary.totalCbm} CBM.`
  );

  // --- STEP 16: Existing Inventory/Storage Functionality Intact ---
  console.log("\n--- 16. Existing Inventory & Storage Functionality Intact ---");
  const warehouses = await services.warehouseService.getWarehouses();
  const customers = await services.customerService.getCustomers();

  assertTest(
    "Existing Core Warehouses & Customer Services Work Intact",
    warehouses.length > 0 && customers.length > 0,
    `Verified ${warehouses.length} warehouses and ${customers.length} customer records functioning without regressions.`
  );

  console.log("\n==================================================");
  console.log(`SUMMARY: Passed ${passCount} / ${totalTests} tests`);
  console.log("==================================================");

  if (passCount !== totalTests) {
    process.exit(1);
  }
}

runPackingListUatSuite().catch((err) => {
  console.error("UAT Suite Failed with Exception:", err);
  process.exit(1);
});
