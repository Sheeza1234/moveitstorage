import { IBillingService } from "../interfaces/IBillingService";
import { 
  StorageInvoice, 
  CreateInvoiceInput, 
  InvoiceStatus, 
  BillingSummary, 
  PaymentRecord, 
  RecordPaymentInput,
  InvoiceLineItem,
  BillingReconciliationDiscrepancy,
  BillingReconciliationReport
} from "@/types/billing";
import { MOCK_INVOICES, MOCK_PAYMENTS, MOCK_CUSTOMERS, MOCK_CONTRACTS, MOCK_ALLOCATIONS } from "./mock-db";
import { auditService } from "./audit-service";

const DEFAULT_TAX_RATE = 0.05; // 5% VAT in UAE

function processInvoiceStatus(invoice: StorageInvoice): StorageInvoice {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(invoice.dueDate);
  due.setHours(0, 0, 0, 0);

  let updatedStatus = invoice.status;

  // Derive status if not cancelled/void
  if (invoice.status !== 'CANCELLED' && invoice.status !== 'VOID' && invoice.status !== 'DRAFT') {
    if (invoice.balanceDue <= 0) {
      updatedStatus = 'PAID';
    } else if (invoice.amountPaid > 0 && invoice.balanceDue > 0) {
      if (due.getTime() < now.getTime()) {
        updatedStatus = 'OVERDUE';
      } else {
        updatedStatus = 'PARTIALLY_PAID';
      }
    } else if (invoice.amountPaid === 0) {
      if (due.getTime() < now.getTime()) {
        updatedStatus = 'OVERDUE';
      } else {
        updatedStatus = 'ISSUED';
      }
    }
  }

  return {
    ...invoice,
    status: updatedStatus,
    paymentStatus: updatedStatus === 'PAID' ? 'PAID' : updatedStatus === 'OVERDUE' ? 'OVERDUE' : 'PENDING',
    portalInvoiceUrl: invoice.portalInvoiceUrl || `/portal/invoices/${invoice.invoiceNumber}`,
    portalRefId: invoice.portalRefId || `portal-ref-${invoice.id}`,
    portalSyncStatus: invoice.portalSyncStatus || "SYNCED",
  };
}

export class MockBillingService implements IBillingService {
  private invoices: StorageInvoice[] = MOCK_INVOICES;
  private payments: PaymentRecord[] = MOCK_PAYMENTS;

  async getInvoices(): Promise<StorageInvoice[]> {
    return MOCK_INVOICES.map(processInvoiceStatus);
  }

  async getInvoiceById(id: string): Promise<StorageInvoice | null> {
    const inv = MOCK_INVOICES.find((i) => i.id === id);
    if (!inv) return null;
    const processed = processInvoiceStatus(inv);
    return { ...processed };
  }

  async createInvoice(input: CreateInvoiceInput): Promise<StorageInvoice> {
    // 1. Customer existence
    const customer = MOCK_CUSTOMERS.find((c) => c.id === input.customerId);
    if (!customer) {
      throw new Error(`Customer with ID "${input.customerId}" not found.`);
    }

    // 2. Contract existence & ownership validation
    const contract = MOCK_CONTRACTS.find((c) => c.id === input.contractId);
    if (!contract) {
      throw new Error(`Contract with ID "${input.contractId}" not found.`);
    }
    if (contract.customerId !== input.customerId) {
      throw new Error(`Contract "${contract.contractCode}" does not belong to customer ${customer.name}.`);
    }
    if (contract.status === 'CANCELLED') {
      throw new Error(`Contract "${contract.contractCode}" is CANCELLED and cannot be billed.`);
    }

    // 3. Billing period validation
    const start = new Date(input.billingPeriodStart);
    const end = new Date(input.billingPeriodEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid billing period start or end date.");
    }
    if (end.getTime() < start.getTime()) {
      throw new Error("Billing period end date cannot be before start date.");
    }

    // 4. Due date validation
    const due = new Date(input.dueDate);
    if (isNaN(due.getTime())) {
      throw new Error("Invalid invoice due date.");
    }

    // 5. Line items validation & amounts calculation
    if (!input.lineItems || input.lineItems.length === 0) {
      throw new Error("Invoice must contain at least one line item.");
    }

    const calculatedLineItems: InvoiceLineItem[] = input.lineItems.map((item, idx) => {
      if (item.quantity <= 0) {
        throw new Error(`Line item "${item.description}" quantity must be greater than 0.`);
      }
      if (item.unitRate < 0) {
        throw new Error(`Line item "${item.description}" unit rate cannot be negative.`);
      }
      const lineAmount = item.quantity * item.unitRate;
      return {
        id: `li-${Date.now()}-${idx}`,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitRate: item.unitRate,
        amount: Number(lineAmount.toFixed(2)),
        allocationId: item.allocationId,
      };
    });

    const subtotal = calculatedLineItems.reduce((sum, item) => sum + item.amount, 0);
    const taxRate = input.taxRate !== undefined ? input.taxRate : DEFAULT_TAX_RATE;
    const taxAmount = Number((subtotal * taxRate).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));

