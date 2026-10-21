import { z } from "zod";

export const invoiceLineItemSchema = z.object({
  description: z.string().min(2, "Description must be at least 2 characters").max(200),
  quantity: z.number().gt(0, "Quantity must be greater than 0"),
  unit: z.string().min(1, "Unit is required"),
  unitRate: z.number().min(0, "Unit rate cannot be negative"),
  allocationId: z.string().optional(),
});

export const invoiceFormSchema = z
  .object({
    customerId: z.string().min(1, "Customer selection is required"),
    contractId: z.string().min(1, "Contract selection is required"),
    billingPeriodStart: z.string().min(1, "Billing period start date is required"),
    billingPeriodEnd: z.string().min(1, "Billing period end date is required"),
    issueDate: z.string().min(1, "Issue date is required"),
    dueDate: z.string().min(1, "Due date is required"),
    currency: z.string().min(1, "Currency is required").default("AED"),
    taxRate: z.number().min(0, "Tax rate cannot be negative").default(0.05),
    lineItems: z.array(invoiceLineItemSchema).min(1, "At least one line item is required"),
    notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.billingPeriodStart && data.billingPeriodEnd) {
      const start = new Date(data.billingPeriodStart);
      const end = new Date(data.billingPeriodEnd);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (end.getTime() < start.getTime()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Billing period end date cannot be before start date",
            path: ["billingPeriodEnd"],
          });
        }
      }
    }
    if (data.issueDate && data.dueDate) {
      const issue = new Date(data.issueDate);
      const due = new Date(data.dueDate);
      if (!isNaN(issue.getTime()) && !isNaN(due.getTime())) {
        if (due.getTime() < issue.getTime()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invoice due date cannot be before issue date",
            path: ["dueDate"],
          });
        }
      }
    }
  });

export const paymentFormSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.number().gt(0, "Payment amount must be greater than 0"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.enum([
    "BANK_TRANSFER",
    "CASH",
    "CREDIT_CARD",
    "CHEQUE",
    "OTHER",
  ]),
  referenceNumber: z.string().max(100, "Reference number cannot exceed 100 characters").optional(),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
export type PaymentFormValues = z.infer<typeof paymentFormSchema>;
