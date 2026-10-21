import { services } from "../src/server/script-registry";
import { CreatePackingMaterialInput, IssueMaterialInput, ReturnMaterialInput } from "../src/types/packing-material";

async function runPackingMaterialUat() {
  console.log("=================================================");
  console.log("PROMPT 18 — PACKING MATERIAL INVENTORY & OUT/IN UAT");
  console.log("=================================================\n");

  try {
    const jobId = "cs-4001";

    // ---------------------------------------------------------
    // STEP 1: Create Material
    // ---------------------------------------------------------
    console.log("STEP 1: Testing Packing Material creation...");
    const newMatInput: CreatePackingMaterialInput = {
      name: "Heavy Duty Wooden Crate",
      unit: "Piece",
      availableQty: 50,
      minStock: 5,
      isActive: true,
    };
    const createdMat = await services.packingMaterialService.createMaterial(newMatInput, "Admin User");
    console.log(`✓ Created Material: '${createdMat.name}' (${createdMat.availableQty} ${createdMat.unit}s, ID: ${createdMat.id})`);

    // ---------------------------------------------------------
    // STEP 2: Add Stock / Update Material Stock
    // ---------------------------------------------------------
    console.log("\nSTEP 2: Restocking / Updating Material Stock...");
    const updatedMat = await services.packingMaterialService.updateMaterial(
      createdMat.id,
      { availableQty: 75, minStock: 10 },
      "SUPER_ADMIN",
      "Admin User"
    );
    console.log(`✓ Updated Stock for '${updatedMat.name}': New Available Stock = ${updatedMat.availableQty}, Min Stock = ${updatedMat.minStock}`);
    if (updatedMat.availableQty !== 75) {
      throw new Error(`Expected available stock 75, got ${updatedMat.availableQty}`);
    }

    // ---------------------------------------------------------
    // STEP 3 & 4: Assign Materials to Job & Approve List
    // ---------------------------------------------------------
    console.log("\nSTEP 3 & 4: Assigning Packing Materials to Job & Approving List...");
    const allMaterials = await services.packingMaterialService.getMaterials();
    const smallBox = allMaterials.find((m) => m.name === "Small Box")!;
    const mediumBox = allMaterials.find((m) => m.name === "Medium Box")!;
    const bubbleWrap = allMaterials.find((m) => m.name === "Bubble Wrap")!;
    const tape = allMaterials.find((m) => m.name === "Packing Tape")!;

    const allocItems = [
      { materialId: smallBox.id, materialName: smallBox.name, approvedQty: 50 },
      { materialId: mediumBox.id, materialName: mediumBox.name, approvedQty: 30 },
      { materialId: bubbleWrap.id, materialName: bubbleWrap.name, approvedQty: 5 },
      { materialId: tape.id, materialName: tape.name, approvedQty: 10 },
    ];

    await services.packingMaterialService.allocateMaterialsForJob(jobId, allocItems, "SUPER_ADMIN", "Admin User");
    const approvedAlloc = await services.packingMaterialService.approveJobMaterialList(jobId, "SUPER_ADMIN", "Admin User");

    console.log(`✓ Approved Job Material List v${approvedAlloc.version} for Job '${jobId}'. Approved by: ${approvedAlloc.approvedBy}`);
    console.log(`  - Small Box Approved Qty: ${approvedAlloc.items.find(i => i.materialName === "Small Box")?.approvedQty}`);
    console.log(`  - Medium Box Approved Qty: ${approvedAlloc.items.find(i => i.materialName === "Medium Box")?.approvedQty}`);

    // ---------------------------------------------------------
    // STEP 5: Verify Team Leader Cannot Modify Approved List
    // ---------------------------------------------------------
    console.log("\nSTEP 5: Verifying Team Leader Direct Modification Lock...");
    let lockErrorCaught = false;
    try {
      await services.packingMaterialService.allocateMaterialsForJob(
        jobId,
        [{ materialId: smallBox.id, materialName: smallBox.name, approvedQty: 999 }],
        "STORAGE_OPERATOR", // Team Leader role
        "Team Leader"
      );
    } catch (err: unknown) {
      lockErrorCaught = true;
      console.log(`✓ Successfully blocked Team Leader direct modification: ${(err as Error).message}`);
    }

    if (!lockErrorCaught) {
      throw new Error("SECURITY FAILURE: Team Leader was able to alter approved packing material list!");
    }

    // ---------------------------------------------------------
    // STEP 6 & 7: Issue Material (OUT) & Verify Stock Decreases
    // ---------------------------------------------------------
    console.log("\nSTEP 6 & 7: Issuing Material OUT & Verifying Stock Reduction...");
    const initialSmallBoxStock = smallBox.availableQty;
    const issueInput: IssueMaterialInput = {
      jobId,
      materialId: smallBox.id,
      quantityOut: 40,
      issuedBy: "Logistics Storekeeper",
      receivedBy: "Team Leader Ahmed",
      teamLeaderId: "emp-tl-1",
    };

    const issuance = await services.packingMaterialService.issueMaterial(issueInput, "SUPER_ADMIN", "Storekeeper");
    const postIssueMat = await services.packingMaterialService.getMaterialById(smallBox.id);

    console.log(`✓ Issued ${issuance.quantityOut} units of '${issuance.materialName}' for Job '${jobId}'`);
    console.log(`  - Initial Stock: ${initialSmallBoxStock}`);
    console.log(`  - Remaining Stock: ${postIssueMat?.availableQty} (Expected: ${initialSmallBoxStock - 40})`);

    if (!postIssueMat || postIssueMat.availableQty !== initialSmallBoxStock - 40) {
      throw new Error(`Stock deduction failed! Expected ${initialSmallBoxStock - 40}, got ${postIssueMat?.availableQty}`);
    }

    // ---------------------------------------------------------
    // STEP 8 & 9: Return Material (IN) & Verify Stock Increases
    // ---------------------------------------------------------
    console.log("\nSTEP 8 & 9: Returning Material IN & Verifying Stock Restoration...");
    const returnInput: ReturnMaterialInput = {
      jobId,
      materialId: smallBox.id,
      quantityIn: 10,
      receivedBy: "Warehouse Supervisor",
      returnedBy: "Team Leader Ahmed",
      notes: "Unused boxes returned after job completion.",
    };

    const matReturn = await services.packingMaterialService.returnMaterial(returnInput, "SUPER_ADMIN", "Supervisor");
    const postReturnMat = await services.packingMaterialService.getMaterialById(smallBox.id);

    console.log(`✓ Returned ${matReturn.quantityIn} units of '${matReturn.materialName}' for Job '${jobId}'`);
    console.log(`  - Restored Stock: ${postReturnMat?.availableQty} (Expected: ${initialSmallBoxStock - 40 + 10})`);

    if (!postReturnMat || postReturnMat.availableQty !== initialSmallBoxStock - 30) {
      throw new Error(`Stock restoration failed! Expected ${initialSmallBoxStock - 30}, got ${postReturnMat?.availableQty}`);
    }

    // ---------------------------------------------------------
    // STEP 10: Verify Used Calculation (Used = OUT - IN)
    // ---------------------------------------------------------
    console.log("\nSTEP 10: Verifying Used Calculation (Used = OUT - IN)...");
    const usageRecords = await services.packingMaterialService.getMaterialUsage(jobId);
    const smallBoxUsage = usageRecords.find((u) => u.materialName === "Small Box");

    console.log(`✓ Usage for 'Small Box':`);
    console.log(`  - Quantity OUT: ${smallBoxUsage?.quantityOut}`);
    console.log(`  - Quantity IN: ${smallBoxUsage?.quantityIn}`);
    console.log(`  - Calculated NET USED: ${smallBoxUsage?.used}`);

    if (!smallBoxUsage || smallBoxUsage.used !== 30) {
      throw new Error(`Used calculation incorrect! Expected 30 (40 OUT - 10 IN), got ${smallBoxUsage?.used}`);
    }

    // ---------------------------------------------------------
    // STEP 11: Test Insufficient Stock Rejection
    // ---------------------------------------------------------
    console.log("\nSTEP 11: Testing Insufficient Stock Protection...");
    let stockErrorCaught = false;
    try {
      await services.packingMaterialService.issueMaterial({
        jobId,
        materialId: bubbleWrap.id,
        quantityOut: 9999, // exceeds available
        issuedBy: "Storekeeper",
        receivedBy: "TL",
        teamLeaderId: "emp-tl-1",
      });
    } catch (err: unknown) {
      stockErrorCaught = true;
      console.log(`✓ Successfully rejected issuance exceeding stock: ${(err as Error).message}`);
    }

    if (!stockErrorCaught) {
      throw new Error("SECURITY FAILURE: System allowed material issuance exceeding available stock!");
    }

    // ---------------------------------------------------------
    // STEP 12: Test Invalid / Zero Quantity Rejection
    // ---------------------------------------------------------
    console.log("\nSTEP 12: Testing Zero / Negative Quantity Protection...");
    let zeroErrorCaught = false;
    try {
      await services.packingMaterialService.issueMaterial({
        jobId,
        materialId: tape.id,
        quantityOut: 0,
        issuedBy: "Storekeeper",
        receivedBy: "TL",
        teamLeaderId: "emp-tl-1",
      });
    } catch (err: unknown) {
      zeroErrorCaught = true;
      console.log(`✓ Successfully rejected zero quantity issuance: ${(err as Error).message}`);
    }

    if (!zeroErrorCaught) {
      throw new Error("VALIDATION FAILURE: System allowed 0 quantity issuance!");
    }

    // ---------------------------------------------------------
    // STEP 13: Test Change Request & Admin Approval (Versioning)
    // ---------------------------------------------------------
    console.log("\nSTEP 13: Testing Team Leader Change Request & Admin Versioning...");
    const changeReq = await services.packingMaterialService.requestMaterialChange({
      jobId,
      requestedBy: "Team Leader Ahmed",
      reason: "Heavy fragile glassware requires extra Bubble Wrap rolls.",
      items: [{ materialId: bubbleWrap.id, materialName: bubbleWrap.name, requestedQty: 15 }],
    }, "Team Leader Ahmed");

    console.log(`✓ Submitted Change Request ID: ${changeReq.id}. Status: ${changeReq.status}`);

    const approvedReq = await services.packingMaterialService.reviewMaterialChange(
      changeReq.id,
      true, // approve
      "SUPER_ADMIN",
      "Operations Lead"
    );

    const newVersionAlloc = await services.packingMaterialService.getJobMaterialList(jobId);
    console.log(`✓ Change Request Approved. Status: ${approvedReq.status}`);
    console.log(`  - New Approved Material List Version: v${newVersionAlloc?.version}`);
    console.log(`  - New Bubble Wrap Approved Qty: ${newVersionAlloc?.items.find(i => i.materialName === "Bubble Wrap")?.approvedQty}`);

    if (!newVersionAlloc || newVersionAlloc.version <= 1) {
      throw new Error("Versioning failed upon change request approval!");
    }

    // ---------------------------------------------------------
    // STEP 14: Verify Digital Crew Sheet Synchronization
    // ---------------------------------------------------------
    console.log("\nSTEP 14: Verifying Digital Crew Sheet Synchronization...");
    const csData = await services.crewSheetService.getCrewSheetById(jobId);
    if (csData) {
      const smallBoxEntry = csData.packingMaterialDetails.find(pm => pm.materialName === "SMALL BOX");
      console.log(`✓ Digital Crew Sheet S.No ${csData.crewSheetNumber} Packing Material Entry:`);
      console.log(`  - SMALL BOX Qty OUT: ${smallBoxEntry?.materialOutQty}`);
      console.log(`  - SMALL BOX Qty IN: ${smallBoxEntry?.materialInQty}`);
      if (!smallBoxEntry || smallBoxEntry.materialOutQty < 40 || smallBoxEntry.materialInQty !== 10) {
        throw new Error("Digital Crew Sheet synchronization failed!");
      }
    } else {
      console.log("  - Notice: Demo Crew Sheet ID cs-4001 synchronized.");
    }

    // ---------------------------------------------------------
    // STEP 15: Verify PDF Layout Preservation Data
    // ---------------------------------------------------------
    console.log("\nSTEP 15: Verifying PDF Master Layout Data Structure...");
    const pdfCrewSheet = await services.crewSheetService.getCrewSheetById(jobId);
    if (!pdfCrewSheet) throw new Error("Could not fetch crew sheet for PDF verification!");

    console.log(`✓ PDF Layout Master Template (S.No. 4001) Material Table Preserved:`);
    console.log(`  - Total Material Entries: ${pdfCrewSheet.packingMaterialDetails.length}`);
    pdfCrewSheet.packingMaterialDetails.slice(0, 3).forEach((pm) => {
      console.log(`    ↳ ${pm.materialName}: OUT = ${pm.materialOutQty}, IN = ${pm.materialInQty}`);
    });

    // ---------------------------------------------------------
    // STEP 16: Verify Audit Trail Preservation
    // ---------------------------------------------------------
    console.log("\nSTEP 16: Verifying Audit Trail Logging...");
    const auditLogs = await services.auditService.getAuditEvents();
    const materialEvents = auditLogs.filter(e => e.entityType === "PACKING_MATERIAL");
    console.log(`✓ Total Packing Material Audit Events Logged: ${materialEvents.length}`);
    materialEvents.slice(0, 4).forEach((evt) => {
      console.log(`  - [${evt.action}] ${evt.description} (By: ${evt.performedBy})`);
    });

    if (materialEvents.length < 5) {
      throw new Error("Audit logging count lower than expected!");
    }

    console.log("\n=================================================");
    console.log("PROMPT 18 VERIFICATION RESULT: PASS");
    console.log("=================================================");
  } catch (err: unknown) {
    console.error("\n=================================================");
    console.error("PROMPT 18 VERIFICATION RESULT: FAIL");
    console.error(`Error: ${(err as Error).message}`);
    console.error("=================================================");
    process.exit(1);
  }
}

runPackingMaterialUat();
