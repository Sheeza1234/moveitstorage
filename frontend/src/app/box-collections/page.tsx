"use client";

import { useCan } from "@/lib/use-can";
import React, { useEffect, useState } from "react";
import { services } from "@/services";
import { 
  BoxCollectionTracker, 
  BoxCollectionEvent 
} from "@/types/box-collection";
import { useUIStore } from "@/store/use-ui-store";
import { 
  PackageCheck, 
  Plus, 
  Search, 
  AlertTriangle, 
  Calendar, 
  UserCheck, 
  History,
  X
} from "lucide-react";

export default function BoxCollectionsPage() {
  const can = useCan();
  const currentRole = useUIStore((state) => state.currentRole);
  const canCreate = can("BOX_COLLECTION", "CREATE");
  const canApprove = can("BOX_COLLECTION", "APPROVE");

  const [trackers, setTrackers] = useState<BoxCollectionTracker[]>([]);
  const [selectedTracker, setSelectedTracker] = useState<BoxCollectionTracker | null>(null);
  const [history, setHistory] = useState<BoxCollectionEvent[]>([]);
  const [pendingAlerts, setPendingAlerts] = useState<BoxCollectionTracker[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Tracker Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCustId, setNewCustId] = useState("cust-01");
  const [newBoxesReq, setNewBoxesReq] = useState(100);
  const [newNextDate, setNewNextDate] = useState("");

  // Record Collection Modal State
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordQty, setRecordQty] = useState(30);
  const [recordDate, setRecordDate] = useState(new Date().toISOString().substring(0, 10));
  const [recordStaff, setRecordStaff] = useState("Ahmed Al-Mansoori (TL)");
  const [recordNotes, setRecordNotes] = useState("");
  const [recordAck, setRecordAck] = useState(true);
  const [recordAllowException, setRecordAllowException] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  // Schedule Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");

  const loadTrackers = async () => {
    try {
      const list = await services.boxCollectionService.getTrackers();
      setTrackers(list);
      const alerts = await services.boxCollectionService.getPendingAlerts();
      setPendingAlerts(alerts);
      if (list.length > 0 && !selectedTracker) {
        setSelectedTracker(list[0]);
      }
    } catch (err) {
      console.error("Failed to load box collection trackers:", err);
    }
  };

  const loadHistory = async (trackerId: string) => {
    try {
      const hist = await services.boxCollectionService.getCollectionHistory(trackerId);
      setHistory(hist);
    } catch (err) {
      console.error("Failed to load collection history:", err);
    }
  };

  const selectedTrackerId = selectedTracker?.id;

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const list = await services.boxCollectionService.getTrackers();
      const alerts = await services.boxCollectionService.getPendingAlerts();
      if (!mounted) return;
      setTrackers(list);
      setPendingAlerts(alerts);

      const targetId = selectedTrackerId || (list.length > 0 ? list[0].id : null);
      if (targetId) {
        if (!selectedTrackerId && list.length > 0) {
          setSelectedTracker(list[0]);
        }
        const hist = await services.boxCollectionService.getCollectionHistory(targetId);
        if (mounted) setHistory(hist);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [selectedTrackerId]);

  const handleCreateTracker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await services.boxCollectionService.createTracker({
        customerId: newCustId,
        boxesRequired: Number(newBoxesReq),
        nextCollectionDate: newNextDate || undefined,
      }, "Admin User");

      setShowCreateModal(false);
      setSelectedTracker(created);
      await loadTrackers();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleRecordCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTracker) return;
    setRecordError(null);

    try {
      const res = await services.boxCollectionService.recordCollection(
        {
          trackerId: selectedTracker.id,
          quantityCollected: Number(recordQty),
          collectionDate: recordDate,
          responsibleEmployee: recordStaff,
          notes: recordNotes,
          customerAcknowledgement: recordAck,
          allowAdminException: recordAllowException,
        },
        currentRole,
        "Operations User"
      );

      setShowRecordModal(false);
      setSelectedTracker(res.tracker);
      setRecordNotes("");
      setRecordAllowException(false);
      await loadTrackers();
      await loadHistory(res.tracker.id);
    } catch (err: unknown) {
      setRecordError((err as Error).message);
    }
  };

  const handleScheduleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTracker || !scheduleDate) return;
    try {
      const updated = await services.boxCollectionService.scheduleNextCollection(
        {
          trackerId: selectedTracker.id,
          nextCollectionDate: scheduleDate,
          notes: scheduleNotes,
        },
        "Operations Admin"
      );

      setShowScheduleModal(false);
      setSelectedTracker(updated);
      setScheduleNotes("");
      await loadTrackers();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const filteredTrackers = trackers.filter((t) => {
    return (
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalRequired = trackers.reduce((sum, t) => sum + t.boxesRequired, 0);
  const totalCollected = trackers.reduce((sum, t) => sum + t.boxesCollected, 0);
  const totalRemaining = trackers.reduce((sum, t) => sum + t.boxesRemaining, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-moveit-text tracking-tight flex items-center gap-2">
            <PackageCheck className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            Customer Box Collection Tracking & Follow-Up
          </h1>
          <p className="text-xs text-moveit-muted mt-1">
            Track empty customer box requirements, collected vs remaining formulas, scheduled follow-up dates & operational alert management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {pendingAlerts.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              {pendingAlerts.length} Active Pending Collection Alert(s)
            </div>
          )}

          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg flex items-center gap-2 transition"
            >
              <Plus className="h-4 w-4" />
              New Box Tracker
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-moveit-card border border-moveit-border p-4 rounded-xl space-y-1">
          <span className="text-moveit-muted font-semibold uppercase text-[10px]">Total Boxes Required</span>
          <p className="text-2xl font-black text-moveit-text font-mono">{totalRequired}</p>
        </div>
        <div className="bg-moveit-card border border-moveit-border p-4 rounded-xl space-y-1">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold uppercase text-[10px]">Total Boxes Collected</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{totalCollected}</p>
        </div>
        <div className="bg-moveit-card border border-moveit-border p-4 rounded-xl space-y-1">
          <span className="text-amber-600 dark:text-amber-400 font-semibold uppercase text-[10px]">Total Pending Remaining</span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{totalRemaining}</p>
        </div>
      </div>

      {/* Main Grid: Trackers List & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Trackers List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between bg-moveit-card border border-moveit-border p-3 rounded-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-moveit-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customer..."
                className="w-full bg-moveit-surface border border-moveit-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-moveit-text focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredTrackers.map((t) => {
              const isSelected = selectedTracker?.id === t.id;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTracker(t)}
                  className={`p-4 rounded-xl border transition cursor-pointer space-y-2.5 ${
                    isSelected
                      ? "bg-moveit-card border-amber-500/70 shadow-lg"
                      : "bg-moveit-surface border-moveit-border hover:border-moveit-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-moveit-text text-xs">{t.customerName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.status === "FULLY_COLLECTED"
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : t.status === "COLLECTION_SCHEDULED"
                        ? "bg-moveit-orange/20 text-moveit-orange border border-moveit-orange/30"
                        : t.status === "PARTIALLY_COLLECTED"
                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        : "bg-moveit-surface-raised text-moveit-muted"
                    }`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </div>

                  {/* Section 3: Customer Record View */}
                  <div className="grid grid-cols-3 gap-2 text-center bg-moveit-surface/60 p-2 rounded-lg border border-moveit-border/80 font-mono text-xs">
                    <div>
                      <span className="text-[9px] text-moveit-muted block uppercase">Required</span>
                      <span className="font-bold text-moveit-text">{t.boxesRequired}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-emerald-500 block uppercase">Collected</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{t.boxesCollected}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-amber-500 block uppercase">Remaining</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{t.boxesRemaining}</span>
                    </div>
                  </div>

                  {/* Operational Alert */}
                  {t.hasPendingAlert && t.alertMessage && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>{t.alertMessage}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Selected Tracker Details & Collection History */}
        <div className="lg:col-span-2 space-y-6">
          {selectedTracker ? (
            <>
              <div className="bg-moveit-card border border-moveit-border p-6 rounded-xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-moveit-border pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-moveit-text flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      {selectedTracker.customerName}
                    </h3>
                    <p className="text-xs text-moveit-muted mt-0.5 font-mono">
                      Tracker ID: {selectedTracker.id} | Crew Sheet: {selectedTracker.crewSheetId || "N/A"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {(can("BOX_COLLECTION", "SUBMIT") || can("BOX_COLLECTION", "EDIT")) && (
<button
                      onClick={() => setShowRecordModal(true)}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-md flex items-center gap-1.5"
                    >
                      <Plus className="h-4 w-4" />
                      Record Collection
                    </button>
)}

                    {(can("BOX_COLLECTION", "SUBMIT") || can("BOX_COLLECTION", "EDIT")) && (
<button
                      onClick={() => setShowScheduleModal(true)}
                      className="px-3.5 py-2 bg-moveit-surface-raised hover:bg-moveit-surface-raised text-moveit-text border border-moveit-border font-bold text-xs rounded-lg flex items-center gap-1.5"
                    >
                      <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      Schedule Follow-Up
                    </button>
)}
                  </div>
                </div>

                {/* Main Formula Card */}
                <div className="grid grid-cols-3 gap-4 text-center bg-moveit-surface p-5 rounded-xl border border-moveit-border">
                  <div>
                    <span className="text-xs font-semibold text-moveit-muted uppercase">Required</span>
                    <p className="text-3xl font-black text-moveit-text font-mono mt-1">{selectedTracker.boxesRequired}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Collected</span>
                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">{selectedTracker.boxesCollected}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">Remaining</span>
                    <p className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">{selectedTracker.boxesRemaining}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-moveit-surface p-3 rounded-lg border border-moveit-border">
                    <span className="text-moveit-muted block mb-1">Last Collection Date:</span>
                    <span className="font-semibold text-moveit-text">{selectedTracker.collectionDate || "Not Recorded"}</span>
                  </div>
                  <div className="bg-moveit-surface p-3 rounded-lg border border-moveit-border">
                    <span className="text-moveit-muted block mb-1">Next Follow-Up Collection:</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{selectedTracker.nextCollectionDate || "Not Scheduled"}</span>
                  </div>
                </div>
              </div>

              {/* Historical Collection Log */}
              <div className="bg-moveit-card border border-moveit-border p-6 rounded-xl space-y-4">
                <h4 className="text-sm font-bold text-moveit-text flex items-center gap-2 border-b border-moveit-border pb-3">
                  <History className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Historical Box Collection Events ({history.length})
                </h4>

                <div className="border border-moveit-border rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left text-moveit-text">
                    <thead className="bg-moveit-surface text-moveit-text font-bold border-b border-moveit-border">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5 text-center">Qty Collected</th>
                        <th className="p-2.5">Responsible Staff</th>
                        <th className="p-2.5">Notes</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-moveit-border-soft">
                      {history.map((evt) => (
                        <tr key={evt.id} className="hover:bg-moveit-surface/40">
                          <td className="p-2.5 font-mono text-moveit-text">{evt.collectionDate}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            +{evt.quantityCollected}
                          </td>
                          <td className="p-2.5 text-moveit-text">{evt.responsibleEmployee}</td>
                          <td className="p-2.5 text-moveit-muted">{evt.notes || "-"}</td>
                          <td className="p-2.5 text-center">
                            {evt.isAdminException ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                ADMIN EXCEPTION
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                VERIFIED
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center border border-moveit-border rounded-xl bg-moveit-surface text-moveit-muted">
              Select a tracker from the list to view details and history.
            </div>
          )}
        </div>
      </div>

      {/* Record Collection Modal */}
      {showRecordModal && selectedTracker && (
        <div className="fixed inset-0 z-50 bg-moveit-surface/80 backdrop-blur-sm flex items-center justify-center p-4 text-xs">
          <form onSubmit={handleRecordCollection} className="bg-moveit-card border border-moveit-border rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-moveit-border pb-3">
              <h3 className="text-sm font-bold text-moveit-text flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Record Empty Box Collection ({selectedTracker.customerName})
              </h3>
              <button type="button" onClick={() => setShowRecordModal(false)} className="text-moveit-muted hover:text-moveit-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            {recordError && (
              <div className="p-2.5 bg-red-500/20 border border-red-500/30 rounded text-red-600 dark:text-red-400 font-semibold">
                {recordError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-moveit-muted mb-1 font-bold">Quantity Collected:</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={recordQty}
                  onChange={(e) => setRecordQty(parseInt(e.target.value) || 0)}
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text font-bold text-sm"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Collection Date:</label>
                <input
                  type="date"
                  required
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
                />
              </div>
            </div>

            <div>
              <label className="block text-moveit-muted mb-1">Responsible Employee / Team Leader:</label>
              <input
                type="text"
                required
                value={recordStaff}
                onChange={(e) => setRecordStaff(e.target.value)}
                className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
              />
            </div>

            <div>
              <label className="block text-moveit-muted mb-1">Operational Notes:</label>
              <input
                type="text"
                value={recordNotes}
                onChange={(e) => setRecordNotes(e.target.value)}
                placeholder="e.g. Empty boxes folded and loaded into van"
                className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-moveit-border">
              <label className="flex items-center gap-2 text-moveit-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordAck}
                  onChange={(e) => setRecordAck(e.target.checked)}
                  className="rounded border-moveit-border bg-moveit-surface text-amber-500"
                />
                <span>Customer Acknowledgement Verified</span>
              </label>

              {canApprove && (
                <label className="flex items-center gap-2 text-amber-600 dark:text-amber-400 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={recordAllowException}
                    onChange={(e) => setRecordAllowException(e.target.checked)}
                    className="rounded border-moveit-border bg-moveit-surface text-amber-500"
                  />
                  <span>Approve Admin Exception (Allow Collected &gt; Required)</span>
                </label>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-moveit-border">
              <button type="button" onClick={() => setShowRecordModal(false)} className="px-3 py-1.5 bg-moveit-surface-raised text-moveit-text rounded font-semibold">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded shadow-lg">
                Submit Collection
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schedule Follow-Up Modal */}
      {showScheduleModal && selectedTracker && (
        <div className="fixed inset-0 z-50 bg-moveit-surface/80 backdrop-blur-sm flex items-center justify-center p-4 text-xs">
          <form onSubmit={handleScheduleNext} className="bg-moveit-card border border-moveit-border rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-moveit-border pb-3">
              <h3 className="text-sm font-bold text-moveit-text flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Schedule Next Box Collection
              </h3>
              <button type="button" onClick={() => setShowScheduleModal(false)} className="text-moveit-muted hover:text-moveit-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-moveit-muted mb-1 font-bold">Next Collection Date:</label>
              <input
                type="date"
                required
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
              />
            </div>

            <div>
              <label className="block text-moveit-muted mb-1">Notes / Instructions:</label>
              <input
                type="text"
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                placeholder="e.g. Call client 24h prior to confirm arrival"
                className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-moveit-border">
              <button type="button" onClick={() => setShowScheduleModal(false)} className="px-3 py-1.5 bg-moveit-surface-raised text-moveit-text rounded font-semibold">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded shadow-lg">
                Save Schedule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Tracker Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-moveit-surface/80 backdrop-blur-sm flex items-center justify-center p-4 text-xs">
          <form onSubmit={handleCreateTracker} className="bg-moveit-card border border-moveit-border rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-moveit-border pb-3">
              <h3 className="text-sm font-bold text-moveit-text">Create New Box Collection Tracker</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-moveit-muted hover:text-moveit-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-moveit-muted mb-1 font-bold">Customer Account:</label>
              <select
                value={newCustId}
                onChange={(e) => setNewCustId(e.target.value)}
                className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
              >
                <option value="cust-01">Al Habtoor Group</option>
                <option value="cust-02">Emaar Commercial</option>
                <option value="cust-03">Damac Properties</option>
              </select>
            </div>

            <div>
              <label className="block text-moveit-muted mb-1 font-bold">Number of Boxes Required:</label>
              <input
                type="number"
                min="1"
                required
                value={newBoxesReq}
                onChange={(e) => setNewBoxesReq(parseInt(e.target.value) || 0)}
                className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text font-bold text-sm"
              />
            </div>

            <div>
              <label className="block text-moveit-muted mb-1">Target Collection Date (Optional):</label>
              <input
                type="date"
                value={newNextDate}
                onChange={(e) => setNewNextDate(e.target.value)}
                className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-moveit-border">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-3 py-1.5 bg-moveit-surface-raised text-moveit-text rounded font-semibold">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded shadow-lg">
                Create Tracker
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
