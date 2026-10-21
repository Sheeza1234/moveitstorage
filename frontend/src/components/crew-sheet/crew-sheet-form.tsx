"use client";

import { useCan } from "@/lib/use-can";
import React, { useState } from "react";
import { 
  CrewSheet, 
  MoveType, 
  PropertyType, 
  PerformanceRating, 
  Employee 
} from "@/types/crew-sheet";
import { services } from "@/services";
import { useUIStore } from "@/store/use-ui-store";
import { 
  FileCheck, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Save, 
  Building2,
  ShieldCheck,
  UserCheck
} from "lucide-react";

interface CrewSheetFormProps {
  initialData?: CrewSheet | null;
  employees?: Employee[];
  onSaved?: (cs: CrewSheet) => void;
}

const MOVE_TYPES: { key: MoveType; label: string }[] = [
  { key: "LOCAL_MOVE", label: "LOCAL MOVE" },
  { key: "STORAGE", label: "STORAGE" },
  { key: "STORAGE_REDELIVERY", label: "STORAGE REDELIVERY" },
  { key: "INTERNATIONAL", label: "INTERNATIONAL" },
  { key: "CURTAIN_FIXING", label: "CURTAIN FIXING" },
  { key: "PICKUP_EMPTY_DROP_BOXES", label: "PICK-UP EMPTY / DROP BOXES" },
];

const PROPERTY_TYPES: { key: PropertyType; label: string }[] = [
  { key: "VILLA", label: "VILLA" },
  { key: "APPARTMENT", label: "APPARTMENT" },
  { key: "OFFICE", label: "OFFICE" },
  { key: "RESTAURANT", label: "RESTAURANT" },
  { key: "HOTEL", label: "HOTEL" },
];

const RATINGS: PerformanceRating[] = ["EXCELLENT", "VERY_GOOD", "GOOD", "FAIR", "POOR"];

