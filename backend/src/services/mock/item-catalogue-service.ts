import { CatalogueItem } from "@/types/packing-list";
import { IItemCatalogueService } from "../interfaces/IItemCatalogueService";
import { auditService } from "./audit-service";

export const INITIAL_CATALOGUE_ITEMS: CatalogueItem[] = [
  { id: "cat-1", name: "1 Seater Sofa", defaultCbm: 0.57, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-2", name: "2 Seater Sofa", defaultCbm: 1.0, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-3", name: "3 Seater Sofa", defaultCbm: 1.5, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-4", name: "3 Seater Bench", defaultCbm: 0.42, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-5", name: "4 Seater Bench", defaultCbm: 0.56, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-6", name: "Antenna", defaultCbm: 0.14, category: "Electronics", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-7", name: "Arm Chair", defaultCbm: 0.57, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-8", name: "Baby's Crib", defaultCbm: 0.7, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-9", name: "Bar", defaultCbm: 0.99, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-10", name: "Bar Stool", defaultCbm: 0.19, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-11", name: "BBQ Grill", defaultCbm: 0.65, category: "Outdoor", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-12", name: "Bean Bag", defaultCbm: 0.23, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-13", name: "Bicycle", defaultCbm: 0.5, category: "Sports & Leisure", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-14", name: "Book Shelf (L)", defaultCbm: 1.0, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-15", name: "Book Shelf (S)", defaultCbm: 0.57, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-16", name: "Bunk Bed", defaultCbm: 0.65, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-17", name: "Cabinet", defaultCbm: 0.5, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-18", name: "Carpet", defaultCbm: 0.28, category: "Household", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-19", name: "Centre Table", defaultCbm: 0.14, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-20", name: "Chandeliers(S/m)", defaultCbm: 0.5, category: "Lighting", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-21", name: "Chest of Drawers", defaultCbm: 0.5, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-22", name: "Cloths Drying Rack", defaultCbm: 0.25, category: "Household", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-23", name: "Coffee Table", defaultCbm: 0.14, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-24", name: "Computer Monitor", defaultCbm: 0.5, category: "Electronics", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-25", name: "Cooker", defaultCbm: 0.6, category: "Appliances", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-26", name: "CPU", defaultCbm: 0.5, category: "Electronics", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-27", name: "Curtains", defaultCbm: 1.0, category: "Household", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-28", name: "Dining Chairs", defaultCbm: 0.19, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-29", name: "Dining Table(L)", defaultCbm: 0.84, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-30", name: "Dining Table(S)", defaultCbm: 0.42, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-31", name: "Dishwasher", defaultCbm: 0.6, category: "Appliances", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-32", name: "Dog Kennel", defaultCbm: 0.25, category: "Outdoor", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-33", name: "Dryer", defaultCbm: 0.3, category: "Appliances", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-34", name: "Exercise Machine", defaultCbm: 1.0, category: "Sports & Leisure", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-35", name: "Fish Tank", defaultCbm: 0.22, category: "Household", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-36", name: "Foot Rest", defaultCbm: 0.3, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-37", name: "Freezer", defaultCbm: 0.39, category: "Appliances", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-38", name: "Fridge", defaultCbm: 0.99, category: "Appliances", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-39", name: "Ironing Board", defaultCbm: 0.17, category: "Household", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-40", name: "King Bed", defaultCbm: 2.7, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-41", name: "Lamps", defaultCbm: 0.5, category: "Lighting", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-42", name: "Linen Basket", defaultCbm: 0.08, category: "Household", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-43", name: "Microwave", defaultCbm: 0.19, category: "Appliances", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-44", name: "Mirror", defaultCbm: 0.6, category: "Household", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-45", name: "Office Table", defaultCbm: 0.42, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-46", name: "Paintings", defaultCbm: 0.19, category: "Household", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-47", name: "Piano (Keyboard)", defaultCbm: 0.39, category: "Musical", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-48", name: "Plants (Large)", defaultCbm: 0.25, category: "Outdoor", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-49", name: "Plants (Medium)", defaultCbm: 0.12, category: "Outdoor", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-50", name: "Plants (Small)", defaultCbm: 0.08, category: "Outdoor", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-51", name: "Queen Bed", defaultCbm: 1.5, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-52", name: "Shoe Rack", defaultCbm: 0.5, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-53", name: "Side Server", defaultCbm: 0.28, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-54", name: "Side Table", defaultCbm: 0.14, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-55", name: "Single Bed", defaultCbm: 0.7, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-56", name: "Sofa Cum Bed", defaultCbm: 0.99, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-57", name: "Speakers", defaultCbm: 0.14, category: "Electronics", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-58", name: "Stereo", defaultCbm: 0.14, category: "Electronics", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-59", name: "Swing Set", defaultCbm: 1.5, category: "Outdoor", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-60", name: "Table Fan", defaultCbm: 0.08, category: "Appliances", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-61", name: "Trampoline", defaultCbm: 0.65, category: "Outdoor", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-62", name: "TV", defaultCbm: 0.5, category: "Electronics", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-63", name: "TV stand (S/M)", defaultCbm: 0.5, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-64", name: "Vacuum Cleaner", defaultCbm: 0.08, category: "Appliances", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-65", name: "Wall Unit", defaultCbm: 0.99, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-66", name: "Wardrobe (2d)", defaultCbm: 0.5, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-67", name: "Wardrobe (3d)", defaultCbm: 0.79, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-68", name: "Wardrobe (4d)", defaultCbm: 1.13, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-69", name: "Washing Machine", defaultCbm: 0.39, category: "Appliances", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-70", name: "Water Dispenser", defaultCbm: 0.3, category: "Appliances", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-71", name: "Workstation", defaultCbm: 2.0, category: "Furniture", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "cat-72", name: "Other Heavy Items", defaultCbm: 0.0, category: "General", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
];

export class MockItemCatalogueService implements IItemCatalogueService {
  private items: CatalogueItem[] = [...INITIAL_CATALOGUE_ITEMS];

  async getCatalogueItems(category?: string): Promise<CatalogueItem[]> {
    if (category) {
      return this.items.filter((item) => item.category.toLowerCase() === category.toLowerCase());
    }
    return [...this.items];
  }

  async getCatalogueItemById(id: string): Promise<CatalogueItem | null> {
    const found = this.items.find((i) => i.id === id);
    return found ? { ...found } : null;
  }

  async addCatalogueItem(
    input: Omit<CatalogueItem, "id" | "createdAt" | "updatedAt">,
    performedBy: string = "Admin User"
  ): Promise<CatalogueItem> {
    if (!input.name || input.name.trim() === "") {
      throw new Error("Item name is required.");
    }
    if (input.defaultCbm < 0) {
      throw new Error("Default CBM cannot be negative.");
    }

    const nowIso = new Date().toISOString();
    const newItem: CatalogueItem = {
      id: `cat-${Date.now()}`,
      name: input.name.trim(),
      defaultCbm: input.defaultCbm,
      category: input.category || "General",
      isActive: input.isActive !== undefined ? input.isActive : true,
      notes: input.notes,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.items.push(newItem);

    await auditService.recordEvent({
      entityType: "CATALOGUE",
      entityId: newItem.id,
      action: "CATALOGUE_ITEM_ADDED",
      description: `Added new catalogue item '${newItem.name}' with default CBM ${newItem.defaultCbm}.`,
      performedBy,
      metadata: { item: newItem },
    });

    return { ...newItem };
  }

  async updateCatalogueItem(
    id: string,
    updates: Partial<CatalogueItem>,
    performedBy: string = "Admin User"
  ): Promise<CatalogueItem> {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) {
      throw new Error(`Catalogue item '${id}' not found.`);
    }

    if (updates.defaultCbm !== undefined && updates.defaultCbm < 0) {
      throw new Error("Default CBM cannot be negative.");
    }

    const updated: CatalogueItem = {
      ...this.items[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.items[idx] = updated;
    return { ...updated };
  }

  async deleteCatalogueItem(id: string, performedBy: string = "Admin User"): Promise<boolean> {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) return false;
    this.items.splice(idx, 1);
    return true;
  }
}
