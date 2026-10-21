"use client";

import { useCan } from "@/lib/use-can";
import React, { useState, useEffect } from "react";
import { 
  PackingList, 
  PackingListItem, 
  JobType, 
  CatalogueItem, 
  ExtraItem 
} from "@/types/packing-list";
import { services } from "@/services";
import { useUIStore } from "@/store/use-ui-store";
import { 
  FileText, 
  Plus, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  History, 
  PackageCheck,
  Sparkles
} from "lucide-react";

interface PackingListFormProps {
  initialData?: PackingList | null;
  onSaved?: (pl: PackingList) => void;
}

const JOB_TYPES: JobType[] = ["Cargo", "Commercial", "Local", "International", "Storage"];

export function PackingListForm({ initialData, onSaved }: PackingListFormProps) {
  const can = useCan();
  const currentRole = useUIStore((state) => state.currentRole);
  const isAdmin = can("PACKING_LIST", "APPROVE");
  const isTeamLeader = !isAdmin && can("PACKING_LIST", "SUBMIT");

  const [packingList, setPackingList] = useState<PackingList | null>(initialData || null);
  const [catalogueItems, setCatalogueItems] = useState<CatalogueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"FORM" | "EXTRA" | "VERSIONS" | "PRINT">("FORM");

  // Form Fields
  const [companyName, setCompanyName] = useState(initialData?.header.companyName || "MOVE IT Cargo Packaging and Movers LLC");
  const [personName, setPersonName] = useState(initialData?.header.personName || "");
  const [mobileNo, setMobileNo] = useState(initialData?.header.mobileNo || "");
  const [email, setEmail] = useState(initialData?.header.email || "");
  const [source, setSource] = useState(initialData?.header.source || "Direct");
  const [selectedJobTypes, setSelectedJobTypes] = useState<JobType[]>(initialData?.header.jobTypes || ["Storage"]);
  const [origin, setOrigin] = useState(initialData?.header.origin || "");
  const [originDate, setOriginDate] = useState(initialData?.header.originDate || new Date().toISOString().split("T")[0]);
  const [originTime, setOriginTime] = useState(initialData?.header.originTime || "09:00 AM");
  const [destination, setDestination] = useState(initialData?.header.destination || "");
  const [destinationDate, setDestinationDate] = useState(initialData?.header.destinationDate || new Date().toISOString().split("T")[0]);
  const [destinationTime, setDestinationTime] = useState(initialData?.header.destinationTime || "11:00 AM");
  const [totalPackaging, setTotalPackaging] = useState(initialData?.header.totalPackaging || "");

  // Item List State
  const [items, setItems] = useState<PackingListItem[]>(initialData?.items || []);

  // Summary State
  const [totalCurtainsBlinds, setTotalCurtainsBlinds] = useState(initialData?.summary.totalCurtainsBlinds || "0");
  const [totalWallFixtures, setTotalWallFixtures] = useState(initialData?.summary.totalWallFixtures || "0");
  const [totalBoxes, setTotalBoxes] = useState(initialData?.summary.totalBoxes || "0");
  const [totalPackages, setTotalPackages] = useState(initialData?.summary.totalPackages || "0");
  const [totalValueOfGoods, setTotalValueOfGoods] = useState(initialData?.summary.totalValueOfGoods || "0 AED");
  const [estimatedKg, setEstimatedKg] = useState(initialData?.summary.estimatedKg || "0");
  const [totalWorkingDays, setTotalWorkingDays] = useState(initialData?.summary.totalWorkingDays || "1");
  const [noOfTrips, setNoOfTrips] = useState(initialData?.summary.noOfTrips || "1");
  const [amountOfMove, setAmountOfMove] = useState(initialData?.summary.amountOfMove || "0 AED");
  const [bldgPermit, setBldgPermit] = useState(initialData?.summary.bldgPermit || "N/A");
  const [commodity, setCommodity] = useState(initialData?.summary.commodity || "General Goods");

  // Extra Item Form State
  const [extraItemName, setExtraItemName] = useState("");
  const [extraItemQty, setExtraItemQty] = useState(1);
  const [extraItemCbm, setExtraItemCbm] = useState(0.5);
  const [extraItemReason, setExtraItemReason] = useState("");

  // Feedback Messages
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    services.itemCatalogueService.getCatalogueItems().then((cat) => {
      if (!mounted) return;
      setCatalogueItems(cat);
      if (items.length === 0 && !initialData) {
        const initialRows: PackingListItem[] = cat.map((c) => ({
          id: `pli-${c.id}`,
          catalogueItemId: c.id,
          name: c.name,
          cbm: c.defaultCbm,
          quantity: 0,
          disassemblyAssembly: "N/A",
          additionalNotes: "",
          totalCbm: 0,
          isCustom: false,
        }));
        setItems(initialRows);
      }
    });
    return () => {
      mounted = false;
    };
  }, [initialData, items.length]);

  const handleJobTypeToggle = (type: JobType) => {
    setSelectedJobTypes((prev) => 
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleItemQuantityChange = (index: number, quantity: number) => {
    const qty = Math.max(0, quantity);
    const updated = [...items];
    updated[index].quantity = qty;
    updated[index].totalCbm = Number((qty * updated[index].cbm).toFixed(2));
    setItems(updated);
  };

  const handleItemCbmChange = (index: number, cbm: number) => {
    const val = Math.max(0, cbm);
    const updated = [...items];
    updated[index].cbm = val;
    updated[index].totalCbm = Number((updated[index].quantity * val).toFixed(2));
    setItems(updated);
  };

  const handleItemNoteChange = (index: number, field: "disassemblyAssembly" | "additionalNotes", val: string) => {
    const updated = [...items];
    updated[index][field] = val;
    setItems(updated);
  };

  const addCustomItemRow = () => {
    const newItem: PackingListItem = {
      id: `custom-${Date.now()}`,
      name: "Custom Heavy Item",
      cbm: 0.5,
      quantity: 1,
      disassemblyAssembly: "N/A",
      additionalNotes: "Custom addition",
      totalCbm: 0.5,
      isCustom: true,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const calculateTotalCbm = () => {
    const sum = items.reduce((acc, curr) => acc + (curr.totalCbm || 0), 0);
    return Number(sum.toFixed(2));
  };

  const totalCbm = calculateTotalCbm();

  const handleSaveDraft = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const activeItems = items.filter((i) => i.quantity > 0 || i.isCustom);
      if (packingList) {
        const updated = await services.packingListService.updatePackingList(
          packingList.id,
          {
            header: {
              companyName,
              personName,
              mobileNo,
              email,
              source,
              jobTypes: selectedJobTypes,
              origin,
              originDate,
              originTime,
              destination,
              destinationDate,
              destinationTime,
              totalPackaging,
            },
            items: activeItems,
            summary: {
              totalCurtainsBlinds,
              totalWallFixtures,
              totalBoxes,
              totalPackages,
              totalValueOfGoods,
              totalCbm,
              estimatedKg,
              totalWorkingDays,
              noOfTrips,
              amountOfMove,
              bldgPermit,
              commodity,
            },
          },
          currentRole,
          "User"
        );
        setPackingList(updated);
        setMessage({ type: "success", text: `Packing List ${updated.packingListNumber} updated successfully!` });
        if (onSaved) onSaved(updated);
      } else {
        const created = await services.packingListService.createPackingList(
          {
            header: {
              companyName,
              personName,
              mobileNo,
              email,
              source,
              jobTypes: selectedJobTypes,
              origin,
              originDate,
              originTime,
              destination,
              destinationDate,
              destinationTime,
              totalPackaging,
            },
            items: activeItems,
            summary: {
              totalCurtainsBlinds,
              totalWallFixtures,
              totalBoxes,
              totalPackages,
              totalValueOfGoods,
              totalCbm,
              estimatedKg,
              totalWorkingDays,
              noOfTrips,
              amountOfMove,
              bldgPermit,
              commodity,
            },
          },
          currentRole,
          "User"
        );
        setPackingList(created);
        setMessage({ type: "success", text: `Packing List ${created.packingListNumber} created successfully!` });
        if (onSaved) onSaved(created);
      }
    } catch (err: unknown) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!packingList) return;
    setLoading(true);
    setMessage(null);
    try {
      const approved = await services.packingListService.approvePackingList(packingList.id, currentRole, "Admin User");
      setPackingList(approved);
      setMessage({ type: "success", text: `Packing List ${approved.packingListNumber} APPROVED!` });
      if (onSaved) onSaved(approved);
    } catch (err: unknown) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleAddExtraItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packingList) return;
    setLoading(true);
    setMessage(null);
    try {
      await services.packingListService.addExtraItem(
        packingList.id,
        {
          name: extraItemName,
          quantity: Number(extraItemQty),
          cbm: Number(extraItemCbm),
          reason: extraItemReason,
        },
        currentRole,
        isTeamLeader ? "Team Leader" : "Operator"
      );
      const updated = await services.packingListService.getPackingListById(packingList.id);
      if (updated) setPackingList(updated);
      setExtraItemName("");
      setExtraItemQty(1);
      setExtraItemCbm(0.5);
      setExtraItemReason("");
      setMessage({ type: "success", text: "Extra item submitted for Admin review!" });
    } catch (err: unknown) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewExtraItem = async (extraItemId: string, action: "APPROVE" | "REJECT") => {
    if (!packingList) return;
    setLoading(true);
    setMessage(null);
    try {
      const updated = await services.packingListService.reviewExtraItem(
        packingList.id,
        extraItemId,
        action,
        currentRole,
        "Storage Manager"
      );
      setPackingList(updated);
      setItems(updated.items);
      setMessage({ 
        type: "success", 
        text: `Extra item ${action.toLowerCase()}d! Urgent quotation alert created.` 
      });
      if (onSaved) onSaved(updated);
    } catch (err: unknown) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  // Split items into 2 columns (Left & Right) matching official physical MoveIt Packing List template S.No. 1001
  const halfIdx = Math.ceil(items.length / 2);
  const leftItems = items.slice(0, halfIdx);
  const rightItems = items.slice(halfIdx);

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-moveit-card border border-moveit-border p-4 rounded-xl text-moveit-text shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">
                {packingList ? packingList.packingListNumber : "NEW PACKING LIST"}
              </h2>
              {packingList && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  packingList.status === "APPROVED" 
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" 
                    : packingList.status === "REVISED"
                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "bg-moveit-orange/20 text-moveit-orange border border-moveit-orange/30"
                }`}>
                  {packingList.status} (v{packingList.currentVersion})
                </span>
              )}
            </div>
            <p className="text-xs text-moveit-muted">
              Official MoveIt Digital Packing List & Total CBM Engine
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("FORM")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "FORM" ? "bg-emerald-600 text-white" : "bg-moveit-surface-raised text-moveit-text hover:bg-moveit-surface-raised"
            }`}
          >
            Digital Sheet
          </button>
          <button
            onClick={() => setActiveTab("EXTRA")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === "EXTRA" ? "bg-emerald-600 text-white" : "bg-moveit-surface-raised text-moveit-text hover:bg-moveit-surface-raised"
            }`}
          >
            Extra Items
            {packingList?.extraItems.filter((e) => e.status === "PENDING_REVIEW").length ? (
              <span className="bg-amber-500 text-slate-950 px-1.5 py-0.2 text-[10px] font-bold rounded-full">
                {packingList.extraItems.filter((e) => e.status === "PENDING_REVIEW").length}
              </span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab("VERSIONS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
              activeTab === "VERSIONS" ? "bg-emerald-600 text-white" : "bg-moveit-surface-raised text-moveit-text hover:bg-moveit-surface-raised"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            History ({packingList?.versions.length || 1})
          </button>
          <button
            onClick={() => setActiveTab("PRINT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
              activeTab === "PRINT" ? "bg-emerald-600 text-white" : "bg-moveit-surface-raised text-moveit-text hover:bg-moveit-surface-raised"
            }`}
          >
            <Printer className="h-3.5 w-3.5" />
            PDF View
          </button>

          {isAdmin && packingList?.status !== "APPROVED" && (
            <button
              onClick={handleApprove}
              disabled={loading}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve Packing List
            </button>
          )}

          {(!isTeamLeader || packingList?.status !== "APPROVED") && (
            <button
              onClick={handleSaveDraft}
              disabled={loading}
              className="px-4 py-1.5 bg-moveit-orange hover:bg-moveit-orange text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${
          message.type === "success" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* TAB 1: DIGITAL FORM SHEET */}
      {activeTab === "FORM" && (
        <div className="bg-moveit-surface border border-moveit-border rounded-xl p-6 shadow-2xl space-y-6">
          {/* Header Section (Recreating MoveIt Packing List Form Header) */}
          <div className="border border-moveit-border rounded-xl p-5 bg-moveit-card/60 space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-moveit-border pb-4">
              <div>
                <h3 className="text-lg font-black tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                  MOVE IT Cargo Packaging and Movers LLC
                </h3>
                <p className="text-xs text-moveit-muted">
                  Warehouse 26, Street 19, Al Quoz Industrial 1 Dubai - UAE | Toll Free: 800 Moveit (668348)
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded border border-amber-500/30">
                  PACKING LIST {packingList?.packingListNumber || "S.No. NEW"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-moveit-muted mb-1">Company Name:</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Person Name:</label>
                <input
                  type="text"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Mobile No.:</label>
                <input
                  type="text"
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Source:</label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Total Packaging:</label>
                <input
                  type="text"
                  value={totalPackaging}
                  onChange={(e) => setTotalPackaging(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Job Type Checkboxes */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-moveit-border text-xs">
              <span className="font-semibold text-moveit-text">Job Type:</span>
              {JOB_TYPES.map((jt) => (
                <label key={jt} className="flex items-center gap-1.5 cursor-pointer text-moveit-text font-medium">
                  <input
                    type="checkbox"
                    checked={selectedJobTypes.includes(jt)}
                    onChange={() => handleJobTypeToggle(jt)}
                    className="accent-emerald-500 h-4 w-4 rounded"
                  />
                  {jt}
                </label>
              ))}
            </div>

            {/* Origin & Destination Rows */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-moveit-border text-xs">
              <div className="md:col-span-1">
                <label className="block text-moveit-muted mb-1">Origin:</label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-medium"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Origin Date:</label>
                <input
                  type="date"
                  value={originDate}
                  onChange={(e) => setOriginDate(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-medium"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Origin Time:</label>
                <input
                  type="text"
                  value={originTime}
                  onChange={(e) => setOriginTime(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-medium"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-moveit-muted mb-1">Destination:</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-medium"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Dest. Date:</label>
                <input
                  type="date"
                  value={destinationDate}
                  onChange={(e) => setDestinationDate(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-medium"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Dest. Time:</label>
                <input
                  type="text"
                  value={destinationTime}
                  onChange={(e) => setDestinationTime(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-medium"
                />
              </div>
            </div>
          </div>

          {/* ITEM TABLE — 2 Column Layout Matching Official Physical MoveIt Packing Sheet */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-moveit-text uppercase tracking-wider flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Items Catalogue & CBM Entry
              </h4>
              <button
                onClick={addCustomItemRow}
                className="px-3 py-1 bg-moveit-surface-raised hover:bg-moveit-surface-raised border border-moveit-border text-xs font-semibold text-emerald-600 dark:text-emerald-400 rounded flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Custom Item
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column Items Table */}
              <div className="border border-moveit-border rounded-lg overflow-hidden bg-moveit-card/50">
                <table className="w-full text-xs text-left text-moveit-text">
                  <thead className="bg-moveit-surface-raised text-moveit-text font-bold uppercase border-b border-moveit-border">
                    <tr>
                      <th className="py-2 px-3">Items</th>
                      <th className="py-2 px-2 text-center">CBM</th>
                      <th className="py-2 px-2 text-center">Nos. of Pcs</th>
                      <th className="py-2 px-2 text-center">D/A</th>
                      <th className="py-2 px-2 text-center">A</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-moveit-border-soft">
                    {leftItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-moveit-surface-raised/40 transition">
                        <td className="py-1.5 px-3 font-medium text-moveit-text">
                          {item.name}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono">
                          <input
                            type="number"
                            step="0.01"
                            value={item.cbm}
                            onChange={(e) => handleItemCbmChange(idx, parseFloat(e.target.value) || 0)}
                            className="w-14 bg-moveit-surface-raised border border-moveit-border rounded text-center text-moveit-text py-0.5"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => handleItemQuantityChange(idx, parseInt(e.target.value) || 0)}
                            className={`w-14 bg-moveit-surface-raised border rounded text-center py-0.5 font-bold ${
                              item.quantity > 0 ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-moveit-border text-moveit-muted"
                            }`}
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <input
                            type="text"
                            value={item.disassemblyAssembly}
                            onChange={(e) => handleItemNoteChange(idx, "disassemblyAssembly", e.target.value)}
                            className="w-12 bg-moveit-surface-raised border border-moveit-border rounded text-center text-moveit-text py-0.5"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <input
                            type="text"
                            value={item.additionalNotes}
                            onChange={(e) => handleItemNoteChange(idx, "additionalNotes", e.target.value)}
                            className="w-14 bg-moveit-surface-raised border border-moveit-border rounded text-center text-moveit-text py-0.5"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Right Column Items Table */}
              <div className="border border-moveit-border rounded-lg overflow-hidden bg-moveit-card/50">
                <table className="w-full text-xs text-left text-moveit-text">
                  <thead className="bg-moveit-surface-raised text-moveit-text font-bold uppercase border-b border-moveit-border">
                    <tr>
                      <th className="py-2 px-3">Items</th>
                      <th className="py-2 px-2 text-center">CBM</th>
                      <th className="py-2 px-2 text-center">Nos. of Pcs</th>
                      <th className="py-2 px-2 text-center">D/A</th>
                      <th className="py-2 px-2 text-center">A</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-moveit-border-soft">
                    {rightItems.map((item, idx) => {
                      const actualIdx = halfIdx + idx;
                      return (
                        <tr key={item.id} className="hover:bg-moveit-surface-raised/40 transition">
                          <td className="py-1.5 px-3 font-medium text-moveit-text">
                            {item.name}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono">
                            <input
                              type="number"
                              step="0.01"
                              value={item.cbm}
                              onChange={(e) => handleItemCbmChange(actualIdx, parseFloat(e.target.value) || 0)}
                              className="w-14 bg-moveit-surface-raised border border-moveit-border rounded text-center text-moveit-text py-0.5"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => handleItemQuantityChange(actualIdx, parseInt(e.target.value) || 0)}
                              className={`w-14 bg-moveit-surface-raised border rounded text-center py-0.5 font-bold ${
                                item.quantity > 0 ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-moveit-border text-moveit-muted"
                              }`}
                            />
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <input
                              type="text"
                              value={item.disassemblyAssembly}
                              onChange={(e) => handleItemNoteChange(actualIdx, "disassemblyAssembly", e.target.value)}
                              className="w-12 bg-moveit-surface-raised border border-moveit-border rounded text-center text-moveit-text py-0.5"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <input
                              type="text"
                              value={item.additionalNotes}
                              onChange={(e) => handleItemNoteChange(actualIdx, "additionalNotes", e.target.value)}
                              className="w-14 bg-moveit-surface-raised border border-moveit-border rounded text-center text-moveit-text py-0.5"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* LOWER SUMMARY TOTALS SECTION (Recreating official MoveIt footer fields) */}
          <div className="border border-moveit-border rounded-xl p-5 bg-moveit-card/80 space-y-4 text-xs">
            <h4 className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
              Packing List Totals & Operations Parameters
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div>
                  <label className="block text-moveit-muted mb-0.5">TOTAL CURTAINS / BLINDS:</label>
                  <input
                    type="text"
                    value={totalCurtainsBlinds}
                    onChange={(e) => setTotalCurtainsBlinds(e.target.value)}
                    className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-2.5 py-1 text-moveit-text"
                  />
                </div>
                <div>
                  <label className="block text-moveit-muted mb-0.5">TOTAL BOXES:</label>
                  <input
                    type="text"
                    value={totalBoxes}
                    onChange={(e) => setTotalBoxes(e.target.value)}
                    className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-2.5 py-1 text-moveit-text"
                  />
                </div>
                <div>
                  <label className="block text-moveit-muted mb-0.5">TOTAL VALUE OF GOODS:</label>
                  <input
                    type="text"
                    value={totalValueOfGoods}
                    onChange={(e) => setTotalValueOfGoods(e.target.value)}
                    className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-2.5 py-1 text-moveit-text"
                  />
                </div>
                <div className="pt-1">
                  <label className="block text-amber-600 dark:text-amber-400 font-bold mb-0.5">TOTAL CBM (Calculated):</label>
                  <div className="w-full bg-amber-500/10 border border-amber-500/40 rounded px-3 py-1.5 text-amber-600 dark:text-amber-400 font-mono font-black text-sm">
                    {totalCbm} CBM
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-moveit-muted mb-0.5">TOTAL WALL FIXTURES:</label>
                  <input
                    type="text"
                    value={totalWallFixtures}
                    onChange={(e) => setTotalWallFixtures(e.target.value)}
                    className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-2.5 py-1 text-moveit-text"
                  />
                </div>
                <div>
                  <label className="block text-moveit-muted mb-0.5">TOTAL PACKAGES:</label>
                  <input
                    type="text"
                    value={totalPackages}
                    onChange={(e) => setTotalPackages(e.target.value)}
                    className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-2.5 py-1 text-moveit-text"
                  />
                </div>
                <div>
                  <label className="block text-moveit-muted mb-0.5">TOTAL WORKING DAYS:</label>
                  <input
                    type="text"
                    value={totalWorkingDays}
                    onChange={(e) => setTotalWorkingDays(e.target.value)}
                    className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-2.5 py-1 text-moveit-text"
                  />
                </div>
                <div>
                  <label className="block text-moveit-muted mb-0.5">ESTIMATED KG:</label>
                  <input
                    type="text"
                    value={estimatedKg}
                    onChange={(e) => setEstimatedKg(e.target.value)}
                    className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-2.5 py-1 text-moveit-text"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-moveit-muted mb-0.5">BLDG. PERMIT:</label>
                  <input
                    type="text"
                    value={bldgPermit}
                    onChange={(e) => setBldgPermit(e.target.value)}
                    className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-2.5 py-1 text-moveit-text"
                  />
                </div>
                <div>
                  <label className="block text-moveit-muted mb-0.5">COMMODITY:</label>
                  <input
                    type="text"
                    value={commodity}
                    onChange={(e) => setCommodity(e.target.value)}
                    className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-2.5 py-1 text-moveit-text"
                  />
                </div>
                <div>
                  <label className="block text-moveit-muted mb-0.5">No. of Trips:</label>
                  <input
                    type="text"
                    value={noOfTrips}
                    onChange={(e) => setNoOfTrips(e.target.value)}
                    className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-2.5 py-1 text-moveit-text"
                  />
                </div>
                <div>
                  <label className="block text-moveit-muted mb-0.5">AMOUNT OF THE MOVE:</label>
                  <input
                    type="text"
                    value={amountOfMove}
                    onChange={(e) => setAmountOfMove(e.target.value)}
                    className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-2.5 py-1 text-moveit-text"
                  />
                </div>
              </div>
            </div>

            {/* Signatures Row */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-moveit-border">
              <div className="border border-moveit-border rounded p-3 text-center bg-moveit-surface">
                <span className="block text-xs font-bold text-moveit-muted uppercase mb-4">For Customer</span>
                <div className="border-b border-dashed border-moveit-border h-8 mx-auto w-3/4 mb-1"></div>
                <span className="text-[10px] text-moveit-muted">Signature / Confirmation</span>
              </div>
              <div className="border border-moveit-border rounded p-3 text-center bg-moveit-surface">
                <span className="block text-xs font-bold text-moveit-muted uppercase mb-4">For MOVE IT</span>
                <div className="border-b border-dashed border-moveit-border h-8 mx-auto w-3/4 mb-1"></div>
                <span className="text-[10px] text-moveit-muted">Authorized Officer Signature</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXTRA ITEMS WORKFLOW */}
      {activeTab === "EXTRA" && (
        <div className="bg-moveit-surface border border-moveit-border rounded-xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-moveit-border pb-4">
            <div>
              <h3 className="text-base font-bold text-moveit-text flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Extra Items / Additional Stuff Review Workflow
              </h3>
              <p className="text-xs text-moveit-muted">
                Team leaders can submit extra items discovered on site for Admin review without directly modifying the approved list.
              </p>
            </div>
          </div>

          {/* Submit Extra Item Form */}
          <form onSubmit={handleAddExtraItem} className="bg-moveit-card border border-moveit-border rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">Submit New Extra Item</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-moveit-muted mb-1">Item Name:</label>
                <input
                  type="text"
                  required
                  value={extraItemName}
                  onChange={(e) => setExtraItemName(e.target.value)}
                  placeholder="e.g. Extra Armchair"
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Quantity:</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={extraItemQty}
                  onChange={(e) => setExtraItemQty(parseInt(e.target.value) || 1)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Unit CBM:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={extraItemCbm}
                  onChange={(e) => setExtraItemCbm(parseFloat(e.target.value) || 0)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Reason for Extra Item:</label>
                <input
                  type="text"
                  required
                  value={extraItemReason}
                  onChange={(e) => setExtraItemReason(e.target.value)}
                  placeholder="Additional packing on site"
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Submit Extra Item for Review
              </button>
            </div>
          </form>

          {/* List of Extra Items */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-moveit-text">Submitted Extra Items</h4>
            {packingList?.extraItems.length === 0 ? (
              <p className="text-xs text-moveit-muted italic p-4 text-center border border-moveit-border rounded-lg">
                No extra items submitted yet for this packing list.
              </p>
            ) : (
              <div className="space-y-3">
                {packingList?.extraItems.map((ex) => (
                  <div key={ex.id} className="border border-moveit-border rounded-xl p-4 bg-moveit-card/50 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-moveit-text text-sm">{ex.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ex.status === "APPROVED" 
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : ex.status === "REJECTED"
                            ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                            : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        }`}>
                          {ex.status}
                        </span>
                      </div>
                      <p className="text-xs text-moveit-muted mt-1">
                        Quantity: {ex.quantity} pcs | Unit CBM: {ex.cbm} CBM | Total CBM: <span className="font-bold text-amber-600 dark:text-amber-400">{ex.totalCbm} CBM</span>
                      </p>
                      <p className="text-xs text-moveit-muted">
                        Reason: {ex.reason} (Submitted by {ex.submittedBy} at {new Date(ex.submittedAt).toLocaleTimeString()})
                      </p>
                    </div>

                    {isAdmin && ex.status === "PENDING_REVIEW" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReviewExtraItem(ex.id, "APPROVE")}
                          disabled={loading}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded transition"
                        >
                          Approve Extra Item
                        </button>
                        <button
                          onClick={() => handleReviewExtraItem(ex.id, "REJECT")}
                          disabled={loading}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: VERSION HISTORY */}
      {activeTab === "VERSIONS" && (
        <div className="bg-moveit-surface border border-moveit-border rounded-xl p-6 shadow-2xl space-y-4">
          <h3 className="text-base font-bold text-moveit-text flex items-center gap-2 border-b border-moveit-border pb-3">
            <History className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Packing List Versioning & Revision History
          </h3>

          <div className="space-y-4">
            {packingList?.versions.map((ver) => (
              <div key={ver.version} className="border border-moveit-border rounded-xl p-4 bg-moveit-card/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    Version {ver.version} ({ver.status})
                  </span>
                  <span className="text-xs text-moveit-muted">
                    {new Date(ver.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-moveit-text">
                  Created/Revised by: <span className="font-semibold text-moveit-text">{ver.createdBy}</span>
                </p>
                {ver.revisionReason && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Revision Reason: {ver.revisionReason}
                  </p>
                )}
                <div className="text-xs text-moveit-muted font-mono pt-1">
                  Items Count: {ver.items.length} | Total Volume: {ver.summary.totalCbm} CBM
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PRINT / PDF RECOGNIZABLE LAYOUT */}
      {activeTab === "PRINT" && (
        <div className="bg-moveit-card text-moveit-text p-8 rounded-xl shadow-2xl space-y-6 font-sans text-xs border border-moveit-border print:p-0">
          <div className="flex items-center justify-between border-b-2 border-moveit-border-soft pb-4">
            <div>
              <h1 className="text-2xl font-black text-moveit-text tracking-wider uppercase">MOVE IT</h1>
              <p className="text-[11px] font-bold text-moveit-text">Moving | Shipping | Storage</p>
              <p className="text-[10px] text-moveit-muted mt-1">
                MOVE IT Cargo Packaging and Movers LLC<br />
                Warehouse 26, Street 19, Al Quoz Industrial 1 Dubai - UAE<br />
                Toll Free: 800 Moveit (668348), Mob.: 055 - 949 4638<br />
                Email: inquiry@themoveit.com, Website: www.themoveit.com
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-black tracking-widest text-moveit-text uppercase">PACKING LIST</h2>
              <p className="text-sm font-bold text-red-600 mt-1">{packingList?.packingListNumber || "S.No. 1001"}</p>
            </div>
          </div>

          <div className="border border-moveit-border-soft p-3 rounded space-y-2 text-[11px]">
            <div className="grid grid-cols-2 gap-4">
              <p><span className="font-bold">Company Name:</span> {companyName}</p>
              <p><span className="font-bold">Person Name:</span> {personName}</p>
              <p><span className="font-bold">Mobile No.:</span> {mobileNo}</p>
              <p><span className="font-bold">Email:</span> {email}</p>
            </div>
            <div className="flex items-center gap-4 font-bold pt-1 border-t border-moveit-border">
              <span>Job Type:</span>
              {JOB_TYPES.map((jt) => (
                <span key={jt} className={selectedJobTypes.includes(jt) ? "text-emerald-700 underline" : "text-moveit-muted"}>
                  [{selectedJobTypes.includes(jt) ? "✓" : " "}] {jt}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 pt-1 border-t border-moveit-border">
              <p><span className="font-bold">Origin:</span> {origin} ({originDate} {originTime})</p>
              <p><span className="font-bold">Destination:</span> {destination} ({destinationDate} {destinationTime})</p>
            </div>
          </div>

          {/* Printable 2-column table */}
          <div className="grid grid-cols-2 gap-2">
            {[leftItems, rightItems].map((colItems, cIdx) => (
              <table key={cIdx} className="w-full border-collapse border border-moveit-border-soft text-[10px]">
                <thead>
                  <tr className="bg-moveit-surface-raised text-moveit-text font-bold border-b border-moveit-border-soft">
                    <th className="border border-moveit-border-soft p-1 text-left">Items</th>
                    <th className="border border-moveit-border-soft p-1 text-center">CBM</th>
                    <th className="border border-moveit-border-soft p-1 text-center">Nos. of Pcs</th>
                    <th className="border border-moveit-border-soft p-1 text-center">D/A</th>
                    <th className="border border-moveit-border-soft p-1 text-center">A</th>
                  </tr>
                </thead>
                <tbody>
                  {colItems.map((item) => (
                    <tr key={item.id} className="border-b border-moveit-border">
                      <td className="border border-moveit-border-soft p-1 font-semibold">{item.name}</td>
                      <td className="border border-moveit-border-soft p-1 text-center font-mono">{item.cbm}</td>
                      <td className="border border-moveit-border-soft p-1 text-center font-bold">{item.quantity || ""}</td>
                      <td className="border border-moveit-border-soft p-1 text-center">{item.disassemblyAssembly}</td>
                      <td className="border border-moveit-border-soft p-1 text-center">{item.additionalNotes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>

          {/* Summary Totals */}
          <div className="border border-moveit-border-soft p-3 rounded font-bold grid grid-cols-3 gap-2 text-[11px]">
            <p>TOTAL CBM: <span className="font-mono text-emerald-800 text-sm">{totalCbm} CBM</span></p>
            <p>TOTAL PACKAGES: {totalPackages}</p>
            <p>ESTIMATED KG: {estimatedKg}</p>
            <p>AMOUNT OF MOVE: {amountOfMove}</p>
            <p>COMMODITY: {commodity}</p>
            <p>BLDG PERMIT: {bldgPermit}</p>
          </div>

          <div className="grid grid-cols-2 gap-12 pt-8 text-center font-bold">
            <div className="border-t border-moveit-border-soft pt-2">For Customer Signature</div>
            <div className="border-t border-moveit-border-soft pt-2">For MOVE IT Authorized Signature</div>
          </div>
        </div>
      )}
    </div>
  );
}
