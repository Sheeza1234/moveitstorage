import { z } from "zod";

export const customerFormSchema = z
  .object({
    type: z.enum(["INDIVIDUAL", "CORPORATE"]),
    companyName: z.string().max(100, "Company name cannot exceed 100 characters").optional(),
    firstName: z.string().max(100, "First name cannot exceed 100 characters").optional(),
    lastName: z.string().max(100, "Last name cannot exceed 100 characters").optional(),
    email: z
      .string()
      .min(1, "Email address is required")
      .email("Please enter a valid email address")
      .max(254, "Email address cannot exceed 254 characters"),
    phone: z
      .string()
      .min(5, "Phone number must be at least 5 digits")
      .max(30, "Phone number cannot exceed 30 characters"),
    alternatePhone: z.string().max(30, "Alternate phone cannot exceed 30 characters").optional(),
    address: z
      .string()
      .min(5, "Address must be at least 5 characters")
      .max(250, "Address cannot exceed 250 characters"),
    city: z.string().min(2, "City is required").max(100),
    country: z.string().min(2, "Country is required").max(100),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional(),
    requiredSqFt: z.number().optional(),
    storageStartDate: z.string().optional(),
    storageDurationMonths: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "CORPORATE") {
      if (!data.companyName || data.companyName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Company name is required for corporate customers",
          path: ["companyName"],
        });
      }
    }
    if (data.type === "INDIVIDUAL") {
      if (!data.firstName || data.firstName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "First name is required for individual customers",
          path: ["firstName"],
        });
      }
      if (!data.lastName || data.lastName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Last name is required for individual customers",
          path: ["lastName"],
        });
      }
    }
  });

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
