import { z } from "zod";

export const allocationFormSchema = z.object({
  customerId: z.string().min(1, "Please select a customer for this storage requirement"),
  storageType: z.enum(["RACK", "SHELF", "FLOOR", "SLOT", "CUSTOM"]),
  requiredCapacity: z
    .number()
    .positive("Required capacity must be greater than 0"),
  capacityUnit: z.enum(["SQ_FT", "CU_FT"]),
  startDate: z.string().min(1, "Storage start date is required"),
  expectedEndDate: z.string().min(1, "Expected end date is required"),
  preferredWarehouseId: z.string().optional(),
  preferredLocationType: z.enum(["RACK", "SHELF", "FLOOR", "SLOT", "CUSTOM"]).optional(),
  specialRequirements: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

export type AllocationFormValues = z.infer<typeof allocationFormSchema>;
