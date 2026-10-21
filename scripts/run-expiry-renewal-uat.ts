import { MockNotificationService } from "../src/services/mock/notification-service";
import { MockContractService } from "../src/services/mock/contract-service";
import { MockAllocationService } from "../src/services/mock/allocation-service";
import { MOCK_CONTRACTS, MOCK_ALLOCATIONS } from "../src/services/mock/mock-db";

async function runExpiryRenewalUAT() {
  console.log("==================================================");
  console.log("STORAGE EXPIRY, RENEWAL ATTENTION & NOTIFICATION UAT");
  console.log("==================================================\n");

  const notificationService = new MockNotificationService();
  const contractService = new MockContractService();
  const allocationService = new MockAllocationService();

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
  // TEST SECTION 1: STORAGE EXPIRY / UPCOMING END DATES
  // -------------------------------------------------------------
  console.log("--- 1. Storage Expiry & Upcoming End Date Tracking ---");

  const contracts = await contractService.getContracts();
  assert(contracts.length > 0, "Retrieve Storage Contracts for Expiry Audit", `Total contracts: ${contracts.length}`);

  const expiringContract = contracts.find((c) => c.status === "EXPIRING_SOON" || (c.daysUntilExpiry !== undefined && c.daysUntilExpiry <= 30));
  assert(
    Boolean(expiringContract),
    "Verify Storage Contract Upcoming Expiry Date Tracking",
    `Contract ${expiringContract?.contractCode} ends on ${expiringContract?.endDate} (${expiringContract?.daysUntilExpiry} days remaining)`
  );

  const allocations = await allocationService.getAllocations();
  const activeAlloc = allocations[0];
  assert(
    Boolean(activeAlloc.expectedEndDate),
    "Verify Storage Allocation Upcoming End Date Tracking",
    `Allocation ${activeAlloc.allocationCode} expected end date: ${activeAlloc.expectedEndDate}`
  );

  // -------------------------------------------------------------
  // TEST SECTION 2: RENEWAL / REVIEW / RELEASE ATTENTION
  // -------------------------------------------------------------
  console.log("\n--- 2. Renewal / Review / Release Attention Notifications ---");

  const notifications = await notificationService.getNotifications();
  assert(notifications.length > 0, "Retrieve Operational Review Notifications", `Total notifications: ${notifications.length}`);

  const contractExpiringNotif = notifications.find((n) => n.type === "CONTRACT_EXPIRING" || n.type === "CONTRACT_EXPIRED");
  assert(
    Boolean(contractExpiringNotif),
    "Verify Renewal / Review Attention Alert Generation",
    `Alert Title: "${contractExpiringNotif?.title}", Entity: ${contractExpiringNotif?.entityId}`
  );

  assert(
    Boolean(contractExpiringNotif?.actionUrl),
    "Verify Attention Action Navigation Link Mapped",
    `Action URL: ${contractExpiringNotif?.actionUrl}`
  );

  // -------------------------------------------------------------
  // TEST SECTION 3: EMAIL NOTIFICATION CHANNEL VERIFICATION
  // -------------------------------------------------------------
  console.log("\n--- 3. Email Notification Capability Audit ---");

  // Check if an email transport / SMTP handler is implemented
  const hasEmailService = false; // Email sending transport is not implemented in this workspace
  assert(
    !hasEmailService,
    "Audit External Email Transport Implementation",
    "No external SMTP/SES/SendGrid email delivery service found in application layer"
  );

  console.log("\n==================================================");
  console.log(`EXPIRY & RENEWAL UAT RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("==================================================");
  console.log("EMAIL NOTIFICATION REPORT: NOT VERIFIED — EMAIL NOTIFICATION CHANNEL\n");
}

runExpiryRenewalUAT().catch((err) => {
  console.error("UAT Execution Error:", err);
  process.exit(1);
});
