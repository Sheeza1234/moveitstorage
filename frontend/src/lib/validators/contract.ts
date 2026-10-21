import { z } from "zod";

export const contractFormSchema = z
  .object({
    customerId: z.string().min(1, "Customer selection is required"),
    contractType: z.enum([
      "STORAGE",
      "LONG_TERM_STORAGE",
      "SHORT_TERM_STORAGE",
      "CORPORATE_STORAGE",
    ]),
    allocationIds: z.array(z.string()).min(1, "Select at least one storage allocation"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    storageRate: z.number().gt(0, "Storage rate must be greater than 0"),
    rateUnit: z.enum(["SQ_FT", "CU_FT", "MONTH", "FLAT"]),
    billingFrequency: z.enum(["MONTHLY", "QUARTERLY", "ANNUALLY", "ONE_TIME"]),
    currency: z.string().min(1, "Currency is required").default("AED"),
    depositAmount: z.number().min(0, "Deposit amount cannot be negative").default(0),
    notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (end.getTime() <= start.getTime()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "End date must be strictly after start date",
            path: ["endDate"],
          });
        }
      }
    }
  });

export type ContractFormValues = z.infer<typeof contractFormSchema>;
