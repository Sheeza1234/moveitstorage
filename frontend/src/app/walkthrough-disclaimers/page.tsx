"use client";

import { useCan } from "@/lib/use-can";
import React, { useEffect, useState } from "react";
import { services } from "@/services";
import { WalkthroughDisclaimer } from "@/types/walkthrough-disclaimer";
import { WalkthroughDisclaimerForm } from "@/components/walkthrough/walkthrough-disclaimer-form";
import { 
  FileCheck2, 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  UserCheck
} from "lucide-react";

export default function WalkthroughDisclaimersPage() {
  const can = useCan();
  const [disclaimers, setDisclaimers] = useState<WalkthroughDisclaimer[]>([]);
  const [selectedDisclaimer, setSelectedDisclaimer] = useState<WalkthroughDisclaimer | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>("Al Habtoor Group");
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [newCrewLeader, setNewCrewLeader] = useState<string>("Ahmed Al-Mansoori");
  const [newBoxes, setNewBoxes] = useState<number>(100);
  const [newEmptyDate, setNewEmptyDate] = useState<string>("2026-10-15");

  const loadDisclaimers = async () => {
    try {
      const list = await services.walkthroughDisclaimerService.getDisclaimers();
      setDisclaimers(list);
      if (list.length > 0 && !selectedDisclaimer) {
        setSelectedDisclaimer(list[0]);
      } else if (selectedDisclaimer) {
        const updated = list.find((d) => d.id === selectedDisclaimer.id);
        if (updated) setSelectedDisclaimer(updated);
      }
    } catch (err) {
      console.error("Failed to load disclaimers:", err);
    }
  };

  const selectedDisclaimerId = selectedDisclaimer?.id;

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const list = await services.walkthroughDisclaimerService.getDisclaimers();
      if (!mounted) return;
      setDisclaimers(list);
      if (list.length > 0 && !selectedDisclaimerId) {
        setSelectedDisclaimer(list[0]);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [selectedDisclaimerId]);

  const handleCreateDisclaimer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await services.walkthroughDisclaimerService.createDisclaimer({
        customerName: newCustName,
        date: newDate,
        crewLeaderNameDetails: newCrewLeader,
        boxesToBeCollected: Number(newBoxes),
        emptyBoxCollectionDate: newEmptyDate,
      });

      setShowCreateModal(false);
      setSelectedDisclaimer(created);
      await loadDisclaimers();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const filteredDisclaimers = disclaimers.filter((d) => {
    const matchesStatus = statusFilter === "ALL" || d.status === statusFilter;
    const matchesSearch =
      d.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.crewLeaderNameDetails && d.crewLeaderNameDetails.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const flaggedCount = disclaimers.filter((d) => d.status === "FLAGGED_WITH_ISSUES").length;
  const completedCount = disclaimers.filter((d) => d.status === "COMPLETED").length;
  const draftCount = disclaimers.filter((d) => d.status === "DRAFT").length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-moveit-text tracking-tight flex items-center gap-2">
            <FileCheck2 className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            Walk Through & Damage Disclaimer for Redelivery
          </h1>
          <p className="text-xs text-moveit-muted mt-1">
            Master template digital form for local & storage redelivery walk-throughs, damage records, missing item discrepancies & customer/crew leader sign-offs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {flaggedCount > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              {flaggedCount} Disclaimer(s) Flagged for Admin Review
            </div>
          )}

          {can("WALKTHROUGH", "CREATE") && (
<button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg flex items-center gap-2 transition"
          >
            <Plus className="h-4 w-4" />
            New Walk Through Disclaimer
          </button>
)}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div className="bg-moveit-card border border-moveit-border p-4 rounded-xl space-y-1">
          <span className="text-moveit-muted font-semibold uppercase text-[10px]">Total Disclaimers</span>
          <p className="text-2xl font-black text-moveit-text font-mono">{disclaimers.length}</p>
        </div>
        <div className="bg-moveit-card border border-moveit-border p-4 rounded-xl space-y-1">
          <span className="text-amber-600 dark:text-amber-400 font-semibold uppercase text-[10px]">Draft / In-Progress</span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{draftCount}</p>
        </div>
        <div className="bg-moveit-card border border-moveit-border p-4 rounded-xl space-y-1">
          <span className="text-red-600 dark:text-red-400 font-semibold uppercase text-[10px]">Flagged (Issues)</span>
          <p className="text-2xl font-black text-red-600 dark:text-red-400 font-mono">{flaggedCount}</p>
        </div>
        <div className="bg-moveit-card border border-moveit-border p-4 rounded-xl space-y-1">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold uppercase text-[10px]">Completed & Signed</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{completedCount}</p>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List View (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-moveit-card border border-moveit-border p-3 rounded-xl space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-moveit-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customer, ID, crew leader..."
                className="w-full bg-moveit-surface border border-moveit-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-moveit-text focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-1 bg-moveit-surface p-1 rounded-lg border border-moveit-border text-[11px] font-semibold">
              {["ALL", "DRAFT", "FLAGGED_WITH_ISSUES", "COMPLETED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`flex-1 py-1 rounded text-center transition ${
                    statusFilter === st
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "text-moveit-muted hover:text-moveit-text"
                  }`}
                >
                  {st === "FLAGGED_WITH_ISSUES" ? "FLAGGED" : st}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {filteredDisclaimers.map((d) => {
              const isSelected = selectedDisclaimer?.id === d.id;
              const hasIssues = d.damageRecords.length > 0 || d.missingItemRecords.length > 0;

              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedDisclaimer(d)}
                  className={`p-4 rounded-xl border transition cursor-pointer space-y-2.5 ${
                    isSelected
                      ? "bg-moveit-card border-amber-500 shadow-lg"
                      : "bg-moveit-surface border-moveit-border hover:border-moveit-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-moveit-text text-xs truncate max-w-[180px]">
                      {d.customerName}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        d.status === "COMPLETED"
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : d.status === "FLAGGED_WITH_ISSUES"
                          ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                          : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {d.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-moveit-muted font-mono">
                    <span>{d.id}</span>
                    <span>Date: {d.date}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-moveit-text bg-moveit-surface/60 p-2 rounded border border-moveit-border">
                    <div>
                      <span className="text-moveit-muted block">Crew Leader</span>
                      <span className="font-semibold text-moveit-text truncate block">{d.crewLeaderNameDetails || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-moveit-muted block">Empty Boxes</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{d.boxesToBeCollected} Boxes</span>
                    </div>
                  </div>

                  {hasIssues && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 p-1.5 rounded">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>
                        {d.damageRecords.length} Damage(s) | {d.missingItemRecords.length} Discrepancy(ies)
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-moveit-muted pt-1 border-t border-moveit-border">
                    <span className="flex items-center gap-1">
                      <UserCheck className="h-3 w-3 text-moveit-muted" />
                      Sign-Off: {d.customerSignature ? "Customer ✓" : "Pending"}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-moveit-muted" />
                      Crew: {d.crewLeaderSignature ? "Leader ✓" : "Pending"}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredDisclaimers.length === 0 && (
              <div className="p-8 text-center bg-moveit-surface border border-moveit-border rounded-xl text-moveit-muted text-xs">
                No Walk Through Disclaimers found matching your filter.
              </div>
            )}
          </div>
        </div>

        {/* Right Master Template Form View (8 cols) */}
        <div className="lg:col-span-8">
          {selectedDisclaimer ? (
            <WalkthroughDisclaimerForm
              key={selectedDisclaimer.id}
              disclaimer={selectedDisclaimer}
              onSaved={loadDisclaimers}
              onUpdate={loadDisclaimers}
            />
          ) : (
            <div className="p-16 text-center border border-moveit-border rounded-xl bg-moveit-surface text-moveit-muted">
              Select a Walk Through Disclaimer from the list to view or edit master template form.
            </div>
          )}
        </div>
      </div>

      {/* Create New Walkthrough Disclaimer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-moveit-surface/80 backdrop-blur-sm flex items-center justify-center p-4 text-xs">
          <form
            onSubmit={handleCreateDisclaimer}
            className="bg-moveit-card border border-moveit-border rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-moveit-border pb-3">
              <h3 className="text-sm font-bold text-moveit-text flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                New Walk Through Disclaimer Master Form
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-moveit-muted hover:text-moveit-text"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-moveit-muted mb-1 font-bold">Customer Name:</label>
              <input
                type="text"
                required
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-moveit-muted mb-1 font-bold">Date:</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1 font-bold">Crew Leader Name:</label>
                <input
                  type="text"
                  required
                  value={newCrewLeader}
                  onChange={(e) => setNewCrewLeader(e.target.value)}
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-moveit-muted mb-1 font-bold">Number of Boxes to be Collected:</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newBoxes}
                  onChange={(e) => setNewBoxes(parseInt(e.target.value) || 0)}
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text font-bold"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1 font-bold">Empty Box Collection Date:</label>
                <input
                  type="date"
                  required
                  value={newEmptyDate}
                  onChange={(e) => setNewEmptyDate(e.target.value)}
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
                Create Master Form
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
