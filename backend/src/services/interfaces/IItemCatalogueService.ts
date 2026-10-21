import { CatalogueItem } from "@/types/packing-list";

export interface IItemCatalogueService {
  getCatalogueItems(category?: string): Promise<CatalogueItem[]>;
  getCatalogueItemById(id: string): Promise<CatalogueItem | null>;
  addCatalogueItem(input: Omit<CatalogueItem, "id" | "createdAt" | "updatedAt">, performedBy?: string): Promise<CatalogueItem>;
  updateCatalogueItem(id: string, updates: Partial<CatalogueItem>, performedBy?: string): Promise<CatalogueItem>;
  deleteCatalogueItem(id: string, performedBy?: string): Promise<boolean>;
}
