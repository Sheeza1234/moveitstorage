"use client";

import { useCan } from "@/lib/use-can";
import React, { useEffect, useState } from "react";
import { services } from "@/services";
import { PackingList, CatalogueItem } from "@/types/packing-list";
import { useUIStore } from "@/store/use-ui-store";
import { PackingListForm } from "@/components/packing-list/packing-list-form";
import { 
  Boxes, 
  Plus, 
  Search, 
  FileText, 
  Sparkles,
  Settings,
  X
} from "lucide-react";

export default function PackingListsPage() {
  const can = useCan();
  const currentRole = useUIStore((state) => state.currentRole);
  const canManageCatalogue = can("PACKING_LIST", "EDIT");

  const [packingLists, setPackingLists] = useState<PackingList[]>([]);
  const [selectedPL, setSelectedPL] = useState<PackingList | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Catalogue Management Modal State
  const [showCatalogueModal, setShowCatalogueModal] = useState(false);
  const [catalogueItems, setCatalogueItems] = useState<CatalogueItem[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatCbm, setNewCatCbm] = useState(0.5);
  const [newCatCategory, setNewCatCategory] = useState("Furniture");

  const loadLists = async () => {
    try {
      const lists = await services.packingListService.getPackingLists();
      setPackingLists(lists);
    } catch (err) {
      console.error("Failed to load packing lists:", err);
    }
  };

  const loadCatalogue = async () => {
    try {
      const items = await services.itemCatalogueService.getCatalogueItems();
      setCatalogueItems(items);
    } catch (err) {
      console.error("Failed to load catalogue:", err);
    }
  };

  useEffect(() => {
    let mounted = true;
    services.packingListService.getPackingLists().then((lists) => {
      if (mounted) setPackingLists(lists);
    });
    services.itemCatalogueService.getCatalogueItems().then((items) => {
      if (mounted) setCatalogueItems(items);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleAddCatalogueItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await services.itemCatalogueService.addCatalogueItem(
        {
          name: newCatName,
          defaultCbm: Number(newCatCbm),
          category: newCatCategory,
          isActive: true,
        },
        "Admin User"
      );
      setNewCatName("");
      setNewCatCbm(0.5);
      await loadCatalogue();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const filteredLists = packingLists.filter((pl) => {
    const matchesSearch = 
      pl.packingListNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pl.header.personName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pl.header.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || pl.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-moveit-text tracking-tight flex items-center gap-2">
            <Boxes className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            MoveIt Packing Lists & CBM Catalogue
          </h1>
          <p className="text-xs text-moveit-muted mt-1">
            Official digital Packing Lists, CBM total calculations, Extra Item reviews & versioning engine.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canManageCatalogue && (
            <button
              onClick={() => setShowCatalogueModal(true)}
              className="px-3.5 py-2 bg-moveit-surface-raised hover:bg-moveit-surface-raised text-moveit-text border border-moveit-border rounded-lg text-xs font-semibold flex items-center gap-2 transition"
            >
              <Settings className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Manage Item Catalogue ({catalogueItems.length})
            </button>
          )}

          {can("PACKING_LIST", "CREATE") && (
<button
            onClick={() => {
              setSelectedPL(null);
              setIsCreatingNew(true);
            }}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg flex items-center gap-2 transition"
          >
            <Plus className="h-4 w-4" />
            Create New Packing List
          </button>
)}
        </div>
      </div>

      {/* Main Content Area */}
      {isCreatingNew || selectedPL ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedPL(null);
                setIsCreatingNew(false);
                loadLists();
              }}
              className="text-xs text-moveit-muted hover:text-moveit-text flex items-center gap-1 font-semibold"
            >
              ← Back to Packing Lists
            </button>
          </div>
          <PackingListForm 
            initialData={selectedPL} 
            onSaved={() => {
              loadLists();
            }} 
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-moveit-card border border-moveit-border p-4 rounded-xl">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-moveit-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer name, company, or S.No..."
                className="w-full bg-moveit-surface border border-moveit-border rounded-lg pl-9 pr-4 py-1.5 text-xs text-moveit-text focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-moveit-muted font-medium">Status Filter:</span>
              {["ALL", "DRAFT", "APPROVED", "REVISED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    statusFilter === st
                      ? "bg-emerald-600 text-white"
                      : "bg-moveit-surface-raised text-moveit-muted hover:bg-moveit-surface-raised"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Packing Lists Grid */}
          {filteredLists.length === 0 ? (
            <div className="p-12 text-center border border-moveit-border rounded-xl bg-moveit-surface text-moveit-muted space-y-3">
              <FileText className="h-10 w-10 text-moveit-muted mx-auto" />
              <p className="text-sm">No packing lists found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => setSelectedPL(pl)}
                  className="bg-moveit-surface border border-moveit-border hover:border-emerald-500/50 p-5 rounded-xl space-y-3 cursor-pointer transition shadow-lg group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-moveit-text group-hover:text-emerald-400 transition">
                      {pl.packingListNumber}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      pl.status === "APPROVED"
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : pl.status === "REVISED"
                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        : "bg-moveit-orange/20 text-moveit-orange border border-moveit-orange/30"
                    }`}>
                      {pl.status} (v{pl.currentVersion})
                    </span>
                  </div>

                  <div>
                    <h4 className="font-semibold text-moveit-text text-xs">
                      {pl.header.personName || pl.header.companyName}
                    </h4>
                    <p className="text-[11px] text-moveit-muted">
                      Job Type: {pl.header.jobTypes.join(", ")}
                    </p>
                  </div>

                  <div className="border-t border-moveit-border-soft pt-2 flex items-center justify-between text-xs">
                    <span className="text-moveit-muted">Total Items: {pl.items.length}</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{pl.summary.totalCbm} CBM</span>
                  </div>

                  {pl.extraItems.filter((e) => e.status === "PENDING_REVIEW").length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      {pl.extraItems.filter((e) => e.status === "PENDING_REVIEW").length} extra item(s) pending review
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Catalogue Management Modal */}
      {showCatalogueModal && (
        <div className="fixed inset-0 z-50 bg-moveit-surface/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-moveit-card border border-moveit-border rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-moveit-border pb-3">
              <h3 className="text-base font-bold text-moveit-text flex items-center gap-2">
                <Settings className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                MoveIt Centralized Item Catalogue (Admin)
              </h3>
              <button
                onClick={() => setShowCatalogueModal(false)}
                className="text-moveit-muted hover:text-moveit-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Add Item Form */}
            <form onSubmit={handleAddCatalogueItem} className="bg-moveit-surface border border-moveit-border p-4 rounded-lg space-y-3">
              <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Add New Catalogue Item</h4>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-moveit-muted mb-1">Item Name:</label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. Executive Desk"
                    className="w-full bg-moveit-card border border-moveit-border rounded px-2.5 py-1 text-moveit-text"
                  />
                </div>
                <div>
                  <label className="block text-moveit-muted mb-1">Default CBM:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newCatCbm}
                    onChange={(e) => setNewCatCbm(parseFloat(e.target.value) || 0)}
                    className="w-full bg-moveit-card border border-moveit-border rounded px-2.5 py-1 text-moveit-text"
                  />
                </div>
                <div>
                  <label className="block text-moveit-muted mb-1">Category:</label>
                  <input
                    type="text"
                    value={newCatCategory}
                    onChange={(e) => setNewCatCategory(e.target.value)}
                    className="w-full bg-moveit-card border border-moveit-border rounded px-2.5 py-1 text-moveit-text"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold text-xs rounded hover:bg-emerald-400"
                >
                  Add to Catalogue
                </button>
              </div>
            </form>

            {/* Catalogue Items List */}
            <div className="border border-moveit-border rounded-lg overflow-hidden max-h-60 overflow-y-auto text-xs">
              <table className="w-full text-left text-moveit-text">
                <thead className="bg-moveit-surface-raised text-moveit-text font-bold">
                  <tr>
                    <th className="p-2">Item Name</th>
                    <th className="p-2">Category</th>
                    <th className="p-2 text-center">Default CBM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-moveit-border-soft">
                  {catalogueItems.map((item) => (
                    <tr key={item.id} className="hover:bg-moveit-surface-raised/40">
                      <td className="p-2 font-medium text-moveit-text">{item.name}</td>
                      <td className="p-2 text-moveit-muted">{item.category}</td>
                      <td className="p-2 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{item.defaultCbm} CBM</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
