"use client";

import { useCan } from "@/lib/use-can";
import React, { useEffect, useState } from "react";
import { services } from "@/services";
import { 
  PackingMaterial, 
  JobMaterialAllocation, 
  MaterialChangeRequest, 
  MaterialUsageRecord 
} from "@/types/packing-material";
import { useUIStore } from "@/store/use-ui-store";
import { 
  Boxes, 
  Plus, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileCheck, 
  Search,
  Lock,
  RefreshCw,
  X
} from "lucide-react";

export default function PackingMaterialsPage() {
  const can = useCan();
  const currentRole = useUIStore((state) => state.currentRole);
  const canCreate = can("PACKING_MATERIAL", "CREATE");
  const canEdit = can("PACKING_MATERIAL", "EDIT");
  const canApprove = can("PACKING_MATERIAL", "APPROVE");

  const [materials, setMaterials] = useState<PackingMaterial[]>([]);
  const [activeTab, setActiveTab] = useState<"MASTER" | "ALLOCATIONS" | "OUT_IN" | "CHANGE_REQUESTS" | "USAGE">("MASTER");
  const [searchQuery, setSearchQuery] = useState("");
  const [lowStockAlerts, setLowStockAlerts] = useState<PackingMaterial[]>([]);

  // Master Material Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("Piece");
  const [newStock, setNewStock] = useState(100);
  const [newMinStock, setNewMinStock] = useState(20);

  // Edit Stock State
  const [editingMat, setEditingMat] = useState<PackingMaterial | null>(null);
  const [editStockVal, setEditStockVal] = useState<number>(0);
  const [editMinStockVal, setEditMinStockVal] = useState<number>(0);

  // Job Allocation State
  const [selectedJobId, setSelectedJobId] = useState("cs-4001");
  const [activeJobAlloc, setActiveJobAlloc] = useState<JobMaterialAllocation | null>(null);
  const [allocQtys, setAllocQtys] = useState<Record<string, number>>({});
  const [allocMessage, setAllocMessage] = useState<string | null>(null);

  // OUT / IN State
  const [issueMatId, setIssueMatId] = useState("");
  const [issueQty, setIssueQty] = useState(10);
  const [issuedBy, setIssuedBy] = useState("Warehouse Supervisor");
  const [receivedBy, setReceivedBy] = useState("Tariq Mahmoud (TL)");
  
  const [returnMatId, setReturnMatId] = useState("");
  const [returnQty, setReturnQty] = useState(2);
  const [returnReceivedBy, setReturnReceivedBy] = useState("Warehouse Desk");
  const [returnedBy, setReturnedBy] = useState("Tariq Mahmoud (TL)");

  // Change Requests State
  const [changeRequests, setChangeRequests] = useState<MaterialChangeRequest[]>([]);
  const [crReason, setCrReason] = useState("");
  const [crMatId, setCrMatId] = useState("");
  const [crQty, setCrQty] = useState(15);

  // Usage State
  const [usageRecords, setUsageRecords] = useState<MaterialUsageRecord[]>([]);

  const loadMaterials = async () => {
    try {
      const mats = await services.packingMaterialService.getMaterials();
      setMaterials(mats);
      const alerts = await services.packingMaterialService.getLowStockAlerts();
      setLowStockAlerts(alerts);
    } catch (err) {
      console.error("Failed to load packing materials:", err);
    }
  };

  const loadJobAlloc = async (jobId: string) => {
    try {
      const alloc = await services.packingMaterialService.getJobMaterialList(jobId);
      setActiveJobAlloc(alloc);
      if (alloc) {
        const qMap: Record<string, number> = {};
        alloc.items.forEach((item) => {
          qMap[item.materialId] = item.approvedQty;
        });
        setAllocQtys(qMap);
      } else {
        setAllocQtys({});
      }
    } catch (err) {
      console.error("Failed to load job material allocation:", err);
    }
  };

  const loadChangeRequests = async () => {
    try {
      const reqs = await services.packingMaterialService.getChangeRequests();
      setChangeRequests(reqs);
    } catch (err) {
      console.error("Failed to load change requests:", err);
    }
  };

  const loadUsage = async (jobId: string) => {
    try {
      const recs = await services.packingMaterialService.getMaterialUsage(jobId);
      setUsageRecords(recs);
    } catch (err) {
      console.error("Failed to load material usage:", err);
    }
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const mats = await services.packingMaterialService.getMaterials();
      const alerts = await services.packingMaterialService.getLowStockAlerts();
      const alloc = await services.packingMaterialService.getJobMaterialList(selectedJobId);
      const reqs = await services.packingMaterialService.getChangeRequests();
      const recs = await services.packingMaterialService.getMaterialUsage(selectedJobId);
      if (mounted) {
        setMaterials(mats);
        setLowStockAlerts(alerts);
        setActiveJobAlloc(alloc);
        if (alloc) {
          const qMap: Record<string, number> = {};
          alloc.items.forEach((item) => {
            qMap[item.materialId] = item.approvedQty;
          });
          setAllocQtys(qMap);
        } else {
          setAllocQtys({});
        }
        setChangeRequests(reqs);
        setUsageRecords(recs);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [selectedJobId]);

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await services.packingMaterialService.createMaterial({
        name: newName.trim(),
        unit: newUnit,
        availableQty: Number(newStock),
        minStock: Number(newMinStock),
        isActive: true,
      }, "Admin User");

      setNewName("");
      setNewStock(100);
      setNewMinStock(20);
      setShowCreateModal(false);
      await loadMaterials();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMat) return;
    try {
      await services.packingMaterialService.updateMaterial(
        editingMat.id,
        { availableQty: Number(editStockVal), minStock: Number(editMinStockVal) },
        currentRole,
        "Admin User"
      );
      setEditingMat(null);
      await loadMaterials();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleSaveAndApproveAlloc = async (e: React.FormEvent) => {
    e.preventDefault();
    setAllocMessage(null);
    try {
      const items = materials.map((m) => ({
        materialId: m.id,
        materialName: m.name,
        approvedQty: allocQtys[m.id] || 0,
      }));

      await services.packingMaterialService.allocateMaterialsForJob(selectedJobId, items, currentRole, "Admin User");
      const approved = await services.packingMaterialService.approveJobMaterialList(selectedJobId, currentRole, "Admin User");
      setActiveJobAlloc(approved);
      setAllocMessage(`Success: Approved Packing Material List v${approved.version} for Job '${selectedJobId}'.`);
      await loadUsage(selectedJobId);
    } catch (err: unknown) {
      setAllocMessage(`Error: ${(err as Error).message}`);
    }
  };

  const handleIssueMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueMatId) {
      alert("Select a material to issue.");
      return;
    }
    try {
      await services.packingMaterialService.issueMaterial({
        jobId: selectedJobId,
        materialId: issueMatId,
        quantityOut: Number(issueQty),
        issuedBy,
        receivedBy,
        teamLeaderId: "emp-tl-1",
      }, currentRole, "Operations User");

      alert(`Success: Issued ${issueQty} items for Job '${selectedJobId}'.`);
      await loadMaterials();
      await loadUsage(selectedJobId);
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleReturnMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnMatId) {
      alert("Select a material to return.");
      return;
    }
    try {
      await services.packingMaterialService.returnMaterial({
        jobId: selectedJobId,
        materialId: returnMatId,
        quantityIn: Number(returnQty),
        receivedBy: returnReceivedBy,
        returnedBy,
        notes: "End of job return.",
      }, currentRole, "Operations User");

      alert(`Success: Returned ${returnQty} items for Job '${selectedJobId}'.`);
      await loadMaterials();
      await loadUsage(selectedJobId);
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleCreateChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crMatId || !crReason.trim()) {
      alert("Select material and provide a valid reason.");
      return;
    }
    const targetMat = materials.find(m => m.id === crMatId);
    try {
      await services.packingMaterialService.requestMaterialChange({
        jobId: selectedJobId,
        requestedBy: "Tariq Mahmoud (TL)",
        reason: crReason,
        items: [{ materialId: crMatId, materialName: targetMat?.name || crMatId, requestedQty: Number(crQty) }],
      }, "Team Leader");

      setCrReason("");
      alert("Change request submitted for Admin review.");
      await loadChangeRequests();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleReviewChangeRequest = async (reqId: string, approve: boolean) => {
    try {
      await services.packingMaterialService.reviewMaterialChange(reqId, approve, currentRole, "Admin User");
      await loadChangeRequests();
      await loadJobAlloc(selectedJobId);
      await loadUsage(selectedJobId);
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const filteredMaterials = materials.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.unit.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-moveit-text tracking-tight flex items-center gap-2">
            <Boxes className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            MoveIt Packing Material Inventory & OUT/IN Workflow
          </h1>
          <p className="text-xs text-moveit-muted mt-1">
            Master packing material catalogue, Admin job material allocation locking, Material OUT (issuance) & IN (returns) tracking & usage calculations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lowStockAlerts.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              {lowStockAlerts.length} Low Stock Alert(s)
            </div>
          )}

          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg flex items-center gap-2 transition"
            >
              <Plus className="h-4 w-4" />
              Add Master Material
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-moveit-border text-xs font-semibold">
        {[
          { key: "MASTER", label: `Material Master (${materials.length})` },
          { key: "ALLOCATIONS", label: "Job Material Allocation & Locking" },
          { key: "OUT_IN", label: "Material OUT / IN Execution" },
          { key: "CHANGE_REQUESTS", label: `Change Requests (${changeRequests.filter(r => r.status === 'PENDING').length})` },
          { key: "USAGE", label: "Usage & Reconciliation Report" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as "MASTER" | "ALLOCATIONS" | "OUT_IN" | "CHANGE_REQUESTS" | "USAGE")}
            className={`px-4 py-3 transition border-b-2 font-bold ${
              activeTab === tab.key
                ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/5"
                : "border-transparent text-moveit-muted hover:text-moveit-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: MASTER MATERIAL CATALOGUE */}
      {activeTab === "MASTER" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-moveit-card border border-moveit-border p-4 rounded-xl">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-moveit-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search material name or unit..."
                className="w-full bg-moveit-surface border border-moveit-border rounded-lg pl-9 pr-4 py-1.5 text-xs text-moveit-text focus:border-amber-500 focus:outline-none"
              />
            </div>
            <span className="text-xs text-moveit-muted">Total Catalogued Materials: {materials.length}</span>
          </div>

          <div className="border border-moveit-border rounded-xl overflow-hidden bg-moveit-surface text-xs">
            <table className="w-full text-left text-moveit-text">
              <thead className="bg-moveit-card text-moveit-text font-bold border-b border-moveit-border">
                <tr>
                  <th className="p-3">Material Name</th>
                  <th className="p-3">Unit</th>
                  <th className="p-3 text-center">Available Stock</th>
                  <th className="p-3 text-center">Min Threshold</th>
                  <th className="p-3 text-center">Stock Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-moveit-border-soft">
                {filteredMaterials.map((mat) => {
                  const isLow = mat.availableQty <= mat.minStock;
                  const isOut = mat.availableQty === 0;

                  return (
                    <tr key={mat.id} className="hover:bg-moveit-card/50 transition">
                      <td className="p-3 font-semibold text-moveit-text">{mat.name}</td>
                      <td className="p-3 text-moveit-muted">{mat.unit}</td>
                      <td className="p-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                        {mat.availableQty}
                      </td>
                      <td className="p-3 text-center text-moveit-muted">{mat.minStock}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isOut
                            ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                            : isLow
                            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        }`}>
                          {isOut ? "OUT OF STOCK" : isLow ? "LOW STOCK" : "AVAILABLE"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {canEdit && (
                          <button
                            onClick={() => {
                              setEditingMat(mat);
                              setEditStockVal(mat.availableQty);
                              setEditMinStockVal(mat.minStock);
                            }}
                            className="px-3 py-1 bg-moveit-surface-raised hover:bg-moveit-surface-raised text-amber-600 dark:text-amber-400 rounded text-xs font-semibold"
                          >
                            Update Stock
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: JOB MATERIAL ALLOCATION & LOCKING */}
      {activeTab === "ALLOCATIONS" && (
        <div className="space-y-4">
          <div className="bg-moveit-card border border-moveit-border p-4 rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <label className="block text-moveit-muted text-xs font-bold mb-1">Select Active Job / Crew Sheet:</label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="bg-moveit-surface border border-moveit-border rounded-lg px-3 py-1.5 text-xs text-moveit-text font-mono"
                >
                  <option value="cs-4001">Job S.No. 4001 (Al Habtoor Group)</option>
                  <option value="cs-4002">Job S.No. 4002 (Emaar Commercial)</option>
                </select>
              </div>

              {activeJobAlloc ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-lg text-xs flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Approved List Version: <strong className="font-mono text-moveit-text">v{activeJobAlloc.version}</strong> (Approved by {activeJobAlloc.approvedBy})</span>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg text-xs flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>No approved material list version yet for Job &apos;{selectedJobId}&apos;.</span>
                </div>
              )}
            </div>

            {allocMessage && (
              <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                allocMessage.startsWith("Success") ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-red-500/20 text-red-600 dark:text-red-400"
              }`}>
                {allocMessage}
              </div>
            )}
          </div>

          <form onSubmit={handleSaveAndApproveAlloc} className="bg-moveit-card border border-moveit-border p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-moveit-border pb-3">
              <h3 className="text-sm font-bold text-moveit-text flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Admin Approved Packing Material Allocation List
              </h3>
              <span className="text-xs text-moveit-muted">Team Leaders CANNOT modify approved quantities</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {materials.map((mat) => (
                <div key={mat.id} className="bg-moveit-surface border border-moveit-border p-3 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-moveit-text">{mat.name}</span>
                    <span className="text-[10px] text-moveit-muted font-mono">Stock: {mat.availableQty} {mat.unit}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={allocQtys[mat.id] || 0}
                    onChange={(e) => setAllocQtys({ ...allocQtys, [mat.id]: parseInt(e.target.value) || 0 })}
                    className="w-full bg-moveit-card border border-moveit-border rounded px-2.5 py-1 text-moveit-text font-mono font-bold text-sm"
                  />
                </div>
              ))}
            </div>

            {canApprove && (
              <div className="flex justify-end pt-3 border-t border-moveit-border">
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg flex items-center gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Save & Lock Approved Material List
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* TAB 3: MATERIAL OUT / IN EXECUTION */}
      {activeTab === "OUT_IN" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* MATERIAL OUT (ISSUANCE) */}
          <form onSubmit={handleIssueMaterial} className="bg-moveit-card border border-moveit-border p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 border-b border-moveit-border pb-2">
              <ArrowUpRight className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              MATERIAL OUT (Stock Issuance)
            </h3>

            <div>
              <label className="block text-moveit-muted mb-1 font-bold">Material to Issue:</label>
              <select
                value={issueMatId}
                onChange={(e) => setIssueMatId(e.target.value)}
                className="w-full bg-moveit-surface border border-moveit-border rounded-lg p-2 text-moveit-text"
              >
                <option value="">-- Select Material --</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (Available Stock: {m.availableQty} {m.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-moveit-muted mb-1">Quantity OUT:</label>
                <input
                  type="number"
                  min="1"
                  value={issueQty}
                  onChange={(e) => setIssueQty(parseInt(e.target.value) || 0)}
                  className="w-full bg-moveit-surface border border-moveit-border rounded-lg p-2 text-moveit-text font-bold"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Issued By:</label>
                <input
                  type="text"
                  value={issuedBy}
                  onChange={(e) => setIssuedBy(e.target.value)}
                  className="w-full bg-moveit-surface border border-moveit-border rounded-lg p-2 text-moveit-text"
                />
              </div>
            </div>

            <div>
              <label className="block text-moveit-muted mb-1">Received By (Team Leader):</label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="w-full bg-moveit-surface border border-moveit-border rounded-lg p-2 text-moveit-text"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-lg flex items-center justify-center gap-2"
            >
              <ArrowUpRight className="h-4 w-4" />
              Confirm Material OUT & Deduct Stock
            </button>
          </form>

          {/* MATERIAL IN (RETURN) */}
          <form onSubmit={handleReturnMaterial} className="bg-moveit-card border border-moveit-border p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 border-b border-moveit-border pb-2">
              <ArrowDownLeft className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              MATERIAL IN (Stock Return)
            </h3>

            <div>
              <label className="block text-moveit-muted mb-1 font-bold">Material to Return:</label>
              <select
                value={returnMatId}
                onChange={(e) => setReturnMatId(e.target.value)}
                className="w-full bg-moveit-surface border border-moveit-border rounded-lg p-2 text-moveit-text"
              >
                <option value="">-- Select Material --</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (Current Stock: {m.availableQty} {m.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-moveit-muted mb-1">Quantity IN:</label>
                <input
                  type="number"
                  min="1"
                  value={returnQty}
                  onChange={(e) => setReturnQty(parseInt(e.target.value) || 0)}
                  className="w-full bg-moveit-surface border border-moveit-border rounded-lg p-2 text-moveit-text font-bold"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Returned By:</label>
                <input
                  type="text"
                  value={returnedBy}
                  onChange={(e) => setReturnedBy(e.target.value)}
                  className="w-full bg-moveit-surface border border-moveit-border rounded-lg p-2 text-moveit-text"
                />
              </div>
            </div>

            <div>
              <label className="block text-moveit-muted mb-1">Received By (Warehouse):</label>
              <input
                type="text"
                value={returnReceivedBy}
                onChange={(e) => setReturnReceivedBy(e.target.value)}
                className="w-full bg-moveit-surface border border-moveit-border rounded-lg p-2 text-moveit-text"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-lg flex items-center justify-center gap-2"
            >
              <ArrowDownLeft className="h-4 w-4" />
              Confirm Material IN & Restore Stock
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: CHANGE REQUESTS QUEUE */}
      {activeTab === "CHANGE_REQUESTS" && (
        <div className="space-y-6">
          {/* Submit Change Request Form (TL View) */}
          <form onSubmit={handleCreateChangeRequest} className="bg-moveit-card border border-moveit-border p-5 rounded-xl space-y-4 text-xs">
            <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase flex items-center gap-2 border-b border-moveit-border pb-2">
              <RefreshCw className="h-4 w-4" /> Team Leader Material Change Request
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-moveit-muted mb-1">Material Requested:</label>
                <select
                  value={crMatId}
                  onChange={(e) => setCrMatId(e.target.value)}
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
                >
                  <option value="">-- Select Material --</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Requested Quantity:</label>
                <input
                  type="number"
                  min="1"
                  value={crQty}
                  onChange={(e) => setCrQty(parseInt(e.target.value) || 0)}
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text font-bold"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Reason for Request:</label>
                <input
                  type="text"
                  value={crReason}
                  onChange={(e) => setCrReason(e.target.value)}
                  placeholder="e.g. Additional fragile glassware on site"
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded"
              >
                Submit Change Request to Admin
              </button>
            </div>
          </form>

          {/* Change Requests Queue List */}
          <div className="border border-moveit-border rounded-xl overflow-hidden bg-moveit-surface text-xs">
            <table className="w-full text-left text-moveit-text">
              <thead className="bg-moveit-card text-moveit-text font-bold border-b border-moveit-border">
                <tr>
                  <th className="p-3">Job ID</th>
                  <th className="p-3">Requested By</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Requested Items</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-moveit-border-soft">
                {changeRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-moveit-card/50">
                    <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">{req.jobId}</td>
                    <td className="p-3 text-moveit-text">{req.requestedBy}</td>
                    <td className="p-3 text-moveit-muted">{req.reason}</td>
                    <td className="p-3 font-semibold text-moveit-text">
                      {req.items.map((i) => `${i.materialName}: ${i.requestedQty}`).join(", ")}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        req.status === "APPROVED"
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : req.status === "REJECTED"
                          ? "bg-red-500/20 text-red-600 dark:text-red-400"
                          : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {canApprove && req.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleReviewChangeRequest(req.id, true)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReviewChangeRequest(req.id, false)}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-bold"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: USAGE REPORT */}
      {activeTab === "USAGE" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-moveit-card border border-moveit-border p-4 rounded-xl text-xs">
            <span className="font-bold text-moveit-text">Job Usage Formula: <span className="font-mono text-amber-600 dark:text-amber-400">USED = MATERIAL OUT - MATERIAL IN</span></span>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="bg-moveit-surface border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-mono"
            >
              <option value="cs-4001">Job S.No. 4001 (Al Habtoor Group)</option>
              <option value="cs-4002">Job S.No. 4002 (Emaar Commercial)</option>
            </select>
          </div>

          <div className="border border-moveit-border rounded-xl overflow-hidden bg-moveit-surface text-xs">
            <table className="w-full text-left text-moveit-text">
              <thead className="bg-moveit-card text-moveit-text font-bold border-b border-moveit-border">
                <tr>
                  <th className="p-3">Material Name</th>
                  <th className="p-3 text-center">Approved List Qty</th>
                  <th className="p-3 text-center">Quantity OUT</th>
                  <th className="p-3 text-center">Quantity IN</th>
                  <th className="p-3 text-center">NET USED (OUT - IN)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-moveit-border-soft font-mono">
                {usageRecords.map((u) => (
                  <tr key={u.materialId} className="hover:bg-moveit-card/50">
                    <td className="p-3 font-sans font-semibold text-moveit-text">{u.materialName}</td>
                    <td className="p-3 text-center text-moveit-muted">{u.approvedQty}</td>
                    <td className="p-3 text-center text-amber-600 dark:text-amber-400">{u.quantityOut}</td>
                    <td className="p-3 text-center text-emerald-600 dark:text-emerald-400">{u.quantityIn}</td>
                    <td className="p-3 text-center font-bold text-moveit-text text-sm bg-moveit-card/50">{u.used}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Master Material Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-moveit-surface/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateMaterial} className="bg-moveit-card border border-moveit-border rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-moveit-border pb-3">
              <h3 className="text-sm font-bold text-moveit-text flex items-center gap-2">
                <Boxes className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Add Master Packing Material
              </h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-moveit-muted hover:text-moveit-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-moveit-muted mb-1 font-bold">Material Name:</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Wooden Crate (Large)"
                className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-moveit-muted mb-1">Unit:</label>
                <input
                  type="text"
                  required
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Initial Stock:</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newStock}
                  onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text font-bold"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Min Threshold:</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newMinStock}
                  onChange={(e) => setNewMinStock(parseInt(e.target.value) || 0)}
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-moveit-border">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 bg-moveit-surface-raised text-moveit-text rounded font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded shadow-lg"
              >
                Create Material
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Material Stock Modal */}
      {editingMat && (
        <div className="fixed inset-0 z-50 bg-moveit-surface/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleUpdateStock} className="bg-moveit-card border border-moveit-border rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-moveit-border pb-3">
              <h3 className="text-sm font-bold text-moveit-text">Update Stock: {editingMat.name}</h3>
              <button type="button" onClick={() => setEditingMat(null)} className="text-moveit-muted hover:text-moveit-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-moveit-muted mb-1">Available Stock ({editingMat.unit}):</label>
              <input
                type="number"
                min="0"
                required
                value={editStockVal}
                onChange={(e) => setEditStockVal(parseInt(e.target.value) || 0)}
                className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text font-bold"
              />
            </div>

            <div>
              <label className="block text-moveit-muted mb-1">Minimum Alert Threshold:</label>
              <input
                type="number"
                min="0"
                required
                value={editMinStockVal}
                onChange={(e) => setEditMinStockVal(parseInt(e.target.value) || 0)}
                className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-moveit-border">
              <button
                type="button"
                onClick={() => setEditingMat(null)}
                className="px-3 py-1.5 bg-moveit-surface-raised text-moveit-text rounded font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded shadow-lg"
              >
                Save Stock
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
