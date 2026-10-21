import { PermissionAction, PermissionModule, PermissionSet } from "@/types/role";

/**
 * What each user may do is decided per module AND per action by a Super Admin, and enforced here on the server:
 *
 *  - READ (get / find / list / search ...): the user needs VIEW on ANY of the service's modules (related screens share
 *    look-ups, e.g. a crew sheet reads employees).
 *  - WRITE: every changing operation has its own rule below: the module and the action(s) it needs (any one of the
 *    listed pairs is enough). An operation without a rule is refused, so a new method can never be open by accident.
 *
 * The screens use the same permission set to hide buttons the user could not use anyway.
 */
type Spec = { read: PermissionModule[] | "ANY" };

const SPEC: Record<string, Spec> = {
  dashboardService: { read: "ANY" },
  notificationService: { read: "ANY" },
  warehouseService: { read: "ANY" },
  customerService: { read: "ANY" },
  bookingRequestService: { read: ["CUSTOMERS"] },
  allocationService: { read: ["ALLOCATIONS", "INVENTORY", "REPORTS"] },
  inventoryService: { read: ["INVENTORY", "ALLOCATIONS", "REPORTS"] },
  movementService: { read: ["INVENTORY", "REPORTS"] },
  contractService: { read: ["CONTRACTS", "BILLING", "REPORTS"] },
  documentService: { read: ["DOCUMENTS", "CONTRACTS", "REPORTS"] },
  billingService: { read: ["BILLING", "REPORTS"] },
  portalIntegrationService: { read: ["CUSTOMERS"] },
  itemCatalogueService: { read: ["PACKING_LIST", "CREW_SHEET", "INVENTORY"] },
  packingListService: { read: ["PACKING_LIST", "CREW_SHEET", "INVENTORY", "REPORTS"] },
  crewSheetService: { read: ["CREW_SHEET", "PACKING_LIST", "BOX_COLLECTION", "WALKTHROUGH", "REPORTS"] },
  packingMaterialService: { read: ["PACKING_MATERIAL", "CREW_SHEET", "REPORTS"] },
  boxCollectionService: { read: ["BOX_COLLECTION", "CREW_SHEET", "REPORTS"] },
  walkthroughDisclaimerService: { read: ["WALKTHROUGH", "CREW_SHEET"] },
  employeeService: { read: ["EMPLOYEES", "CREW_SHEET", "PACKING_LIST", "BOX_COLLECTION", "WALKTHROUGH", "PACKING_MATERIAL"] },
  auditService: { read: ["AUDIT", "REPORTS", "SETTINGS"] },
};


/** [module, action] pairs; the user needs at least one of them. "ANY" = any signed-in user (internal logging, read receipts). */
type Need = Array<[PermissionModule, PermissionAction]> | "ANY";
const W = (module: PermissionModule, ...actions: PermissionAction[]): Need => actions.map((a) => [module, a] as [PermissionModule, PermissionAction]);

