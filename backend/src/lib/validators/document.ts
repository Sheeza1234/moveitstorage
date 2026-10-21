import { z } from "zod";

export const documentFormSchema = z
  .object({
    customerId: z.string().min(1, "Customer selection is required"),
    contractId: z.string().optional(),
    documentType: z.enum([
      "SIGNED_CONTRACT",
      "CUSTOMER_ID",
      "TRADE_LICENSE",
      "EMIRATES_ID",
      "INSURANCE",
      "INVENTORY_LIST",
      "INSPECTION_REPORT",
      "SUPPORTING",
      "OTHER",
    ]),
    title: z.string().min(2, "Document title must be at least 2 characters").max(150),
    fileName: z.string().min(1, "File name is required").max(200),
    fileType: z.string().default("application/pdf"),
    fileSize: z.number().gt(0, "File size must be greater than 0"),
    issueDate: z.string().min(1, "Issue date is required"),
    expiryDate: z.string().optional(),
    notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.issueDate && data.expiryDate && data.expiryDate.trim().length > 0) {
      const issue = new Date(data.issueDate);
      const expiry = new Date(data.expiryDate);
      if (!isNaN(issue.getTime()) && !isNaN(expiry.getTime())) {
        if (expiry.getTime() < issue.getTime()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Expiry date cannot be before issue date",
            path: ["expiryDate"],
          });
        }
      }
    }
  });

export type DocumentFormValues = z.infer<typeof documentFormSchema>;
