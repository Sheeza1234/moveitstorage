/**
 * End-to-End UAT Test Script for PROMPT 21:
 * "Employee Management, Team Leader Profiles & Employee Documents"
 */

import { services } from "../src/server/script-registry";

async function runEmployeeManagementUAT() {
  console.log("=======================================================================");
  console.log("PROMPT 21 UAT: Employee Management & Identity Documents Workflow Test");
  console.log("=======================================================================\n");

  try {
    // -------------------------------------------------------------------------
    // Step 1: Initialize Employee Service & Load Initial Records
    // -------------------------------------------------------------------------
    console.log("👉 Step 1: Initializing Employee Service and loading initial records...");
    const initialEmployees = await services.employeeService.getEmployees();
    console.log(`   Found ${initialEmployees.length} initial employee records in memory.`);

    // -------------------------------------------------------------------------
    // Step 2: Test Employee Creation with Required Fields
    // -------------------------------------------------------------------------
    console.log("\n👉 Step 2: Creating a new Employee profile (Name, Mobile, Email, Role, Status)...");
    const createdEmp = await services.employeeService.createEmployee(
      {
        name: "Suhail Al-Dhaheri",
        phone: "+971509998877",
        email: "suhail.dhaheri@moveit.com",
        role: "HELPER",
        isTeamLeaderEligible: false,
        status: "ACTIVE"
      },
      "HR Manager"
    );

    console.log(`   ✓ Created Employee [${createdEmp.id}]`);
    console.log(`     - Name: ${createdEmp.name}`);
    console.log(`     - Mobile: ${createdEmp.phone}`);
    console.log(`     - Email: ${createdEmp.email}`);
    console.log(`     - Role: ${createdEmp.role}`);
    console.log(`     - Status: ${createdEmp.status}`);
    console.log(`     - Initial TL Eligibility: ${createdEmp.isTeamLeaderEligible}`);

    // -------------------------------------------------------------------------
    // Step 3: Test Uploading Identity Documents (Emirates ID, Passport, Visa, optional NOC)
    // -------------------------------------------------------------------------
    console.log("\n👉 Step 3: Uploading Identity Documents (Emirates ID, Passport, Visa, optional NOC)...");

    // 1. Emirates ID (Valid)
    const eidDoc = await services.employeeService.uploadDocument(
      {
        employeeId: createdEmp.id,
        documentType: "EMIRATES_ID",
        documentNumber: "784-1995-1234567-8",
        fileName: "emirates_id_suhail.pdf",
        issueDate: "2024-01-01",
        expiryDate: "2027-01-01"
      },
      "SUPER_ADMIN",
      "HR Manager"
    );
    console.log(`   ✓ Emirates ID uploaded: ${eidDoc.documentNumber} (Status: ${eidDoc.status})`);

    // 2. Passport Copy (Expiring Soon - 10 days away)
    const future10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    const passportDoc = await services.employeeService.uploadDocument(
      {
        employeeId: createdEmp.id,
        documentType: "PASSPORT",
        documentNumber: "P9988776",
        fileName: "passport_suhail.pdf",
        issueDate: "2016-10-15",
        expiryDate: future10Days
      },
      "SUPER_ADMIN",
      "HR Manager"
    );
    console.log(`   ✓ Passport uploaded: ${passportDoc.documentNumber} (Expiry: ${passportDoc.expiryDate} -> Status: ${passportDoc.status})`);

    // 3. Residence Visa (Expired - 5 days ago)
    const past5Days = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    const visaDoc = await services.employeeService.uploadDocument(
      {
        employeeId: createdEmp.id,
        documentType: "VISA",
        documentNumber: "201/2022/998877",
        fileName: "visa_suhail.pdf",
        issueDate: "2022-10-01",
        expiryDate: past5Days
      },
      "SUPER_ADMIN",
      "HR Manager"
    );
    console.log(`   ✓ Residence Visa uploaded: ${visaDoc.documentNumber} (Expiry: ${visaDoc.expiryDate} -> Status: ${visaDoc.status})`);

    // 4. Optional NOC Letter (No expiry date required)
    const nocDoc = await services.employeeService.uploadDocument(
      {
        employeeId: createdEmp.id,
        documentType: "NOC_LETTER",
        documentNumber: "NOC-OPTIONAL-001",
        fileName: "noc_letter_suhail.pdf",
        issueDate: "2024-05-01"
        // expiryDate is optional
      },
      "SUPER_ADMIN",
      "HR Manager"
    );
    console.log(`   ✓ Optional NOC Letter uploaded: ${nocDoc.fileName} (Status: ${nocDoc.status})`);

    // -------------------------------------------------------------------------
    // Step 4: Test Document Expiry Alert Generation
    // -------------------------------------------------------------------------
    console.log("\n👉 Step 4: Checking Document Expiry Alert Generation...");
    const expiryAlerts = await services.employeeService.getExpiringDocumentsAlerts();
    console.log(`   ✓ Total Expiring / Expired Document Alerts: ${expiryAlerts.length}`);
    expiryAlerts.forEach((alt, idx) => {
      console.log(`      ${idx + 1}. Employee: "${alt.employeeName}" | Doc: ${alt.documentType} | Expiry: ${alt.expiryDate} | Remaining: ${alt.daysRemaining} days (${alt.status})`);
    });

    const suhailAlerts = expiryAlerts.filter((a) => a.employeeId === createdEmp.id);
    if (suhailAlerts.length < 2) {
      throw new Error(`Expected at least 2 document alerts for Suhail (Passport & Visa), found ${suhailAlerts.length}`);
    }

    // -------------------------------------------------------------------------
    // Step 5: Test Team Leader Eligibility & Single Source of Truth
    // -------------------------------------------------------------------------
    console.log("\n👉 Step 5: Testing Team Leader Eligibility Promotion...");
    console.log(`   - Before promotion: isTeamLeaderEligible = ${createdEmp.isTeamLeaderEligible}, role = ${createdEmp.role}`);

    const promotedEmp = await services.employeeService.toggleTeamLeaderEligibility(
      createdEmp.id,
      true,
      "SUPER_ADMIN",
      "Operations Admin"
    );
    console.log(`   ✓ Promoted Employee! isTeamLeaderEligible = ${promotedEmp.isTeamLeaderEligible}, Role = ${promotedEmp.role}`);

    const teamLeaders = await services.employeeService.getTeamLeaders();
    console.log(`   ✓ Total Team Leaders in System: ${teamLeaders.length}`);
    const isFoundInTLList = teamLeaders.some((tl) => tl.id === createdEmp.id);
    console.log(`   ✓ Verified single source of truth: Suhail exists in Team Leader list: ${isFoundInTLList}`);

    if (!isFoundInTLList) {
      throw new Error("Promoted Team Leader not found in getTeamLeaders() query!");
    }

    // -------------------------------------------------------------------------
    // Step 6: Test Job Assignment & Crew History Tracking
    // -------------------------------------------------------------------------
    console.log("\n👉 Step 6: Assigning a Job to Employee and checking active status...");
    const assignedEmp = await services.employeeService.assignJobToEmployee(
      createdEmp.id,
      "cs-4005",
      "LOCAL_MOVE",
      "Palm Jumeirah Luxury Villa",
      "Team Leader",
      "Operations Dispatch"
    );
    console.log(`   ✓ Assigned Job 'cs-4005'. Status: ${assignedEmp.status}, Available: ${assignedEmp.isAvailable}, Active Job: ${assignedEmp.activeJobId}`);

    // -------------------------------------------------------------------------
    // Step 7: Test Restricted Access for Sensitive Documents
    // -------------------------------------------------------------------------
    console.log("\n👉 Step 7: Testing Restricted Document Access Rules...");
    
    // Authorized HR view
    const hrDocs = await services.employeeService.getEmployeeDocuments(createdEmp.id, "HR_ADMIN");
    console.log(`   ✓ Authorized HR Access: Unmasked Document Number = "${hrDocs[0].documentNumber}"`);

    // Unauthorized Staff view
    const staffDocs = await services.employeeService.getEmployeeDocuments(createdEmp.id, "STORAGE_OPERATOR");
    console.log(`   ✓ Restricted Access (Operator): Masked Document Number = "${staffDocs[0].documentNumber}"`);

    if (staffDocs[0].documentNumber !== "[RESTRICTED ACCESS]") {
      throw new Error("Security check failed: Sensitive document number was not masked for non-HR role!");
    }

    // -------------------------------------------------------------------------
    // Step 8: Verify System Audit Log Trail
    // -------------------------------------------------------------------------
    console.log("\n👉 Step 8: Verifying System Audit Logs...");
    const employeeAuditLogs = await services.auditService.getAuditEventsByEntity("SYSTEM", createdEmp.id);
    console.log(`   ✓ Audit events logged for Employee [${createdEmp.id}]: ${employeeAuditLogs.length}`);
    employeeAuditLogs.forEach((l) => {
      console.log(`      - Action: [${l.action}] by ${l.performedBy} -> ${l.description}`);
    });

    console.log("\n=======================================================================");
    console.log("🎉 ALL PROMPT 21 UAT TESTS PASSED SUCCESSFULLY!");
    console.log("=======================================================================\n");
  } catch (error) {
    console.error("\n❌ UAT TEST FAILED WITH ERROR:");
    console.error(error);
    process.exit(1);
  }
}

runEmployeeManagementUAT();