const WRITE: Record<string, Record<string, Need>> = {
  warehouseService: {
    createWarehouse: W("WAREHOUSES", "CREATE"), updateWarehouse: W("WAREHOUSES", "EDIT"),
    createFloor: W("WAREHOUSES", "CREATE"), createZone: W("WAREHOUSES", "CREATE"), createRack: W("WAREHOUSES", "CREATE"), createSlot: W("WAREHOUSES", "CREATE"),
    updateFloor: W("WAREHOUSES", "EDIT"), updateZone: W("WAREHOUSES", "EDIT"), updateRack: W("WAREHOUSES", "EDIT"), updateSlot: W("WAREHOUSES", "EDIT"),
    saveLayoutConfig: W("WAREHOUSES", "EDIT"),
    deleteFloor: W("WAREHOUSES", "DELETE"), deleteZone: W("WAREHOUSES", "DELETE"), deleteRack: W("WAREHOUSES", "DELETE"), deleteSlot: W("WAREHOUSES", "DELETE"),
  },
  customerService: { createCustomer: W("CUSTOMERS", "CREATE"), updateCustomer: W("CUSTOMERS", "EDIT") },
  // submitBookingRequest has no rule on purpose: only the public portal endpoint calls it, never a signed-in RPC caller
  bookingRequestService: { updateBookingRequest: W("CUSTOMERS", "EDIT") },
  allocationService: {
    createAllocationRequirement: W("ALLOCATIONS", "CREATE"), confirmAllocation: W("ALLOCATIONS", "APPROVE"),
    releaseAllocation: W("ALLOCATIONS", "RELEASE"), cancelAllocation: W("ALLOCATIONS", "EDIT", "CLOSE"),
  },
  inventoryService: {
    createInventoryRecord: W("INVENTORY", "CREATE"), recordItemsIn: W("INVENTORY", "CREATE"),
    recordItemsOut: W("INVENTORY", "RELEASE", "EDIT"), moveInventory: W("INVENTORY", "EDIT"), updateInventoryStatus: W("INVENTORY", "EDIT"),
  },
  movementService: { createMovement: W("INVENTORY", "EDIT", "CREATE") },
  contractService: { createContract: W("CONTRACTS", "CREATE"), updateContract: W("CONTRACTS", "EDIT"), updateContractStatus: W("CONTRACTS", "EDIT", "APPROVE", "CLOSE") },
  documentService: { uploadDocumentMetadata: W("DOCUMENTS", "UPLOAD", "CREATE"), updateDocumentStatus: W("DOCUMENTS", "APPROVE", "EDIT"), deleteDocument: W("DOCUMENTS", "DELETE") },
  billingService: {
    createInvoice: W("BILLING", "CREATE"), updateInvoice: W("BILLING", "EDIT"), cancelInvoice: W("BILLING", "EDIT", "CLOSE"), voidInvoice: W("BILLING", "EDIT", "CLOSE"),
    recordPayment: W("BILLING", "CREATE", "EDIT"), reconcileBillingWithStorage: W("BILLING", "RECONCILE"),
  },
  portalIntegrationService: { syncContractStatus: W("CUSTOMERS", "EDIT"), syncCustomerStorageStatus: W("CUSTOMERS", "EDIT"), syncInvoiceStatus: W("CUSTOMERS", "EDIT") },
  itemCatalogueService: { addCatalogueItem: W("PACKING_LIST", "CREATE"), updateCatalogueItem: W("PACKING_LIST", "EDIT"), deleteCatalogueItem: W("PACKING_LIST", "DELETE") },
  packingListService: {
    createPackingList: W("PACKING_LIST", "CREATE"), updatePackingList: W("PACKING_LIST", "EDIT"), revisePackingList: W("PACKING_LIST", "EDIT"),
    approvePackingList: W("PACKING_LIST", "APPROVE"), approveExtraItem: W("PACKING_LIST", "APPROVE"), reviewExtraItem: W("PACKING_LIST", "APPROVE"),
    addExtraItem: W("PACKING_LIST", "SUBMIT", "CREATE", "EDIT"),
  },
  crewSheetService: {
    createCrewSheet: W("CREW_SHEET", "CREATE"), updateCrewSheet: W("CREW_SHEET", "EDIT"), assignCrew: W("CREW_SHEET", "ASSIGN"),
    acceptJob: W("CREW_SHEET", "SUBMIT", "EDIT"), submitCrewSheet: W("CREW_SHEET", "SUBMIT"),
    completeCrewSheet: W("CREW_SHEET", "SIGN", "SUBMIT"), completeSignatures: W("CREW_SHEET", "SIGN", "SUBMIT"),
    addEmployee: [...W("CREW_SHEET", "ASSIGN"), ...W("EMPLOYEES", "CREATE")] as Need, createEmployee: [...W("CREW_SHEET", "ASSIGN"), ...W("EMPLOYEES", "CREATE")] as Need,
  },
  packingMaterialService: {
    createMaterial: W("PACKING_MATERIAL", "CREATE"), updateMaterial: W("PACKING_MATERIAL", "EDIT"), allocateMaterialsForJob: W("PACKING_MATERIAL", "CREATE", "EDIT"),
    approveJobMaterialList: W("PACKING_MATERIAL", "APPROVE"), reviewMaterialChange: W("PACKING_MATERIAL", "APPROVE"),
    requestMaterialChange: W("PACKING_MATERIAL", "SUBMIT", "EDIT"), returnMaterial: W("PACKING_MATERIAL", "SUBMIT", "EDIT"),
  },
  boxCollectionService: {
    createTracker: W("BOX_COLLECTION", "CREATE"), recordCollection: W("BOX_COLLECTION", "SUBMIT", "EDIT"), scheduleNextCollection: W("BOX_COLLECTION", "SUBMIT", "EDIT"),
  },
  walkthroughDisclaimerService: {
    createDisclaimer: W("WALKTHROUGH", "CREATE"), updateChecklist: W("WALKTHROUGH", "EDIT", "SUBMIT"), recordDamage: W("WALKTHROUGH", "EDIT", "SUBMIT"),
    recordMissingItem: W("WALKTHROUGH", "EDIT", "SUBMIT"), signDisclaimer: W("WALKTHROUGH", "SIGN"), completeDisclaimer: W("WALKTHROUGH", "SIGN", "SUBMIT"),
  },
  employeeService: {
    createEmployee: W("EMPLOYEES", "CREATE"), updateEmployee: W("EMPLOYEES", "EDIT"), toggleTeamLeaderEligibility: W("EMPLOYEES", "EDIT"),
    assignJobToEmployee: W("EMPLOYEES", "ASSIGN"), uploadDocument: W("EMPLOYEES", "UPLOAD", "EDIT"), deleteDocument: W("EMPLOYEES", "DELETE"),
  },
  auditService: { recordEvent: "ANY" },
  notificationService: { addNotification: "ANY", evaluateOperationalAlerts: "ANY", markAllAsRead: "ANY", markAsRead: "ANY" },
};

const READ_METHOD = /^(get|find|list|search|check|calculate|is|has|count|preview|recommend|validate)/i;

/** null = allowed, otherwise a message for the 403 response. userService enforces its own rules. */
export function authorizeRpc(service: string, method: string, perms: PermissionSet): string | null {
  if (service === "userService") return null;
  const spec = SPEC[service];
  if (!spec) return `No access rules exist for ${service}.`;
  if (READ_METHOD.test(method)) {
    if (spec.read === "ANY") return null;
    return spec.read.some((m) => (perms[m] ?? []).includes("VIEW")) ? null : `Your account does not have access to ${spec.read[0].replace(/_/g, " ").toLowerCase()}.`;
  }
  const need = WRITE[service]?.[method];
  if (!need) return `No access rule exists for ${service}.${method}, so it is refused.`;
  if (need === "ANY") return null;
  if (need.some(([m, a]) => (perms[m] ?? []).includes(a))) return null;
  const [m0, a0] = need[0];
  return `Your account is not allowed to ${a0.toLowerCase()} ${m0.replace(/_/g, " ").toLowerCase()}.`;
}
