import { 
  WalkthroughDisclaimer, 
  CreateWalkthroughDisclaimerInput,
  WalkthroughChecklistItem,
  RecordDamageInput,
  DamageItemRecord,
  RecordMissingItemInput,
  MissingItemRecord,
  SignWalkthroughInput
} from "@/types/walkthrough-disclaimer";
import { UserRole } from "@/types/role";

export interface IWalkthroughDisclaimerService {
  getDisclaimers(): Promise<WalkthroughDisclaimer[]>;
  getDisclaimerById(id: string): Promise<WalkthroughDisclaimer | null>;
  getDisclaimerByCustomer(customerId: string): Promise<WalkthroughDisclaimer | null>;
  getDisclaimerByCrewSheet(crewSheetId: string): Promise<WalkthroughDisclaimer | null>;
  
  createDisclaimer(input: CreateWalkthroughDisclaimerInput, performedBy?: string): Promise<WalkthroughDisclaimer>;
  updateChecklist(disclaimerId: string, checklist: WalkthroughChecklistItem[], performedBy?: string): Promise<WalkthroughDisclaimer>;
  recordDamage(input: RecordDamageInput, performedBy?: string): Promise<{ disclaimer: WalkthroughDisclaimer; damage: DamageItemRecord }>;
  recordMissingItem(input: RecordMissingItemInput, performedBy?: string): Promise<{ disclaimer: WalkthroughDisclaimer; missing: MissingItemRecord }>;
  signDisclaimer(input: SignWalkthroughInput, performedBy?: string): Promise<WalkthroughDisclaimer>;
  completeDisclaimer(disclaimerId: string, userRole?: UserRole, performedBy?: string): Promise<WalkthroughDisclaimer>;
}
