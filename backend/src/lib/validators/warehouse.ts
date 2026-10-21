import { z } from "zod";

export const warehouseFormSchema = z.object({
  name: z.string().min(3, "Warehouse name must be at least 3 characters long"),
  code: z
    .string()
    .min(2, "Warehouse code must be at least 2 characters")
    .max(15, "Warehouse code cannot exceed 15 characters")
    .regex(/^[A-Z0-9_-]+$/i, "Code must contain only letters, numbers, hyphens, or underscores"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City is required"),
  country: z.string().min(2, "Country is required"),
  description: z.string().optional(),
  capacityUnit: z.enum(["SQ_FT", "CU_FT"]),
  totalCapacitySqFt: z
    .number()
    .positive("Total capacity must be greater than 0"),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
});

export type WarehouseFormValues = z.infer<typeof warehouseFormSchema>;