    const seq = (this.invoices.length + 1).toString().padStart(5, '0');
    const invoiceNumber = `INV-2026-${seq}`;
    const nowIso = new Date().toISOString();

    const newInvoice: StorageInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      customerId: input.customerId,
      customerName: customer.name,
      contractId: input.contractId,
      contractCode: contract.contractCode,
      allocationIds: contract.allocationIds || [],
      billingPeriodStart: input.billingPeriodStart,
      billingPeriodEnd: input.billingPeriodEnd,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      currency: input.currency || 'AED',
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      amountPaid: 0,
      balanceDue: totalAmount,
      status: 'DRAFT',
      lineItems: calculatedLineItems,
      notes: input.notes,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const processed = processInvoiceStatus(newInvoice);
    this.invoices.unshift(processed);
    await auditService.recordEvent({
      entityType: "INVOICE",
      entityId: processed.id,
      action: "INVOICE_CREATED",
      description: `Storage invoice ${processed.invoiceNumber} created for ${processed.customerName} (AED ${processed.totalAmount}).`,
      performedBy: "Finance Staff",
      metadata: { invoiceNumber: processed.invoiceNumber, totalAmount: processed.totalAmount, customerId: processed.customerId },
    });
    return { ...processed };
  }

  async updateInvoice(id: string, input: Partial<CreateInvoiceInput>): Promise<StorageInvoice> {
    const index = this.invoices.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new Error(`Invoice "${id}" not found.`);
    }

    const existing = this.invoices[index];
    if (existing.status === 'PAID' || existing.status === 'VOID' || existing.status === 'CANCELLED') {
      throw new Error(`Cannot edit an invoice in ${existing.status} status.`);
    }

    let updatedLineItems = existing.lineItems;
    let subtotal = existing.subtotal;
    const taxRate = input.taxRate !== undefined ? input.taxRate : existing.taxRate;

    if (input.lineItems && input.lineItems.length > 0) {
      updatedLineItems = input.lineItems.map((item, idx) => {
        if (item.quantity <= 0) {
          throw new Error(`Line item "${item.description}" quantity must be greater than 0.`);
        }
        if (item.unitRate < 0) {
          throw new Error(`Line item "${item.description}" unit rate cannot be negative.`);
        }
        const lineAmount = item.quantity * item.unitRate;
        return {
          id: `li-${Date.now()}-${idx}`,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitRate: item.unitRate,
          amount: Number(lineAmount.toFixed(2)),
          allocationId: item.allocationId,
        };
      });
      subtotal = updatedLineItems.reduce((sum, item) => sum + item.amount, 0);
    }

    const taxAmount = Number((subtotal * taxRate).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));
    const balanceDue = Math.max(0, Number((totalAmount - existing.amountPaid).toFixed(2)));

    const updated: StorageInvoice = {
      ...existing,
      billingPeriodStart: input.billingPeriodStart || existing.billingPeriodStart,
      billingPeriodEnd: input.billingPeriodEnd || existing.billingPeriodEnd,
      issueDate: input.issueDate || existing.issueDate,
      dueDate: input.dueDate || existing.dueDate,
      currency: input.currency || existing.currency,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      balanceDue,
      lineItems: updatedLineItems,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      updatedAt: new Date().toISOString(),
    };

    const processed = processInvoiceStatus(updated);
    this.invoices[index] = processed;
    return { ...processed };
  }

  async issueInvoice(id: string): Promise<StorageInvoice> {
    const index = this.invoices.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new Error(`Invoice "${id}" not found.`);
    }

    const existing = this.invoices[index];
    if (existing.status !== 'DRAFT') {
      throw new Error(`Only DRAFT invoices can be issued. Current status: ${existing.status}.`);
    }

    const issued: StorageInvoice = {
      ...existing,
      status: 'ISSUED',
      updatedAt: new Date().toISOString(),
    };

    const processed = processInvoiceStatus(issued);
    this.invoices[index] = processed;
    await auditService.recordEvent({
      entityType: "INVOICE",
      entityId: processed.id,
      action: "INVOICE_ISSUED",
      description: `Storage invoice ${processed.invoiceNumber} issued to ${processed.customerName} (AED ${processed.totalAmount}).`,
      performedBy: "Finance Staff",
      metadata: { invoiceNumber: processed.invoiceNumber, totalAmount: processed.totalAmount },
    });
    return { ...processed };
  }

  async voidInvoice(id: string): Promise<StorageInvoice> {
    const index = this.invoices.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new Error(`Invoice "${id}" not found.`);
    }

    const existing = this.invoices[index];
    if (existing.status === 'PAID') {
      throw new Error("Cannot void a fully paid invoice.");
    }

    const voided: StorageInvoice = {
      ...existing,
      status: 'VOID',
      balanceDue: 0,
      updatedAt: new Date().toISOString(),
    };

    this.invoices[index] = voided;
    return { ...voided };
  }

  async cancelInvoice(id: string): Promise<StorageInvoice> {
    const index = this.invoices.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new Error(`Invoice "${id}" not found.`);
    }

    const existing = this.invoices[index];
    if (existing.status === 'PAID') {
      throw new Error("Cannot cancel a fully paid invoice.");
    }

    const cancelled: StorageInvoice = {
      ...existing,
      status: 'CANCELLED',
      balanceDue: 0,
      updatedAt: new Date().toISOString(),
    };

    this.invoices[index] = cancelled;
    return { ...cancelled };
  }

  async recordPayment(input: RecordPaymentInput): Promise<StorageInvoice> {
    const index = this.invoices.findIndex((i) => i.id === input.invoiceId);
    if (index === -1) {
      throw new Error(`Invoice "${input.invoiceId}" not found.`);
    }

    const invoice = this.invoices[index];

    if (invoice.status === 'VOID' || invoice.status === 'CANCELLED') {
      throw new Error(`Cannot record payment on a ${invoice.status} invoice.`);
    }

    if (input.amount <= 0) {
      throw new Error("Payment amount must be greater than 0.");
    }

    // Overpayment protection check
    const newTotalPaid = Number((invoice.amountPaid + input.amount).toFixed(2));
    if (newTotalPaid > invoice.totalAmount) {
      const maxAllowed = Number((invoice.totalAmount - invoice.amountPaid).toFixed(2));
      throw new Error(`Payment amount (AED ${input.amount}) exceeds outstanding balance (AED ${maxAllowed}). Overpayment is not permitted.`);
    }

    const nowIso = new Date().toISOString();
    const paymentRecord: PaymentRecord = {
      id: `pay-${Date.now()}`,
      invoiceId: input.invoiceId,
      amount: input.amount,
      paymentDate: input.paymentDate,
      paymentMethod: input.paymentMethod,
      referenceNumber: input.referenceNumber || `REF-${Date.now().toString().slice(-6)}`,
      recordedBy: input.recordedBy || 'Finance Operations Staff',
      notes: input.notes,
      createdAt: nowIso,
    };

    this.payments.unshift(paymentRecord);

    const newBalanceDue = Math.max(0, Number((invoice.totalAmount - newTotalPaid).toFixed(2)));

    let newStatus: InvoiceStatus = invoice.status;
    if (newBalanceDue === 0) {
      newStatus = 'PAID';
    } else if (newTotalPaid > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    const updatedInvoice: StorageInvoice = {
      ...invoice,
      amountPaid: newTotalPaid,
      balanceDue: newBalanceDue,
      status: newStatus,
      updatedAt: nowIso,
    };

    const processed = processInvoiceStatus(updatedInvoice);
    this.invoices[index] = processed;
    await auditService.recordEvent({
      entityType: "INVOICE",
      entityId: processed.id,
      action: "PAYMENT_RECORDED",
      description: `Payment of AED ${input.amount} recorded for ${processed.invoiceNumber} via ${input.paymentMethod}.`,
      performedBy: input.recordedBy || "Finance Operations Staff",
      metadata: { amount: input.amount, method: input.paymentMethod, previousValue: invoice.status, newValue: processed.status },
    });
    return { ...processed };
  }

  async getCustomerInvoices(customerId: string): Promise<StorageInvoice[]> {
    const all = await this.getInvoices();
    return all.filter((i) => i.customerId === customerId);
  }

  async getContractInvoices(contractId: string): Promise<StorageInvoice[]> {
    const all = await this.getInvoices();
    return all.filter((i) => i.contractId === contractId);
  }

  async getBillingSummary(): Promise<BillingSummary> {
    const all = await this.getInvoices();
    const activeInvoices = all.filter((i) => i.status !== 'VOID' && i.status !== 'CANCELLED');

    const totalInvoices = all.length;
    const draftInvoices = all.filter((i) => i.status === 'DRAFT').length;
    const issuedInvoices = all.filter((i) => i.status === 'ISSUED').length;
    const paidInvoices = all.filter((i) => i.status === 'PAID').length;
    const overdueInvoices = all.filter((i) => i.status === 'OVERDUE').length;

    const totalSubtotal = activeInvoices.reduce((sum, i) => sum + i.subtotal, 0);
    const totalTax = activeInvoices.reduce((sum, i) => sum + i.taxAmount, 0);
    const totalAmount = activeInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const totalPaid = activeInvoices.reduce((sum, i) => sum + i.amountPaid, 0);
    const totalOutstanding = activeInvoices.reduce((sum, i) => sum + i.balanceDue, 0);
    const totalOverdueAmount = all.filter((i) => i.status === 'OVERDUE').reduce((sum, i) => sum + i.balanceDue, 0);

    return {
      totalInvoices,
      draftInvoices,
      issuedInvoices,
      paidInvoices,
      overdueInvoices,
      totalSubtotal,
      totalTax,
      totalAmount,
      totalPaid,
      totalOutstanding,
      totalOverdueAmount,
    };
  }

  async getInvoicePaymentHistory(invoiceId: string): Promise<PaymentRecord[]> {
    return this.payments.filter((p) => p.invoiceId === invoiceId);
  }

  async reconcileBillingWithStorage(customerId?: string): Promise<BillingReconciliationReport> {
    const allInvoices = await this.getInvoices();
    const targetInvoices = customerId ? allInvoices.filter((i) => i.customerId === customerId) : allInvoices;
    const targetAllocations = customerId
      ? MOCK_ALLOCATIONS.filter((a) => a.customerId === customerId)
      : MOCK_ALLOCATIONS;

    const discrepancies: BillingReconciliationDiscrepancy[] = [];
    const nowIso = new Date().toISOString();

    // 1. Validate Active Allocations vs Billing Line Items (Identify Unbilled Allocations)
    for (const alloc of targetAllocations) {
      if (alloc.status === "CONFIRMED" || alloc.status === "ACTIVE") {
        const isBilled = targetInvoices.some(
          (inv) =>
            inv.status !== "VOID" &&
            inv.status !== "CANCELLED" &&
            (inv.allocationIds.includes(alloc.id) ||
              inv.lineItems.some((li) => li.allocationId === alloc.id))
        );

        if (!isBilled) {
          discrepancies.push({
            id: `disc-unbilled-${alloc.id}`,
            discrepancyType: "UNBILLED_ALLOCATION",
            severity: "CRITICAL",
            customerId: alloc.customerId,
            customerName: alloc.customerName,
            allocationId: alloc.id,
            allocationCode: alloc.allocationCode,
            description: `Active storage allocation '${alloc.allocationCode}' (${alloc.allocatedCapacity} SQ.FT at ${alloc.warehouseName}) has not been billed in any active invoice.`,
            expectedValue: `Billed Line Item for ${alloc.allocatedCapacity} SQ.FT`,
            actualValue: "Unbilled / Missing Invoice Line Item",
            detectedAt: nowIso,
          });
        }
      }
    }

    // 2. Validate Invoice Line Items & Rates against Contracts & Allocations
    for (const inv of targetInvoices) {
      if (inv.status === "VOID" || inv.status === "CANCELLED") continue;

      const contract = MOCK_CONTRACTS.find((c) => c.id === inv.contractId);

      // Check unlinked line items
      for (const li of inv.lineItems) {
        if (!li.allocationId && inv.allocationIds.length === 0) {
          discrepancies.push({
            id: `disc-unlinked-${inv.id}-${li.id}`,
            discrepancyType: "UNLINKED_LINE_ITEM",
            severity: "WARNING",
            customerId: inv.customerId,
            customerName: inv.customerName,
            contractId: inv.contractId,
            contractCode: inv.contractCode,
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            description: `Line item '${li.description}' on Invoice ${inv.invoiceNumber} is not associated with any active storage allocation ID.`,
            expectedValue: "Linked Allocation ID",
            actualValue: "Unlinked / Null Allocation ID",
            detectedAt: nowIso,
          });
        }
      }

      // Check Contract Rate & Capacity Consistency
      if (contract) {
        const expectedMonthlyRate = contract.monthlyRate || contract.storageRate;
        for (const li of inv.lineItems) {
          if (expectedMonthlyRate && li.unitRate > 0 && Math.abs(li.unitRate - expectedMonthlyRate) > 0.01) {
            discrepancies.push({
              id: `disc-rate-${inv.id}-${li.id}`,
              discrepancyType: "RATE_CAPACITY_MISMATCH",
              severity: "WARNING",
              customerId: inv.customerId,
              customerName: inv.customerName,
              contractId: contract.id,
              contractCode: contract.contractCode,
              invoiceId: inv.id,
              invoiceNumber: inv.invoiceNumber,
              description: `Billed unit rate (${li.unitRate} ${inv.currency}) on Invoice ${inv.invoiceNumber} differs from contract agreement rate (${expectedMonthlyRate} ${contract.currency}).`,
              expectedValue: `${expectedMonthlyRate} ${contract.currency}`,
              actualValue: `${li.unitRate} ${inv.currency}`,
              detectedAt: nowIso,
            });
          }
        }
      }

      // Check Overdue Status Consistency
      const nowTime = new Date().setHours(0, 0, 0, 0);
      const dueTime = new Date(inv.dueDate).setHours(0, 0, 0, 0);
      if (dueTime < nowTime && inv.balanceDue > 0 && inv.status !== "OVERDUE" && inv.status !== "PAID") {
        discrepancies.push({
          id: `disc-overdue-${inv.id}`,
          discrepancyType: "OVERDUE_PAYMENT_MISMATCH",
          severity: "CRITICAL",
          customerId: inv.customerId,
          customerName: inv.customerName,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          description: `Invoice ${inv.invoiceNumber} past due date (${inv.dueDate}) with unpaid balance (${inv.balanceDue} ${inv.currency}) is marked '${inv.status}' instead of OVERDUE.`,
          expectedValue: "Status: OVERDUE",
          actualValue: `Status: ${inv.status}`,
          detectedAt: nowIso,
        });
      }
    }

    return {
      totalAllocationsChecked: targetAllocations.length,
      totalInvoicesChecked: targetInvoices.length,
      discrepanciesCount: discrepancies.length,
      discrepancies,
      reconciledAt: nowIso,
    };
  }
}
