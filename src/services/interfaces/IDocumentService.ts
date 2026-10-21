import { 
  CustomerDocument, 
  UploadDocumentInput, 
  DocumentStatus, 
  DocumentSummary, 
  RequiredDocumentChecklistItem 
} from "@/types/contract";

export interface IDocumentService {
  getDocuments(): Promise<CustomerDocument[]>;
  getDocumentById(id: string): Promise<CustomerDocument | null>;
  getContractDocuments(contractId: string): Promise<CustomerDocument[]>;
  getCustomerDocuments(customerId: string): Promise<CustomerDocument[]>;
  uploadDocumentMetadata(input: UploadDocumentInput): Promise<CustomerDocument>;
  updateDocumentStatus(id: string, status: DocumentStatus): Promise<CustomerDocument>;
  deleteDocument(id: string): Promise<boolean>;
  getDocumentSummary(): Promise<DocumentSummary>;
  getContractChecklist(contractId: string): Promise<RequiredDocumentChecklistItem[]>;
}
