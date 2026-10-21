import { z } from "zod";

export const packageItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  fragile: z.boolean().optional(),
  heavy: z.boolean().optional(),
  specialHandling: z.string().optional(),
  notes: z.string().optional(),
});

export const recordItemsInSchema = z.object({
  customerId: z.string().min(1, "Please select a customer"),
  allocationId: z.string().min(1, "Please select an active storage allocation"),
  warehouseId: z.string().min(1, "Please select a destination warehouse"),
  locationId: z.string().min(1, "Please select a warehouse location slot"),
  packageType: z.enum(['CRATE', 'PALLET', 'BOX', 'CONTAINER', 'LOOSE', 'RACK_UNIT', 'CUSTOM']),
  itemCount: z.number().min(1, "Item count must be at least 1"),
  capacityFootprintSqFt: z.number().min(1, "Physical capacity footprint must be greater than zero"),
  capacityUnit: z.enum(['SQ_FT', 'CU_FT']),
  description: z.string().min(3, "Please provide a description of the stored items"),
  weightKg: z.number().min(0).optional(),
  volumeCuFt: z.number().min(0).optional(),
  notes: z.string().optional(),
  items: z.array(packageItemSchema).optional(),
});

export const recordItemsOutSchema = z.object({
  inventoryId: z.string().min(1, "Inventory record is required"),
  releaseQuantity: z.number().min(1, "Release quantity must be at least 1"),
  reason: z.string().min(3, "Release reason is required"),
  performedBy: z.string().optional(),
  notes: z.string().optional(),
});

export const moveInventorySchema = z.object({
  inventoryId: z.string().min(1, "Inventory record is required"),
  toWarehouseId: z.string().min(1, "Destination warehouse is required"),
  toLocationId: z.string().min(1, "Destination location slot is required"),
  reason: z.string().min(3, "Movement reason is required"),
  performedBy: z.string().optional(),
  notes: z.string().optional(),
});

export type RecordItemsInFormValues = z.infer<typeof recordItemsInSchema>;
export type RecordItemsOutFormValues = z.infer<typeof recordItemsOutSchema>;
export type MoveInventoryFormValues = z.infer<typeof moveInventorySchema>;