export function CrewSheetForm({ initialData, employees = [], onSaved }: CrewSheetFormProps) {
  const can = useCan();
  const currentRole = useUIStore((state) => state.currentRole);
  const isAdmin = can("CREW_SHEET", "APPROVE") || can("CREW_SHEET", "EDIT");
  const isTeamLeader = !isAdmin && can("CREW_SHEET", "SUBMIT");

  const [crewSheet, setCrewSheet] = useState<CrewSheet | null>(initialData || null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"FORM" | "PERFORMANCE" | "MATERIALS" | "PRINT">("FORM");

  // Form Fields
  const [selectedMoveTypes, setSelectedMoveTypes] = useState<MoveType[]>(initialData?.moveTypes || ["STORAGE", "LOCAL_MOVE"]);
  const [dateTime, setDateTime] = useState(initialData?.dateTime || new Date().toISOString().replace("T", " ").substring(0, 16));
  const [clientName, setClientName] = useState(initialData?.clientName || "");
  const [contactOnSite, setContactOnSite] = useState(initialData?.contactPersonNumberOnSite || "");
  const [fromLocation, setFromLocation] = useState(initialData?.fromLocation || "");
  const [toLocation, setToLocation] = useState(initialData?.toLocation || "");
  
  // Assignment Fields
  const [teamLeaderId, setTeamLeaderId] = useState(initialData?.teamLeaderId || "");
  const [packerIds, setPackerIds] = useState<string[]>(initialData?.packerIds || []);
  
  // Job Details
  const [propertyType, setPropertyType] = useState<PropertyType>(initialData?.propertyType || "VILLA");
  const [manpowerTotalCbm, setManpowerTotalCbm] = useState(initialData?.manpowerTotalCbm || 10.0);
  const [surveyedBy, setSurveyedBy] = useState(initialData?.surveyedBy || "Operations Lead");
  const [advanceDeposit, setAdvanceDeposit] = useState(initialData?.advanceDepositCollected || "0 AED");
  const [balanceToBeCollected, setBalanceToBeCollected] = useState(initialData?.balanceToBeCollected || "0 AED");
  const [modeOfPayment, setModeOfPayment] = useState(initialData?.modeOfPayment || "BANK_TRANSFER");
  const [bldgPermitRequired, setBldgPermitRequired] = useState<boolean>(initialData?.buildingPermitRequired || false);
  const [docAttached, setDocAttached] = useState<boolean>(initialData?.documentAttached ?? true);
  const [jobInstructions, setJobInstructions] = useState(initialData?.jobInstructions || "");
  const [preparedBy, setPreparedBy] = useState(initialData?.preparedBy || "Operations Coordinator");
  const [coordinatedBy, setCoordinatedBy] = useState(initialData?.coordinatedBy || "Logistics Desk");
  const [receivedBy, setReceivedBy] = useState(initialData?.receivedBy || "Warehouse Lead");

  // Performance Report & Materials State
  const [performanceReport, setPerformanceReport] = useState(initialData?.performanceReport || []);
  const [packingMaterials, setPackingMaterials] = useState(initialData?.packingMaterialDetails || []);
  
  // Signature Fields
  const [customerSig, setCustomerSig] = useState(initialData?.customerSignature || "");
  const [teamLeaderSig, setTeamLeaderSig] = useState(initialData?.teamLeaderSignature || "");

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleMoveTypeToggle = (mt: MoveType) => {
    setSelectedMoveTypes((prev) => 
      prev.includes(mt) ? prev.filter((t) => t !== mt) : [...prev, mt]
    );
  };

  const handlePackerToggle = (pId: string) => {
    setPackerIds((prev) => 
      prev.includes(pId) ? prev.filter((id) => id !== pId) : [...prev, pId]
    );
  };

  const handleRatingChange = (index: number, rating: PerformanceRating) => {
    const updated = [...performanceReport];
    updated[index].rating = rating;
    setPerformanceReport(updated);
  };

  const handleMaterialQtyChange = (index: number, field: "materialOutQty" | "materialInQty", val: number) => {
    const updated = [...packingMaterials];
    updated[index][field] = Math.max(0, val);
    setPackingMaterials(updated);
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      if (crewSheet) {
        const updated = await services.crewSheetService.updateCrewSheet(
          crewSheet.id,
          {
            moveTypes: selectedMoveTypes,
            dateTime,
            clientName,
            contactPersonNumberOnSite: contactOnSite,
            fromLocation,
            toLocation,
            teamLeaderId,
            packerIds,
            propertyType,
            manpowerTotalCbm: Number(manpowerTotalCbm),
            surveyedBy,
            advanceDepositCollected: advanceDeposit,
            balanceToBeCollected,
            modeOfPayment,
            buildingPermitRequired: bldgPermitRequired,
            documentAttached: docAttached,
            jobInstructions,
            preparedBy,
            coordinatedBy,
            receivedBy,
            performanceReport,
            packingMaterialDetails: packingMaterials,
            customerSignature: customerSig,
            teamLeaderSignature: teamLeaderSig,
          },
          currentRole,
          "User"
        );
        setCrewSheet(updated);
        setMessage({ type: "success", text: `Crew Sheet ${updated.crewSheetNumber} updated successfully!` });
        if (onSaved) onSaved(updated);
      } else {
        const created = await services.crewSheetService.createCrewSheet(
          {
            moveTypes: selectedMoveTypes,
            dateTime,
            clientName,
            contactPersonNumberOnSite: contactOnSite,
            fromLocation,
            toLocation,
            teamLeaderId,
            packerIds,
            propertyType,
            manpowerTotalCbm: Number(manpowerTotalCbm),
            jobInstructions,
            preparedBy,
          },
          currentRole,
          "User"
        );
        setCrewSheet(created);
        setMessage({ type: "success", text: `Crew Sheet ${created.crewSheetNumber} created successfully!` });
        if (onSaved) onSaved(created);
      }
    } catch (err: unknown) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptJob = async () => {
    if (!crewSheet) return;
    setLoading(true);
    setMessage(null);
    try {
      const accepted = await services.crewSheetService.acceptJob(crewSheet.id, teamLeaderId || "emp-tl-1", "Team Leader");
      setCrewSheet(accepted);
      setMessage({ type: "success", text: `Job accepted! Crew sheet status set to IN_PROGRESS.` });
      if (onSaved) onSaved(accepted);
    } catch (err: unknown) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCompletion = async () => {
    if (!crewSheet) return;
    setLoading(true);
    setMessage(null);
    try {
      const submitted = await services.crewSheetService.submitCrewSheet(crewSheet.id, teamLeaderId || "emp-tl-1", "Team Leader");
      setCrewSheet(submitted);
      setMessage({ type: "success", text: `Crew Sheet SUBMITTED to Admin for review!` });
      if (onSaved) onSaved(submitted);
    } catch (err: unknown) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteWithSignatures = async () => {
    if (!crewSheet) return;
    if (!customerSig || !teamLeaderSig) {
      setMessage({ type: "error", text: "Both Customer Signature and Team Leader Signature are required to complete the sheet." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const completed = await services.crewSheetService.completeCrewSheet(
        crewSheet.id,
        customerSig,
        teamLeaderSig,
        "Team Leader"
      );
      setCrewSheet(completed);
      setMessage({ type: "success", text: `Crew Sheet ${completed.crewSheetNumber} COMPLETED & SIGNED!` });
      if (onSaved) onSaved(completed);
    } catch (err: unknown) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const teamLeaders = employees.filter((e) => e.role === "TEAM_LEADER");
  const packers = employees.filter((e) => e.role === "PACKER" || e.role === "HELPER");

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-moveit-card border border-moveit-border p-4 rounded-xl text-moveit-text shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-moveit-orange/10 border border-moveit-orange/30 flex items-center justify-center text-moveit-orange">
            <FileCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">
                {crewSheet ? crewSheet.crewSheetNumber : "NEW CREW SHEET"}
              </h2>
              {crewSheet && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  crewSheet.status === "COMPLETED"
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : crewSheet.status === "IN_PROGRESS"
                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "bg-moveit-orange/20 text-moveit-orange border border-moveit-orange/30"
                }`}>
                  {crewSheet.status}
                </span>
              )}
            </div>
            <p className="text-xs text-moveit-muted">
              MoveIt Official Digital Crew Sheet S.No. 4001 Engine
            </p>
          </div>
        </div>

        {/* Action Navigation Bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("FORM")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "FORM" ? "bg-moveit-orange text-white" : "bg-moveit-surface-raised text-moveit-text hover:bg-moveit-surface-raised"
            }`}
          >
            Digital Sheet
          </button>
          <button
            onClick={() => setActiveTab("PERFORMANCE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "PERFORMANCE" ? "bg-moveit-orange text-white" : "bg-moveit-surface-raised text-moveit-text hover:bg-moveit-surface-raised"
            }`}
          >
            Performance Report
          </button>
          <button
            onClick={() => setActiveTab("MATERIALS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "MATERIALS" ? "bg-moveit-orange text-white" : "bg-moveit-surface-raised text-moveit-text hover:bg-moveit-surface-raised"
            }`}
          >
            Materials Out/In
          </button>
          <button
            onClick={() => setActiveTab("PRINT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
              activeTab === "PRINT" ? "bg-moveit-orange text-white" : "bg-moveit-surface-raised text-moveit-text hover:bg-moveit-surface-raised"
            }`}
          >
            <Printer className="h-3.5 w-3.5" />
            PDF View
          </button>

          {crewSheet?.status === "ASSIGNED" && (
            <button
              onClick={handleAcceptJob}
              disabled={loading}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1"
            >
              <UserCheck className="h-4 w-4" />
              Accept Job
            </button>
          )}

          {crewSheet?.status === "IN_PROGRESS" && (
            <button
              onClick={handleSubmitCompletion}
              disabled={loading}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1"
            >
              <CheckCircle2 className="h-4 w-4" />
              Submit Sheet
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-1.5 bg-moveit-orange hover:bg-moveit-orange text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5"
          >
            <Save className="h-4 w-4" />
            Save Sheet
          </button>
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

      {/* TAB 1: DIGITAL CREW SHEET FORM */}
      {activeTab === "FORM" && (
        <div className="bg-moveit-surface border border-moveit-border rounded-xl p-6 shadow-2xl space-y-6 text-xs">
          {/* Header Block matching physical Crew Sheet S.No. 4001 */}
          <div className="border border-moveit-border rounded-xl p-5 bg-moveit-card/60 space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-moveit-border pb-4">
              <div>
                <h3 className="text-lg font-black tracking-wider text-moveit-orange uppercase">
                  MOVE IT Cargo Packaging and Movers LLC
                </h3>
                <p className="text-xs text-moveit-muted">
                  Warehouse 26, Street 19, Al Quoz Industrial 1 Dubai - UAE | Toll Free: 800 Moveit (668348)
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-3 py-1 rounded border border-red-500/30">
                  CREW SHEET {crewSheet?.crewSheetNumber || "S.No. 4001"}
                </span>
              </div>
            </div>

            {/* Move Type Checkboxes */}
            <div className="flex flex-wrap items-center gap-4 py-2 border-b border-moveit-border">
              <span className="font-bold text-moveit-text">Move Type:</span>
              {MOVE_TYPES.map((mt) => (
                <label key={mt.key} className="flex items-center gap-1.5 cursor-pointer text-moveit-text font-medium">
                  <input
                    type="checkbox"
                    checked={selectedMoveTypes.includes(mt.key)}
                    onChange={() => handleMoveTypeToggle(mt.key)}
                    className="accent-blue-500 h-4 w-4 rounded"
                  />
                  {mt.label}
                </label>
              ))}
            </div>

            {/* Client & Assignment Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-moveit-muted mb-1">CLIENT&apos;S NAME:</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-medium"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">CONTACT PERSON/NUMBER ON SITE:</label>
                <input
                  type="text"
                  value={contactOnSite}
                  onChange={(e) => setContactOnSite(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-medium"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">DATE AND TIME:</label>
                <input
                  type="text"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-medium"
                />
              </div>

              <div>
                <label className="block text-moveit-muted mb-1">FROM:</label>
                <input
                  type="text"
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-medium"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">TO:</label>
                <input
                  type="text"
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-medium"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">SURVEYED BY:</label>
                <input
                  type="text"
                  value={surveyedBy}
                  onChange={(e) => setSurveyedBy(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-medium"
                />
              </div>

              {/* Team Leader & Packers Dropdown Selectors */}
              <div>
                <label className="block text-moveit-orange font-bold mb-1 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  TEAM LEADER:
                </label>
                <select
                  value={teamLeaderId}
                  onChange={(e) => setTeamLeaderId(e.target.value)}
                  disabled={isTeamLeader && crewSheet?.status !== "DRAFT"}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-bold disabled:opacity-60"
                >
                  <option value="">-- Select Available Team Leader --</option>
                  {teamLeaders.map((tl) => (
                    <option key={tl.id} value={tl.id}>
                      {tl.name} ({tl.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-moveit-text font-bold mb-1 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  PACKERS & HELPER CREW ASSIGNED:
                </label>
                <div className="flex flex-wrap items-center gap-3 bg-moveit-surface-raised border border-moveit-border rounded p-2">
                  {packers.map((pk) => (
                    <label key={pk.id} className="flex items-center gap-1.5 cursor-pointer text-moveit-text">
                      <input
                        type="checkbox"
                        checked={packerIds.includes(pk.id)}
                        onChange={() => handlePackerToggle(pk.id)}
                        disabled={isTeamLeader && crewSheet?.status !== "DRAFT"}
                        className="accent-emerald-500 h-4 w-4 rounded"
                      />
                      {pk.name} ({pk.role})
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* JOB DETAILS SECTION matching physical sheet banner */}
          <div className="border border-moveit-border rounded-xl p-5 bg-moveit-card/80 space-y-4">
            <div className="bg-moveit-surface-raised px-4 py-1.5 rounded text-center text-xs font-bold text-moveit-text tracking-widest uppercase">
              JOB DETAILS
            </div>

            {/* Property Type Checkboxes */}
            <div className="flex flex-wrap items-center gap-4 py-2 border-b border-moveit-border">
              <span className="font-bold text-moveit-text">Property Type:</span>
              {PROPERTY_TYPES.map((pt) => (
                <label key={pt.key} className="flex items-center gap-1.5 cursor-pointer text-moveit-text font-medium">
                  <input
                    type="radio"
                    name="propertyType"
                    checked={propertyType === pt.key}
                    onChange={() => setPropertyType(pt.key)}
                    className="accent-blue-500 h-4 w-4"
                  />
                  {pt.label}
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-moveit-muted mb-1">MAN POWER TOTAL CBM:</label>
                <input
                  type="number"
                  step="0.1"
                  value={manpowerTotalCbm}
                  onChange={(e) => setManpowerTotalCbm(parseFloat(e.target.value) || 0)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-amber-600 dark:text-amber-400 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">ADVANCE/DEPOSIT COLLECTED:</label>
                <input
                  type="text"
                  value={advanceDeposit}
                  onChange={(e) => setAdvanceDeposit(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">BALANCE TO BE COLLECTED:</label>
                <input
                  type="text"
                  value={balanceToBeCollected}
                  onChange={(e) => setBalanceToBeCollected(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text"
                />
              </div>

              <div>
                <label className="block text-moveit-muted mb-1">MODE OF PAYMENT:</label>
                <input
                  type="text"
                  value={modeOfPayment}
                  onChange={(e) => setModeOfPayment(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text"
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-moveit-text font-bold">
                  <input
                    type="checkbox"
                    checked={bldgPermitRequired}
                    onChange={(e) => setBldgPermitRequired(e.target.checked)}
                    className="accent-blue-500 h-4 w-4 rounded"
                  />
                  BUILDING PERMIT REQUIRED
                </label>
              </div>
              <div className="flex items-center gap-4 pt-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-moveit-text font-bold">
                  <input
                    type="checkbox"
                    checked={docAttached}
                    onChange={(e) => setDocAttached(e.target.checked)}
                    className="accent-blue-500 h-4 w-4 rounded"
                  />
                  NO DOCUMENT ATTACHED
                </label>
              </div>
            </div>

            {/* Job Instructions */}
            <div>
              <label className="block text-moveit-text font-bold mb-1">
                JOB INSTRUCTIONS AND SPECIFICATION (Customer instruction and request):
              </label>
              <textarea
                rows={3}
                value={jobInstructions}
                onChange={(e) => setJobInstructions(e.target.value)}
                className="w-full bg-moveit-surface-raised border border-moveit-border rounded p-3 text-moveit-text"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-moveit-border">
              <div>
                <label className="block text-moveit-muted mb-1">PREPARED BY:</label>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">COORDINATED BY:</label>
                <input
                  type="text"
                  value={coordinatedBy}
                  onChange={(e) => setCoordinatedBy(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">RECEIVED BY:</label>
                <input
                  type="text"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded px-3 py-1.5 text-moveit-text"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PERFORMANCE REPORT */}
      {activeTab === "PERFORMANCE" && (
        <div className="bg-moveit-surface border border-moveit-border rounded-xl p-6 shadow-2xl space-y-4 text-xs">
          <div className="bg-moveit-surface-raised px-4 py-2 rounded text-center font-bold text-moveit-text tracking-widest uppercase flex items-center justify-center gap-2">
            <Building2 className="h-4 w-4 text-moveit-orange" />
            PERFORMANCE REPORT
          </div>

          <div className="border border-moveit-border rounded-lg overflow-hidden bg-moveit-card/60">
            <table className="w-full text-left text-moveit-text">
              <thead className="bg-moveit-surface-raised text-moveit-text font-bold uppercase border-b border-moveit-border">
                <tr>
                  <th className="p-3 w-1/4">Dimensions</th>
                  <th className="p-3 w-2/5">Description</th>
                  {RATINGS.map((r) => (
                    <th key={r} className="p-2 text-center text-[10px]">{r.replace("_", " ")}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-moveit-border-soft">
                {performanceReport.map((item, idx) => (
                  <tr key={item.dimension} className="hover:bg-moveit-surface-raised/40">
                    <td className="p-3 font-bold text-moveit-text">{item.dimension}</td>
                    <td className="p-3 text-moveit-muted">{item.description}</td>
                    {RATINGS.map((r) => (
                      <td key={r} className="p-2 text-center">
                        <input
                          type="radio"
                          name={`rating-${idx}`}
                          checked={item.rating === r}
                          onChange={() => handleRatingChange(idx, r)}
                          className="accent-blue-500 h-4 w-4 cursor-pointer"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PACKING MATERIAL DETAILS */}
      {activeTab === "MATERIALS" && (
        <div className="bg-moveit-surface border border-moveit-border rounded-xl p-6 shadow-2xl space-y-4 text-xs">
          <div className="bg-moveit-surface-raised px-4 py-2 rounded text-center font-bold text-moveit-text tracking-widest uppercase flex items-center justify-center gap-2">
            PACKING MATERIAL DETAILS
          </div>

          <div className="border border-moveit-border rounded-lg overflow-hidden bg-moveit-card/60">
            <table className="w-full text-left text-moveit-text">
              <thead className="bg-moveit-surface-raised text-moveit-text font-bold uppercase border-b border-moveit-border">
                <tr>
                  <th className="p-3">Material Out</th>
                  <th className="p-3 text-center">Qty Out</th>
                  <th className="p-3">Material In</th>
                  <th className="p-3 text-center">Qty In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-moveit-border-soft">
                {packingMaterials.map((mat, idx) => (
                  <tr key={mat.materialName} className="hover:bg-moveit-surface-raised/40">
                    <td className="p-3 font-medium text-moveit-text">{mat.materialName}</td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={mat.materialOutQty}
                        onChange={(e) => handleMaterialQtyChange(idx, "materialOutQty", parseInt(e.target.value) || 0)}
                        className="w-16 bg-moveit-surface-raised border border-moveit-border text-center py-1 text-moveit-text font-bold rounded"
                      />
                    </td>
                    <td className="p-3 font-medium text-moveit-text">{mat.materialName}</td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={mat.materialInQty}
                        onChange={(e) => handleMaterialQtyChange(idx, "materialInQty", parseInt(e.target.value) || 0)}
                        className="w-16 bg-moveit-surface-raised border border-moveit-border text-center py-1 text-moveit-text font-bold rounded"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Customer & Team Leader Signatures */}
          <div className="border border-moveit-border rounded-xl p-5 bg-moveit-card/80 space-y-4">
            <h4 className="font-bold text-moveit-text uppercase text-xs">Customer & Team Leader Signatures</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-moveit-muted mb-1">Customer Signature (Type Name / Confirmation):</label>
                <input
                  type="text"
                  value={customerSig}
                  onChange={(e) => setCustomerSig(e.target.value)}
                  placeholder="Enter Customer Signature / Name"
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded p-2.5 text-moveit-text font-serif italic text-sm"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Team Leader Signature:</label>
                <input
                  type="text"
                  value={teamLeaderSig}
                  onChange={(e) => setTeamLeaderSig(e.target.value)}
                  placeholder="Enter Team Leader Signature"
                  className="w-full bg-moveit-surface-raised border border-moveit-border rounded p-2.5 text-moveit-text font-serif italic text-sm"
                />
              </div>
            </div>
            {crewSheet?.status !== "COMPLETED" && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleCompleteWithSignatures}
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition"
                >
                  Complete Job & Lock Signatures
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PRINT / PDF VIEW (Matching Physical Crew Sheet S.No. 4001) */}
      {activeTab === "PRINT" && (
        <div className="bg-moveit-card text-moveit-text p-8 rounded-xl shadow-2xl space-y-6 font-sans text-xs border border-moveit-border">
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
              <h2 className="text-xl font-black tracking-widest text-moveit-text uppercase">CREW SHEET</h2>
              <p className="text-sm font-bold text-red-600 mt-1">{crewSheet?.crewSheetNumber || "S.No. 4001"}</p>
            </div>
          </div>

          <div className="border border-moveit-border-soft p-3 rounded space-y-2 text-[11px]">
            <div className="flex flex-wrap gap-4 font-bold border-b border-moveit-border pb-2">
              {MOVE_TYPES.map((mt) => (
                <span key={mt.key} className={selectedMoveTypes.includes(mt.key) ? "text-moveit-orange underline" : "text-moveit-muted"}>
                  [{selectedMoveTypes.includes(mt.key) ? "✓" : " "}] {mt.label}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <p><span className="font-bold">CLIENT&apos;S NAME:</span> {clientName}</p>
              <p><span className="font-bold">CONTACT ON SITE:</span> {contactOnSite}</p>
              <p><span className="font-bold">FROM:</span> {fromLocation}</p>
              <p><span className="font-bold">TO:</span> {toLocation}</p>
              <p><span className="font-bold">TEAM LEADER:</span> {crewSheet?.teamLeaderName || "Ahmed Al-Mansoori"}</p>
              <p><span className="font-bold">PACKERS:</span> {(crewSheet?.packerNames || []).join(", ")}</p>
            </div>
          </div>

          <div className="border border-moveit-border-soft p-3 rounded space-y-2 text-[11px]">
            <div className="bg-moveit-surface-raised font-bold p-1 text-center border-b border-moveit-border-soft">JOB DETAILS</div>
            <div className="grid grid-cols-3 gap-2 pt-1 font-semibold">
              <p>MAN POWER TOTAL CBM: {manpowerTotalCbm} CBM</p>
              <p>SURVEYED BY: {surveyedBy}</p>
              <p>MODE OF PAYMENT: {modeOfPayment}</p>
              <p>ADVANCE COLLECTED: {advanceDeposit}</p>
              <p>BALANCE TO BE COLLECTED: {balanceToBeCollected}</p>
              <p>BUILDING PERMIT: {bldgPermitRequired ? "YES" : "NO"}</p>
            </div>
            <div className="pt-2 border-t border-moveit-border">
              <p className="font-bold">JOB INSTRUCTIONS AND SPECIFICATION:</p>
              <p className="italic text-moveit-text">{jobInstructions}</p>
            </div>
          </div>

          {/* Performance Report Table in PDF */}
          <div className="border border-moveit-border-soft rounded overflow-hidden">
            <div className="bg-moveit-surface-raised font-bold p-1 text-center border-b border-moveit-border-soft">PERFORMANCE REPORT</div>
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="bg-moveit-surface font-bold border-b border-moveit-border-soft">
                  <th className="p-1 border-r border-moveit-border-soft text-left">Dimensions</th>
                  <th className="p-1 border-r border-moveit-border-soft text-left">Description</th>
                  {RATINGS.map((r) => (
                    <th key={r} className="p-1 text-center border-r border-moveit-border-soft">{r.replace("_", " ")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {performanceReport.map((item) => (
                  <tr key={item.dimension} className="border-b border-moveit-border">
                    <td className="p-1 font-bold border-r border-moveit-border-soft">{item.dimension}</td>
                    <td className="p-1 border-r border-moveit-border-soft">{item.description}</td>
                    {RATINGS.map((r) => (
                      <td key={r} className="p-1 text-center font-bold border-r border-moveit-border-soft">
                        {item.rating === r ? "✓" : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-12 pt-8 text-center font-bold">
            <div className="border-t border-moveit-border-soft pt-2">
              Customer&apos;s Signature: <span className="font-serif italic text-moveit-orange font-bold">{customerSig || "(Pending)"}</span>
            </div>
            <div className="border-t border-moveit-border-soft pt-2">
              Team Leader Signature: <span className="font-serif italic text-moveit-orange font-bold">{teamLeaderSig || "(Pending)"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
