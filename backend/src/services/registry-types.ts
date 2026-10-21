import { IDashboardService } from "./interfaces/IDashboardService";
import { IWarehouseService } from "./interfaces/IWarehouseService";
import { ICustomerService } from "./interfaces/ICustomerService";
import { IAllocationService } from "./interfaces/IAllocationService";
import { IInventoryService } from "./interfaces/IInventoryService";
import { IMovementService } from "./interfaces/IMovementService";
import { IContractService } from "./interfaces/IContractService";
import { IDocumentService } from "./interfaces/IDocumentService";
import { IBillingService } from "./interfaces/IBillingService";
import { ICustomerPortalIntegrationService } from "./interfaces/ICustomerPortalIntegrationService";
import { IAuditService } from "./interfaces/IAuditService";
import { INotificationService } from "./interfaces/INotificationService";
import { IItemCatalogueService } from "./interfaces/IItemCatalogueService";
import { IPackingListService } from "./interfaces/IPackingListService";
import { ICrewSheetService } from "./interfaces/ICrewSheetService";
import { IPackingMaterialService } from "./interfaces/IPackingMaterialService";
import { IBoxCollectionService } from "./interfaces/IBoxCollectionService";
import { IWalkthroughDisclaimerService } from "./interfaces/IWalkthroughDisclaimerService";
import { IUserService } from "./interfaces/IUserService";
import { IEmployeeService } from "./interfaces/IEmployeeService";
import { IBookingRequestService } from "./interfaces/IBookingRequestService";

/** The shape every consumer of `services` relies on. Implemented by the HTTP client (browser) and the server registry. */
export interface ServiceRegistryShape {
  dashboardService: IDashboardService;
  warehouseService: IWarehouseService;
  customerService: ICustomerService;
  allocationService: IAllocationService;
  inventoryService: IInventoryService;
  movementService: IMovementService;
  contractService: IContractService;
  documentService: IDocumentService;
  billingService: IBillingService;
  portalIntegrationService: ICustomerPortalIntegrationService;
  itemCatalogueService: IItemCatalogueService;
  packingListService: IPackingListService;
  crewSheetService: ICrewSheetService;
  packingMaterialService: IPackingMaterialService;
  boxCollectionService: IBoxCollectionService;
  walkthroughDisclaimerService: IWalkthroughDisclaimerService;
  employeeService: IEmployeeService;
  bookingRequestService: IBookingRequestService;
  auditService: IAuditService;
  notificationService: INotificationService;
  userService: IUserService;
}

export type ServiceName = keyof ServiceRegistryShape;
