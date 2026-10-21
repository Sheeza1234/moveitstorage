import { 
  PackingList, 
  CreatePackingListInput, 
  AddExtraItemInput, 
  ExtraItem,
  PackingListHeader,
  PackingListItem,
  PackingListSummary 
} from "@/types/packing-list";
import { Role } from "@/types/role";

export interface IPackingListService {
  getPackingLists(customerId?: string): Promise<PackingList[]>;
  getPackingListById(id: string): Promise<PackingList | null>;
  createPackingList(input: CreatePackingListInput, userRole?: Role, performedBy?: string): Promise<PackingList>;
  updatePackingList(
    id: string, 
    input: { header?: Partial<PackingListHeader>; items?: PackingListItem[]; summary?: Partial<PackingListSummary> }, 
    userRole?: Role, 
    performedBy?: string
  ): Promise<PackingList>;
  approvePackingList(id: string, userRole?: Role, approvedBy?: string): Promise<PackingList>;
  revisePackingList(
    id: string, 
    updates: { header?: Partial<PackingListHeader>; items?: PackingListItem[]; summary?: Partial<PackingListSummary> }, 
    reason: string, 
    userRole?: Role, 
    revisedBy?: string
  ): Promise<PackingList>;
  addExtraItem(packingListId: string, input: AddExtraItemInput, userRole?: Role, submittedBy?: string): Promise<ExtraItem>;
  reviewExtraItem(
    packingListId: string, 
    extraItemId: string, 
    action: "APPROVE" | "REJECT", 
    userRole: Role, 
    reviewedBy?: string, 
    reviewNotes?: string
  ): Promise<PackingList>;
  approveExtraItem(packingListId: string, extraItemId: string, reviewedBy?: string): Promise<ExtraItem>;
}
