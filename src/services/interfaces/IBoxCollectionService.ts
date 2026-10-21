import { 
  BoxCollectionTracker, 
  CreateBoxTrackerInput,
  RecordBoxCollectionInput,
  ScheduleCollectionInput,
  BoxCollectionEvent
} from "@/types/box-collection";
import { UserRole } from "@/types/role";

export interface IBoxCollectionService {
  getTrackers(): Promise<BoxCollectionTracker[]>;
  getTrackerById(id: string): Promise<BoxCollectionTracker | null>;
  getTrackerByCustomer(customerId: string): Promise<BoxCollectionTracker | null>;
  getTrackerByAllocation(allocationId: string): Promise<BoxCollectionTracker | null>;
  
  createTracker(input: CreateBoxTrackerInput, performedBy?: string): Promise<BoxCollectionTracker>;
  recordCollection(input: RecordBoxCollectionInput, userRole?: UserRole, performedBy?: string): Promise<{ tracker: BoxCollectionTracker; event: BoxCollectionEvent }>;
  scheduleNextCollection(input: ScheduleCollectionInput, performedBy?: string): Promise<BoxCollectionTracker>;
  
  getCollectionHistory(trackerId: string): Promise<BoxCollectionEvent[]>;
  getPendingAlerts(): Promise<BoxCollectionTracker[]>;
}
