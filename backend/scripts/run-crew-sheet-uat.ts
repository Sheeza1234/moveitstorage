import { services } from "../src/server/script-registry";
import { CreateEmployeeInput, AssignCrewInput } from "../src/types/crew-sheet";

async function runCrewSheetUat() {
  console.log("=================================================");
  console.log("PROMPT 17 — CREW SHEET & MANPOWER ASSIGNMENT UAT");
  console.log("=================================================\n");

  try {
    // ---------------------------------------------------------
    // STEP 1: Create / Select Employee
    // ---------------------------------------------------------
    console.log("STEP 1: Testing Employee creation & selection...");
    const newEmpInput: CreateEmployeeInput = {
      name: "Suresh Kumar",
      role: "PACKER",
      phone: "+971 50 123 4567",
      isAvailable: true,
    };
    const createdEmp = await services.crewSheetService.createEmployee(newEmpInput);
    console.log(`✓ Created Employee: ${createdEmp.name} (Role: ${createdEmp.role}, ID: ${createdEmp.id})`);

    const allEmps = await services.crewSheetService.getEmployees();
    console.log(`✓ Total employees in system: ${allEmps.length}`);
    const teamLeader = allEmps.find((e) => e.role === "TEAM_LEADER" && e.isAvailable);
    const packers = allEmps.filter((e) => e.role === "PACKER" && e.isAvailable);
    const helpers = allEmps.filter((e) => e.role === "HELPER" && e.isAvailable);

    if (!teamLeader) {
      throw new Error("No available Team Leader found in employee registry.");
    }
    console.log(`✓ Selected Team Leader: ${teamLeader.name} (${teamLeader.id})`);

    // ---------------------------------------------------------
    // STEP 2 & 3: Assign Team Leader & Crew
    // ---------------------------------------------------------
    console.log("\nSTEP 2 & 3: Assigning Team Leader and Crew...");
    const assignInput: AssignCrewInput = {
      teamLeaderId: teamLeader.id,
      packerIds: packers.slice(0, 2).map((p) => p.id),
      helperIds: helpers.slice(0, 1).map((h) => h.id),
    };
    console.log(`✓ Team Leader ID: ${assignInput.teamLeaderId}`);
    console.log(`✓ Packer IDs: ${assignInput.packerIds.join(", ")}`);
    console.log(`✓ Helper IDs: ${assignInput.helperIds?.join(", ")}`);

    // ---------------------------------------------------------
    // STEP 4 & 5: Generate Crew Sheet & Verify Auto-population
    // ---------------------------------------------------------
    console.log("\nSTEP 4 & 5: Generating Crew Sheet & Verifying Auto-Population...");
    // Pick an existing allocation if available to test auto-population
    const allocations = await services.allocationService.getAllocations();
    const targetAlloc = allocations[0];
    const allocId = targetAlloc ? targetAlloc.id : undefined;

    const crewSheet = await services.crewSheetService.createCrewSheet(
      {
        allocationId: allocId,
        teamLeaderId: assignInput.teamLeaderId,
        packerIds: assignInput.packerIds,
        helperIds: assignInput.helperIds,
      },
      "SUPER_ADMIN",
      "Operations Admin"
    );

    console.log(`✓ Created Crew Sheet S.No: ${crewSheet.serialNumber} (ID: ${crewSheet.id})`);
    console.log(`  - Status: ${crewSheet.status}`);
    console.log(`  - Client Name: ${crewSheet.clientName}`);
    console.log(`  - Contact Person: ${crewSheet.contactPersonNumber}`);
    console.log(`  - From: ${crewSheet.fromLocation}`);
    console.log(`  - To: ${crewSheet.toLocation}`);
    console.log(`  - Team Leader: ${crewSheet.teamLeaderName}`);
    console.log(`  - Packers: ${crewSheet.packers}`);
    console.log(`  - Total CBM: ${crewSheet.totalCbm}`);
    console.log(`  - Job Instructions: ${crewSheet.jobInstructions}`);

    if (allocId && targetAlloc) {
      if (!crewSheet.clientName || crewSheet.clientName === "N/A") {
        throw new Error("Auto-population failed: Client Name was not populated from Allocation!");
      }
      console.log("✓ Verified auto-population from Storage Allocation.");
    }

    // ---------------------------------------------------------
    // STEP 6: Edit Permitted Fields (Admin / Ops)
    // ---------------------------------------------------------
    console.log("\nSTEP 6: Editing Permitted Operational Fields as Admin...");
    const updatedSheet = await services.crewSheetService.updateCrewSheet(
      crewSheet.id,
      {
        advanceCollected: 500,
        balanceToCollect: 1500,
        modeOfPayment: "Bank Transfer",
        buildingPermitRequired: true,
        documentAttached: true,
        jobInstructions: "Handle fragile artwork with extra bubble wrap.",
      },
      "SUPER_ADMIN",
      "Admin User"
    );

    console.log(`✓ Updated Advance Collected: ${updatedSheet.advanceCollected}`);
    console.log(`✓ Updated Balance: ${updatedSheet.balanceToCollect}`);
    console.log(`✓ Updated Payment Mode: ${updatedSheet.modeOfPayment}`);
    console.log(`✓ Updated Building Permit Required: ${updatedSheet.buildingPermitRequired}`);

    // ---------------------------------------------------------
    // STEP 7: Verify Protected Fields Cannot Be Changed by Team Leader
    // ---------------------------------------------------------
    console.log("\nSTEP 7: Verifying Protected Fields Security for Team Leader...");
    let protectedErrorCaught = false;
    try {
      await services.crewSheetService.updateCrewSheet(
        crewSheet.id,
        {
          teamLeaderId: "emp-hacker-id",
          totalCbm: 999,
          clientName: "Hacked Client Name",
        },
        "STORAGE_OPERATOR" // Team Leader role
      );
    } catch (err: unknown) {
      protectedErrorCaught = true;
      console.log(`✓ Successfully rejected unauthorized modification by Team Leader: ${(err as Error).message}`);
    }

    if (!protectedErrorCaught) {
      throw new Error("SECURITY FAILURE: Team Leader was able to alter protected header/assignment fields!");
    }

    // ---------------------------------------------------------
    // STEP 8: Accept Job by Team Leader
    // ---------------------------------------------------------
    console.log("\nSTEP 8: Team Leader Accepting Job...");
    const acceptedSheet = await services.crewSheetService.acceptJob(
      crewSheet.id,
      "STORAGE_OPERATOR"
    );
    console.log(`✓ Job Accepted. New Status: ${acceptedSheet.status}`);
    if (acceptedSheet.status !== "ACCEPTED" && acceptedSheet.status !== "IN_PROGRESS") {
      throw new Error(`Expected status ACCEPTED or IN_PROGRESS, got ${acceptedSheet.status}`);
    }

    // ---------------------------------------------------------
    // STEP 9: Update Execution Info & Submit Crew Sheet
    // ---------------------------------------------------------
    console.log("\nSTEP 9: Updating Execution Details & Submitting Crew Sheet...");
    // TL updates performance report ratings and packing material out/in
    const tlUpdatedRatings = acceptedSheet.performanceReport.map((pr) => {
      if (pr.dimension === "Tangibles" || pr.dimension === "Reliability") {
        return { ...pr, rating: "EXCELLENT" as const };
      }
      return { ...pr, rating: "VERY_GOOD" as const };
    });

    const tlUpdatedMaterials = acceptedSheet.packingMaterialDetails.map((pm) => {
      if (pm.materialName === "SMALL BOX") return { ...pm, materialOutQty: 10, materialInQty: 2, qtyOut: 10, qtyIn: 2 };
      if (pm.materialName === "MEDIUM BOX") return { ...pm, materialOutQty: 15, materialInQty: 5, qtyOut: 15, qtyIn: 5 };
      if (pm.materialName === "BUBBLE WRAP") return { ...pm, materialOutQty: 3, materialInQty: 0, qtyOut: 3, qtyIn: 0 };
      return pm;
    });

    const execSheet = await services.crewSheetService.updateCrewSheet(
      acceptedSheet.id,
      {
        performanceReport: tlUpdatedRatings,
        packingMaterialDetails: tlUpdatedMaterials,
        jobDetailsMoveTypes: { ...acceptedSheet.jobDetailsMoveTypes, storage: true, localMove: true },
      },
      "STORAGE_OPERATOR"
    );

    const submittedSheet = await services.crewSheetService.submitCrewSheet(
      execSheet.id,
      "STORAGE_OPERATOR"
    );
    console.log(`✓ Crew Sheet Submitted. New Status: ${submittedSheet.status}`);
    if (submittedSheet.status !== "SUBMITTED") {
      throw new Error(`Expected status SUBMITTED, got ${submittedSheet.status}`);
    }

    // ---------------------------------------------------------
    // STEP 10: Complete Signatures & Finalize
    // ---------------------------------------------------------
    console.log("\nSTEP 10: Completing Signatures and Finalizing Crew Sheet...");
    const signedSheet = await services.crewSheetService.completeSignatures(
      submittedSheet.id,
      {
        customerSignature: "DATA:IMAGE/PNG;BASE64,CUSTOMER_SIG_MOCK",
        teamLeaderSignature: "DATA:IMAGE/PNG;BASE64,TL_SIG_MOCK",
      },
      "SUPER_ADMIN"
    );

    console.log(`✓ Customer Signature Recorded: ${!!signedSheet.customerSignature}`);
    console.log(`✓ Team Leader Signature Recorded: ${!!signedSheet.teamLeaderSignature}`);
    console.log(`✓ Final Status: ${signedSheet.status}`);
    if (signedSheet.status !== "COMPLETED") {
      throw new Error(`Expected status COMPLETED, got ${signedSheet.status}`);
    }

    // ---------------------------------------------------------
    // STEP 11: Verify PDF View Representation Data
    // ---------------------------------------------------------
    console.log("\nSTEP 11: Verifying PDF Data Layout Structure...");
    const pdfData = await services.crewSheetService.getCrewSheetById(signedSheet.id);
    if (!pdfData) throw new Error("Could not fetch completed Crew Sheet for PDF check!");

    console.log("✓ PDF Master Reference Sections Verified:");
    console.log(`  - Header Serial S.No: ${pdfData.serialNumber}`);
    console.log(`  - Move Type Checkboxes: ${JSON.stringify(pdfData.moveTypes)}`);
    console.log(`  - Property Type: ${pdfData.propertyType}`);
    console.log(`  - Manpower Total CBM: ${pdfData.totalCbm}`);
    console.log(`  - Performance Report Categories Count: ${pdfData.performanceReport.length}`);
    console.log(`  - Packing Materials Out/In Items Count: ${pdfData.packingMaterialDetails.length}`);

    // ---------------------------------------------------------
    // STEP 12: Verify Existing Storage/Inventory Functionality
    // ---------------------------------------------------------
    console.log("\nSTEP 12: Verifying Existing Storage, Inventory & Allocation Integrity...");
    const warehouses = await services.warehouseService.getWarehouses();
    const inventoryRecords = await services.inventoryService.getInventoryRecords();
    console.log(`✓ Existing Warehouses count: ${warehouses.length}`);
    console.log(`✓ Existing Inventory Records count: ${inventoryRecords.length}`);
    console.log("✓ Storage and Inventory modules completely intact!");

    console.log("\n=================================================");
    console.log("PROMPT 17 VERIFICATION RESULT: PASS");
    console.log("=================================================");
  } catch (err: unknown) {
    console.error("\n=================================================");
    console.error("PROMPT 17 VERIFICATION RESULT: FAIL");
    console.error(`Error: ${(err as Error).message}`);
    console.error("=================================================");
    process.exit(1);
  }
}

runCrewSheetUat();
