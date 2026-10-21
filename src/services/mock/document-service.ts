import { IDocumentService } from "../interfaces/IDocumentService";
import { 
  CustomerDocument, 
  UploadDocumentInput, 
  DocumentStatus, 
  DocumentSummary, 
  RequiredDocumentChecklistItem,
  DocumentType
} from "@/types/contract";
import { MOCK_DOCUMENTS, MOCK_CUSTOMERS, MOCK_CONTRACTS } from "./mock-db";
import { auditService } from "./audit-service";

const EXPIRY_THRESHOLD_DAYS = 30;

function calculateDaysDifference(targetDateStr?: string): number | undefined {
  if (!targetDateStr) return undefined;
  const target = new Date(targetDateStr);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function processDocumentExpiry(doc: CustomerDocument): CustomerDocument {
  if (!doc.expiryDate) {
    return { ...doc, daysUntilExpiry: undefined };
  }

  const daysLeft = calculateDaysDifference(doc.expiryDate);
  if (daysLeft === undefined) return doc;

  let updatedStatus = doc.status;
  if (doc.status !== 'REJECTED') {
    if (daysLeft < 0) {
      updatedStatus = 'EXPIRED';
    } else if (daysLeft <= EXPIRY_THRESHOLD_DAYS && doc.status === 'APPROVED') {
      updatedStatus = 'EXPIRING_SOON';
    }
  }

  return {
    ...doc,
    status: updatedStatus,
    daysUntilExpiry: daysLeft,
  };
}

export class MockDocumentService implements IDocumentService {
  private documents: CustomerDocument[] = MOCK_DOCUMENTS;

  async getDocuments(): Promise<CustomerDocument[]> {
    this.documents = this.documents.map(processDocumentExpiry);
    return [...this.documents];
  }

  async getDocumentById(id: string): Promise<CustomerDocument | null> {
    const doc = this.documents.find((d) => d.id === id);
    if (!doc) return null;
    const processed = processDocumentExpiry(doc);
    return { ...processed };
  }

  async getContractDocuments(contractId: string): Promise<CustomerDocument[]> {
    const all = await this.getDocuments();
    return all.filter((d) => d.contractId === contractId);
  }

  async getCustomerDocuments(customerId: string): Promise<CustomerDocument[]> {
    const all = await this.getDocuments();
    return all.filter((d) => d.customerId === customerId);
  }

  async uploadDocumentMetadata(input: UploadDocumentInput): Promise<CustomerDocument> {
    // 1. Customer verification
    const customer = MOCK_CUSTOMERS.find((c) => c.id === input.customerId);
    if (!customer) {
      throw new Error(`Customer with ID "${input.customerId}" not found.`);
    }

    // 2. Contract verification if provided
    if (input.contractId) {
      const contract = MOCK_CONTRACTS.find((c) => c.id === input.contractId);
      if (!contract) {
        throw new Error(`Contract with ID "${input.contractId}" not found.`);
      }
    }

    const seq = (this.documents.length + 1).toString().padStart(5, '0');
    const docCode = `DOC-2026-${seq}`;
    const nowIso = new Date().toISOString();

    const mockRef = input.storageReference || `/mock-storage/contracts/${input.contractId || 'general'}/${input.fileName}`;

    const newDoc: CustomerDocument = {
      id: `doc-${Date.now()}`,
      documentCode: docCode,
      contractId: input.contractId,
      customerId: input.customerId,
      customerName: customer.name,
      documentType: input.documentType,
      title: input.title || `${input.documentType.replace('_', ' ')} — ${customer.name}`,
      fileName: input.fileName,
      fileType: input.fileType || 'application/pdf',
      fileSize: input.fileSize || 1024000,
      storageReference: mockRef,
      fileUrl: mockRef,
      status: 'UPLOADED',
      issueDate: input.issueDate,
      expiryDate: input.expiryDate,
      uploadedAt: nowIso,
      uploadedBy: input.uploadedBy || 'Operations Staff',
      notes: input.notes,
    };

    const processed = processDocumentExpiry(newDoc);
    this.documents.unshift(processed);

    // If linked to contract, update contract's documentIds array
    if (input.contractId) {
      const contract = MOCK_CONTRACTS.find((c) => c.id === input.contractId);
      if (contract && !contract.documentIds.includes(processed.id)) {
        contract.documentIds.push(processed.id);
      }
    }

    await auditService.recordEvent({
      entityType: "DOCUMENT",
      entityId: processed.id,
      action: "DOCUMENT_UPLOADED",
      description: `Document '${processed.title}' (${processed.documentCode}) uploaded for ${processed.customerName}.`,
      performedBy: input.uploadedBy || "Operations Staff",
      metadata: { documentCode: processed.documentCode, documentType: processed.documentType },
    });

    return { ...processed };
  }

  async updateDocumentStatus(id: string, status: DocumentStatus): Promise<CustomerDocument> {
    const index = this.documents.findIndex((d) => d.id === id);
    if (index === -1) {
      throw new Error(`Document with ID "${id}" not found.`);
    }

    const current = this.documents[index];

    // Controlled transitions
    if (current.status === 'REJECTED' && status === 'APPROVED') {
      throw new Error("Rejected documents cannot be approved directly. Re-upload a valid document metadata record.");
    }

    const updated: CustomerDocument = {
      ...current,
      status,
    };

    const processed = processDocumentExpiry(updated);
    this.documents[index] = processed;

    await auditService.recordEvent({
      entityType: "DOCUMENT",
      entityId: processed.id,
      action: "DOCUMENT_STATUS_CHANGED",
      description: `Document '${processed.title}' status updated to ${status}.`,
      performedBy: "Compliance Specialist",
      metadata: { previousValue: current.status, newValue: status },
    });

    return { ...processed };
  }

  async deleteDocument(id: string): Promise<boolean> {
    const index = this.documents.findIndex((d) => d.id === id);
    if (index === -1) return false;

    const doc = this.documents[index];
    this.documents.splice(index, 1);

    // Clean reference from contract if present
    if (doc.contractId) {
      const contract = MOCK_CONTRACTS.find((c) => c.id === doc.contractId);
      if (contract) {
        contract.documentIds = contract.documentIds.filter((dId) => dId !== id);
      }
    }

    await auditService.recordEvent({
      entityType: "DOCUMENT",
      entityId: doc.id,
      action: "DOCUMENT_DELETED",
      description: `Document '${doc.title}' (${doc.documentCode}) deleted.`,
      performedBy: "Admin User",
      metadata: { title: doc.title, documentCode: doc.documentCode },
    });

    return true;
  }

  async getDocumentSummary(): Promise<DocumentSummary> {
    const all = await this.getDocuments();

    let missingCount = 0;
    // Calculate missing required docs across active contracts
    for (const contract of MOCK_CONTRACTS) {
      if (contract.status === 'ACTIVE' || contract.status === 'EXPIRING_SOON') {
        const contractDocs = all.filter((d) => d.contractId === contract.id || d.customerId === contract.customerId);
        const hasSignedContract = contractDocs.some((d) => d.documentType === 'SIGNED_CONTRACT' && d.status !== 'REJECTED');
        const hasInsurance = contractDocs.some((d) => d.documentType === 'INSURANCE' && d.status !== 'REJECTED');
        if (!hasSignedContract) missingCount++;
        if (!hasInsurance) missingCount++;
      }
    }

    return {
      totalDocuments: all.length,
      uploadedDocuments: all.filter((d) => d.status === 'UPLOADED').length,
      pendingReviewDocuments: all.filter((d) => d.status === 'PENDING_REVIEW').length,
      approvedDocuments: all.filter((d) => d.status === 'APPROVED').length,
      expiringSoonDocuments: all.filter((d) => d.status === 'EXPIRING_SOON').length,
      expiredDocuments: all.filter((d) => d.status === 'EXPIRED').length,
      missingRequiredCount: missingCount,
    };
  }

  async getContractChecklist(contractId: string): Promise<RequiredDocumentChecklistItem[]> {
    const contract = MOCK_CONTRACTS.find((c) => c.id === contractId);
    if (!contract) {
      throw new Error(`Contract "${contractId}" not found.`);
    }

    const customer = MOCK_CUSTOMERS.find((c) => c.id === contract.customerId);
    const isCorporate = customer?.type === 'CORPORATE';

    const docs = await this.getContractDocuments(contractId);
    const customerDocs = await this.getCustomerDocuments(contract.customerId);
    const allRelevantDocs = [...docs, ...customerDocs];

    const checklistTypes: { type: DocumentType; label: string; required: boolean }[] = [
      { type: 'SIGNED_CONTRACT', label: 'Signed Storage Agreement', required: true },
      { type: isCorporate ? 'TRADE_LICENSE' : 'EMIRATES_ID', label: isCorporate ? 'Trade License Copy' : 'Emirates ID Copy', required: true },
      { type: 'INSURANCE', label: 'Storage & Liability Insurance', required: true },
      { type: 'CUSTOMER_ID', label: 'Authorized Contact Passport/ID', required: !isCorporate },
      { type: 'INVENTORY_LIST', label: 'Packing List / Inventory Schedule', required: false },
    ];

    return checklistTypes.map((req) => {
      const matchingDoc = allRelevantDocs.find((d) => d.documentType === req.type);
      let status: RequiredDocumentChecklistItem['status'] = 'MISSING';

      if (matchingDoc) {
        if (matchingDoc.status === 'APPROVED') status = 'APPROVED';
        else if (matchingDoc.status === 'EXPIRING_SOON') status = 'EXPIRING_SOON';
        else if (matchingDoc.status === 'EXPIRED') status = 'EXPIRED';
        else if (matchingDoc.status === 'PENDING_REVIEW') status = 'PENDING_REVIEW';
        else status = 'UPLOADED';
      }

      return {
        documentType: req.type,
        label: req.label,
        isRequired: req.required,
        status,
        document: matchingDoc,
      };
    });
  }
}
