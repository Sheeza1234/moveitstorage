"use client";

import { useCan } from "@/lib/use-can";
import React, { useState } from "react";
import { 
  WalkthroughDisclaimer, 
  WalkthroughChecklistItem 
} from "@/types/walkthrough-disclaimer";
import { services } from "@/services";
import { useUIStore } from "@/store/use-ui-store";
import { 
  FileCheck2, 
  Printer, 
  CheckCircle2, 
  ShieldAlert, 
  Boxes
} from "lucide-react";

interface WalkthroughDisclaimerFormProps {
  initialData?: WalkthroughDisclaimer | null;
  disclaimer?: WalkthroughDisclaimer | null;
  onSaved?: (wt: WalkthroughDisclaimer) => void;
  onUpdate?: () => void;
}

export function WalkthroughDisclaimerForm({ initialData, disclaimer: disclaimerProp, onSaved, onUpdate }: WalkthroughDisclaimerFormProps) {
  const can = useCan();
  const currentRole = useUIStore((state) => state.currentRole);
  const activeDisclaimerData = disclaimerProp || initialData || null;

  const [disclaimer, setDisclaimer] = useState<WalkthroughDisclaimer | null>(activeDisclaimerData);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"FORM" | "DAMAGE" | "MISSING" | "PRINT">("FORM");

  // Form Fields
  const [date, setDate] = useState(activeDisclaimerData?.date || new Date().toISOString().substring(0, 10));
  const [customerName, setCustomerName] = useState(activeDisclaimerData?.customerNameDetails || activeDisclaimerData?.customerName || "");
  const [checklist, setChecklist] = useState<WalkthroughChecklistItem[]>(
    activeDisclaimerData?.checklist || [
      { sl: 1, particulars: "Checked all my items and removed from the ORIGIN OF REMOVALS", yes: true, no: false },
      { sl: 2, particulars: "Checked the STORAGE/VEHICLE/TRUCK/CONTAINER and there are no ITEMS left behind.", yes: true, no: false },
      { sl: 3, particulars: "Walk through with the CREW LEADER and everything is unpack the way I requested to.", yes: true, no: false },
      { sl: 4, particulars: "Walk through with the CREW LEADER and check all my items are complete and intact.", yes: true, no: false },
      { sl: 5, particulars: "Items are mishandled and broken", yes: false, no: true },
      { sl: 6, particulars: "I have broken cupboards, cabinets, bed, tables, etc.", yes: false, no: true },
    ]
  );
  const [boxesToBeCollected, setBoxesToBeCollected] = useState(activeDisclaimerData?.boxesToBeCollected || 0);
  const [emptyBoxCollectionDate, setEmptyBoxCollectionDate] = useState(activeDisclaimerData?.emptyBoxCollectionDate || "");
  const [customerSig, setCustomerSig] = useState(activeDisclaimerData?.customerSignature || "");
  const [crewLeaderName, setCrewLeaderName] = useState(activeDisclaimerData?.crewLeaderNameDetails || "Ahmed Al-Mansoori (Crew Leader)");
  const [crewLeaderSig, setCrewLeaderSig] = useState(activeDisclaimerData?.crewLeaderSignature || "");

  // Damage reporting state
  const [dmgItemName, setDmgItemName] = useState("");
  const [dmgDesc, setDmgDesc] = useState("");
  const [dmgLoc, setDmgLoc] = useState("");
  const [dmgSeverity, setDmgSeverity] = useState<"MINOR" | "MODERATE" | "SEVERE">("MINOR");

  // Missing item reporting state
  const [msgItemName, setMsgItemName] = useState("");
  const [msgExpected, setMsgExpected] = useState(50);
  const [msgReturned, setMsgReturned] = useState(49);
  const [msgNotes, setMsgNotes] = useState("");

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChecklistToggle = (sl: number, answer: "YES" | "NO") => {
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.sl === sl) {
          return {
            ...item,
            yes: answer === "YES",
            no: answer === "NO",
          };
        }
        return item;
      })
    );
  };

  const handleAddDamage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disclaimer || !dmgItemName.trim()) return;
    try {
      const res = await services.walkthroughDisclaimerService.recordDamage({
        disclaimerId: disclaimer.id,
        itemName: dmgItemName,
        description: dmgDesc,
        location: dmgLoc,
        severity: dmgSeverity,
        reportedBy: currentRole,
      });

      setDisclaimer(res.disclaimer);
      setDmgItemName("");
      setDmgDesc("");
      setDmgLoc("");
      setMessage({ type: "success", text: "Damage report recorded and evidence preserved for Admin review." });
    } catch (err: unknown) {
      setMessage({ type: "error", text: (err as Error).message });
    }
  };

  const handleAddMissingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disclaimer || !msgItemName.trim()) return;
    try {
      const res = await services.walkthroughDisclaimerService.recordMissingItem({
        disclaimerId: disclaimer.id,
        itemName: msgItemName,
        expectedQty: Number(msgExpected),
        returnedQty: Number(msgReturned),
        notes: msgNotes,
      });

      setDisclaimer(res.disclaimer);
      setMsgItemName("");
      setMessage({ type: "success", text: `Missing item discrepancy logged (${res.missing.discrepancyCount} missing). Flagged for Admin review.` });
    } catch (err: unknown) {
      setMessage({ type: "error", text: (err as Error).message });
    }
  };

  const handleSaveChecklist = async () => {
    if (!disclaimer) return;
    setLoading(true);
    try {
      const updated = await services.walkthroughDisclaimerService.updateChecklist(disclaimer.id, checklist, currentRole);
      setDisclaimer(updated);
      setMessage({ type: "success", text: "Walkthrough checklist saved successfully." });
      if (onSaved) onSaved(updated);
    } catch (err: unknown) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleSignaturesAndComplete = async () => {
    if (!disclaimer) return;
    setLoading(true);
    try {
      const signed = await services.walkthroughDisclaimerService.signDisclaimer({
        disclaimerId: disclaimer.id,
        customerSignature: customerSig || "DATA:IMAGE/PNG;BASE64,CUSTOMER_SIG_OK",
        customerNameDetails: customerName,
        crewLeaderSignature: crewLeaderSig || "DATA:IMAGE/PNG;BASE64,CREW_LEADER_SIG_OK",
        crewLeaderNameDetails: crewLeaderName,
        signedByRole: "BOTH",
      });

      const completed = await services.walkthroughDisclaimerService.completeDisclaimer(signed.id, currentRole);
      setDisclaimer(completed);
      setMessage({ type: "success", text: `Walkthrough Disclaimer signed and completed! Final Status: ${completed.status}.` });
      if (onSaved) onSaved(completed);
    } catch (err: unknown) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-moveit-card border border-moveit-border p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-bold">
            <FileCheck2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-moveit-text flex items-center gap-2">
              Walk Through & Damage Disclaimer Form
              <span className="font-mono text-xs text-orange-600 dark:text-orange-400">({disclaimer?.disclaimerNumber || "WT-5001"})</span>
            </h2>
            <p className="text-xs text-moveit-muted">
              Official MoveIt storage redelivery & local move completion sign-off master template.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className={`px-3 py-1 rounded-full font-bold ${
            disclaimer?.status === "COMPLETED"
              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
              : disclaimer?.status === "FLAGGED_WITH_ISSUES"
              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
              : "bg-moveit-orange/20 text-moveit-orange border border-moveit-orange/30"
          }`}>
            Status: {disclaimer?.status || "DRAFT"}
          </span>

          <button
            onClick={() => setActiveTab("PRINT")}
            className="px-3.5 py-1.5 bg-moveit-surface-raised hover:bg-moveit-surface-raised text-moveit-text border border-moveit-border rounded-lg font-semibold flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            PDF View
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between ${
          message.type === "success" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-moveit-muted hover:text-moveit-text">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-moveit-border text-xs font-semibold">
        <button
          onClick={() => setActiveTab("FORM")}
          className={`px-4 py-2.5 transition border-b-2 font-bold ${
            activeTab === "FORM" ? "border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-500/5" : "border-transparent text-moveit-muted hover:text-moveit-text"
          }`}
        >
          Official Digital Form & Checklist
        </button>
        <button
          onClick={() => setActiveTab("DAMAGE")}
          className={`px-4 py-2.5 transition border-b-2 font-bold ${
            activeTab === "DAMAGE" ? "border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-500/5" : "border-transparent text-moveit-muted hover:text-moveit-text"
          }`}
        >
          Damage Records ({disclaimer?.damageRecords.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("MISSING")}
          className={`px-4 py-2.5 transition border-b-2 font-bold ${
            activeTab === "MISSING" ? "border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-500/5" : "border-transparent text-moveit-muted hover:text-moveit-text"
          }`}
        >
          Missing Item Discrepancies ({disclaimer?.missingItemRecords.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("PRINT")}
          className={`px-4 py-2.5 transition border-b-2 font-bold ${
            activeTab === "PRINT" ? "border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-500/5" : "border-transparent text-moveit-muted hover:text-moveit-text"
          }`}
        >
          PDF Master Document Layout
        </button>
      </div>

      {/* TAB 1: FORM & CHECKLIST */}
      {activeTab === "FORM" && (
        <div className="bg-moveit-card border border-moveit-border p-6 rounded-xl space-y-6 text-xs text-moveit-text">
          {/* Header Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-moveit-surface p-4 rounded-lg border border-moveit-border">
            <div>
              <label className="block text-moveit-muted font-bold mb-1">Dear Mr./Ms.:</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-moveit-card border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-semibold"
              />
            </div>
            <div>
              <label className="block text-moveit-muted font-bold mb-1">Date:</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-moveit-card border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-mono"
              />
            </div>
          </div>

          {/* Master Disclaimer Text Box */}
          <div className="bg-moveit-surface border border-moveit-border p-4 rounded-lg space-y-2 text-[11px] text-moveit-text leading-relaxed">
            <h4 className="font-bold text-orange-600 dark:text-orange-400 uppercase text-xs">Official Delivery & Walk Through Notice</h4>
            <p>
              Please be informed that on completion of the delivery and or unpacking of the items and storage items the CREW LEADER or the SUPERVISOR will walk through the property with you and check for any damage that has been caused at the time of the delivery and unpacking.
            </p>
            <p>
              Should any damage be found (at the time of unpacking) it must be noted on this form, if no damage or lost noted in this form and reported at a later date, MOVEIT CARGO PACKAGING AND MOVERS LLC, will accept no liability for the same.
            </p>
            <p>
              Kindly check each page of Packing List attached to the invoice and Crew Sheet Form, provided by MOVEIT. Please also check the items for the completion of the delivery. Please do check that all items have been removed from the property (origin of removals) or removed from our STORAGE/VEHICLE/TRUCK/CONTAINER (applicable for packing also).
            </p>
            <p className="font-semibold text-moveit-text">
              In the unlikely event of any damage during local or storage re-delivery, please notify us within 24 hours for prompt resolution. We regret that we cannot be held responsible for damages reported after this timeframe.
            </p>
          </div>

          {/* Checklist Particulars Table */}
          <div className="space-y-2">
            <h4 className="font-bold text-moveit-text uppercase text-xs">Please tick the boxes:</h4>
            <div className="border border-moveit-border rounded-lg overflow-hidden bg-moveit-surface">
              <table className="w-full text-left">
                <thead className="bg-moveit-card text-moveit-text font-bold border-b border-moveit-border">
                  <tr>
                    <th className="p-2.5 text-center w-12">SL</th>
                    <th className="p-2.5">PARTICULARS</th>
                    <th className="p-2.5 text-center w-16">YES</th>
                    <th className="p-2.5 text-center w-16">NO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-moveit-border-soft">
                  {checklist.map((item) => (
                    <tr key={item.sl} className="hover:bg-moveit-card/40">
                      <td className="p-2.5 text-center font-bold text-moveit-muted font-mono">{item.sl}</td>
                      <td className="p-2.5 font-medium text-moveit-text">{item.particulars}</td>
                      <td className="p-2.5 text-center">
                        <input
                          type="radio"
                          name={`item-${item.sl}`}
                          checked={item.yes}
                          onChange={() => handleChecklistToggle(item.sl, "YES")}
                          className="rounded-full border-moveit-border bg-moveit-card text-orange-500"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="radio"
                          name={`item-${item.sl}`}
                          checked={item.no}
                          onChange={() => handleChecklistToggle(item.sl, "NO")}
                          className="rounded-full border-moveit-border bg-moveit-card text-orange-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Empty Box Collection Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-moveit-surface p-4 rounded-lg border border-moveit-border">
            <div>
              <label className="block text-moveit-muted font-bold mb-1">Number of boxes to be collected:</label>
              <input
                type="number"
                min="0"
                value={boxesToBeCollected}
                onChange={(e) => setBoxesToBeCollected(parseInt(e.target.value) || 0)}
                className="w-full bg-moveit-card border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-moveit-muted font-bold mb-1">Please collect empty boxes on Date:</label>
              <input
                type="date"
                value={emptyBoxCollectionDate}
                onChange={(e) => setEmptyBoxCollectionDate(e.target.value)}
                className="w-full bg-moveit-card border border-moveit-border rounded px-3 py-1.5 text-moveit-text font-mono"
              />
            </div>
          </div>

          {/* Signatures Box Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-moveit-border">
            {/* Customer Details Box */}
            <div className="bg-moveit-surface border border-moveit-border p-4 rounded-lg space-y-3">
              <h5 className="font-bold text-orange-600 dark:text-orange-400 uppercase text-xs border-b border-moveit-border pb-2">CUSTOMER DETAILS</h5>
              <div>
                <label className="block text-moveit-muted mb-1">NAME:</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-moveit-card border border-moveit-border rounded px-2.5 py-1 text-moveit-text font-semibold"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">SIGNATURE:</label>
                <div className="bg-moveit-card border border-moveit-border p-3 rounded text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  {customerSig ? "✓ Customer Signature Recorded" : "[Click Complete Sign-Off]"}
                </div>
              </div>
            </div>

            {/* Crew Leader Details Box */}
            <div className="bg-moveit-surface border border-moveit-border p-4 rounded-lg space-y-3">
              <h5 className="font-bold text-orange-600 dark:text-orange-400 uppercase text-xs border-b border-moveit-border pb-2">CREW LEADER DETAILS</h5>
              <div>
                <label className="block text-moveit-muted mb-1">NAME:</label>
                <input
                  type="text"
                  value={crewLeaderName}
                  onChange={(e) => setCrewLeaderName(e.target.value)}
                  className="w-full bg-moveit-card border border-moveit-border rounded px-2.5 py-1 text-moveit-text font-semibold"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">SIGNATURE:</label>
                <div className="bg-moveit-card border border-moveit-border p-3 rounded text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  {crewLeaderSig ? "✓ Crew Leader Signature Recorded" : "[Click Complete Sign-Off]"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-moveit-border">
            {(can("WALKTHROUGH", "EDIT") || can("WALKTHROUGH", "SUBMIT")) && (
<button
              onClick={handleSaveChecklist}
              disabled={loading}
              className="px-4 py-2 bg-moveit-surface-raised text-moveit-text rounded-lg hover:bg-moveit-surface-raised font-semibold"
            >
              Save Checklist Draft
            </button>
)}
            {can("WALKTHROUGH", "SIGN") && (
<button
              onClick={handleSignaturesAndComplete}
              disabled={loading}
              className="px-5 py-2 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-lg shadow-lg flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Sign & Complete Walk Through Job
            </button>
)}
          </div>
        </div>
      )}

      {/* TAB 2: DAMAGE RECORDS */}
      {activeTab === "DAMAGE" && (
        <div className="space-y-6 text-xs">
          <form onSubmit={handleAddDamage} className="bg-moveit-card border border-moveit-border p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase flex items-center gap-2 border-b border-moveit-border pb-2">
              <ShieldAlert className="h-4 w-4" /> Record Damage Incident (Preserve Evidence)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-moveit-muted mb-1">Item Name:</label>
                <input
                  type="text"
                  required
                  value={dmgItemName}
                  onChange={(e) => setDmgItemName(e.target.value)}
                  placeholder="e.g. Glass Dining Table Top"
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Location on Site:</label>
                <input
                  type="text"
                  value={dmgLoc}
                  onChange={(e) => setDmgLoc(e.target.value)}
                  placeholder="e.g. Living Room Redelivery"
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Severity:</label>
                <select
                  value={dmgSeverity}
                  onChange={(e) => setDmgSeverity(e.target.value as "MINOR" | "MODERATE" | "SEVERE")}
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
                >
                  <option value="MINOR">Minor Scratch</option>
                  <option value="MODERATE">Moderate Handling Scratch</option>
                  <option value="SEVERE">Severe Breakage</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-moveit-muted mb-1">Damage Description & Remarks:</label>
              <input
                type="text"
                required
                value={dmgDesc}
                onChange={(e) => setDmgDesc(e.target.value)}
                placeholder="e.g. Hairline crack along corner found during unpacking"
                className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded shadow-lg"
              >
                Log Damage & Flag for Admin Review
              </button>
            </div>
          </form>

          <div className="border border-moveit-border rounded-xl overflow-hidden bg-moveit-surface">
            <table className="w-full text-left text-moveit-text">
              <thead className="bg-moveit-card text-moveit-text font-bold border-b border-moveit-border">
                <tr>
                  <th className="p-3">Item</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-moveit-border-soft">
                {disclaimer?.damageRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-moveit-muted">No damage recorded. All items intact.</td>
                  </tr>
                ) : (
                  disclaimer?.damageRecords.map((d) => (
                    <tr key={d.id} className="hover:bg-moveit-card/50">
                      <td className="p-3 font-semibold text-moveit-text">{d.itemName}</td>
                      <td className="p-3 text-moveit-muted">{d.location}</td>
                      <td className="p-3 font-bold text-amber-600 dark:text-amber-400">{d.severity}</td>
                      <td className="p-3 text-moveit-text">{d.description}</td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MISSING ITEM DISCREPANCIES */}
      {activeTab === "MISSING" && (
        <div className="space-y-6 text-xs">
          <form onSubmit={handleAddMissingItem} className="bg-moveit-card border border-moveit-border p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase flex items-center gap-2 border-b border-moveit-border pb-2">
              <Boxes className="h-4 w-4" /> Record Missing Item Discrepancy
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-moveit-muted mb-1">Item Name (from Packing List):</label>
                <input
                  type="text"
                  required
                  value={msgItemName}
                  onChange={(e) => setMsgItemName(e.target.value)}
                  placeholder="e.g. 3 Seater Sofa Cushion"
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Expected Quantity (Packing List):</label>
                <input
                  type="number"
                  min="1"
                  value={msgExpected}
                  onChange={(e) => setMsgExpected(parseInt(e.target.value) || 0)}
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text font-bold"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">Returned / Unpacked Quantity:</label>
                <input
                  type="number"
                  min="0"
                  value={msgReturned}
                  onChange={(e) => setMsgReturned(parseInt(e.target.value) || 0)}
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-moveit-muted mb-1">Discrepancy Notes:</label>
              <input
                type="text"
                value={msgNotes}
                onChange={(e) => setMsgNotes(e.target.value)}
                placeholder="e.g. Customer noticed 1 cushion missing upon redelivery"
                className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded shadow-lg"
              >
                Log Discrepancy & Flag for Admin
              </button>
            </div>
          </form>

          <div className="border border-moveit-border rounded-xl overflow-hidden bg-moveit-surface">
            <table className="w-full text-left text-moveit-text">
              <thead className="bg-moveit-card text-moveit-text font-bold border-b border-moveit-border">
                <tr>
                  <th className="p-3">Item Name</th>
                  <th className="p-3 text-center">Expected Qty</th>
                  <th className="p-3 text-center">Returned Qty</th>
                  <th className="p-3 text-center">Discrepancy (Missing)</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-moveit-border-soft font-mono">
                {disclaimer?.missingItemRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-moveit-muted font-sans">No missing items reported. All packing list items accounted for.</td>
                  </tr>
                ) : (
                  disclaimer?.missingItemRecords.map((m) => (
                    <tr key={m.id} className="hover:bg-moveit-card/50">
                      <td className="p-3 font-sans font-semibold text-moveit-text">{m.itemName}</td>
                      <td className="p-3 text-center text-moveit-muted">{m.expectedQty}</td>
                      <td className="p-3 text-center text-emerald-600 dark:text-emerald-400">{m.returnedQty}</td>
                      <td className="p-3 text-center font-bold text-red-600 dark:text-red-400 bg-red-500/10">{m.discrepancyCount}</td>
                      <td className="p-3 font-sans text-moveit-muted">{m.notes || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PDF VIEW */}
      {activeTab === "PRINT" && (
        <div className="bg-moveit-card text-moveit-text p-8 rounded-xl space-y-6 shadow-2xl max-w-4xl mx-auto font-sans border border-moveit-border">
          {/* Official Letterhead */}
          <div className="flex items-start justify-between border-b-2 border-moveit-border-soft pb-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-moveit-text">Move<span className="text-orange-600">It</span></h1>
              <p className="text-[10px] font-bold tracking-widest text-moveit-muted uppercase">Moving | Shipping | Storage</p>
            </div>
            <div className="text-right text-[10px] text-moveit-text leading-snug font-medium">
              <p className="font-bold text-moveit-text text-xs">MOVE IT Cargo Packaging and Movers LLC</p>
              <p>Warehouse 26, Street 19, Al Quoz Industrial 1 Dubai - UAE</p>
              <p>Toll Free : 800 Moveit (668348), Mob.: 055 - 949 4638</p>
              <p>Email: inquiry@themoveit.com, Website: www.themoveit.com</p>
            </div>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-base font-black uppercase text-moveit-text tracking-wide">
              WALK THROUGH AND DAMAGE DISCLAIMER FOR LOCAL AND STORAGE REDELIVERY
            </h2>
          </div>

          <div className="flex justify-between border-b border-moveit-border pb-2 text-xs font-semibold">
            <span>Dear Mr./Ms. <u className="font-bold">{customerName || "Al Habtoor Group"}</u></span>
            <span>Date: <u className="font-bold">{date}</u></span>
          </div>

          <div className="bg-moveit-surface p-3 rounded text-[10px] text-moveit-text space-y-1.5 leading-relaxed font-medium">
            <p>Please be informed that on completion of the delivery and or unpacking of the items and storage items the CREW LEADER or the SUPERVISOR will walk through the property with you and check for any damage that has been caused at the time of the delivery and unpacking.</p>
            <p>Should any damage be found (at the time of unpacking) it must be noted on this form, if no damage or lost noted in this form and reported at a later date, MOVEIT CARGO PACKAGING AND MOVERS LLC, will accept no liability for the same.</p>
            <p>kindly check each page of Packing List attached to the invoice and Crew Sheet Form, provided by MOVEIT. Please also check the items for the completion of the delivery. Please do check that all items have been removed from the property (origin of removals) or removed from our STORAGE/VEHICLE/TRUCK/CONTAINER (applicable for packing also).</p>
            <p>In the unlikely event of any damage during local or storage re-delivery, please notify us within 24 hours for prompt resolution. We regret that we cannot be held responsible for damages reported after this timeframe.</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase text-moveit-text">Please tick the boxes:</p>
            <table className="w-full text-[11px] border border-moveit-border-soft border-collapse">
              <thead>
                <tr className="bg-moveit-surface-raised border-b border-moveit-border-soft font-bold">
                  <th className="border-r border-moveit-border-soft p-1.5 text-center w-10">SL</th>
                  <th className="border-r border-moveit-border-soft p-1.5 text-left">PARTICULARS</th>
                  <th className="border-r border-moveit-border-soft p-1.5 text-center w-12">YES</th>
                  <th className="p-1.5 text-center w-12">NO</th>
                </tr>
              </thead>
              <tbody>
                {checklist.map((c) => (
                  <tr key={c.sl} className="border-b border-moveit-border-soft">
                    <td className="border-r border-moveit-border-soft p-1.5 text-center font-bold">{c.sl}</td>
                    <td className="border-r border-moveit-border-soft p-1.5 font-medium">{c.particulars}</td>
                    <td className="border-r border-moveit-border-soft p-1.5 text-center font-bold">{c.yes ? "✓" : ""}</td>
                    <td className="p-1.5 text-center font-bold">{c.no ? "✓" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs font-semibold space-y-1 pt-2">
            <p>Number of boxes to be collected: <u className="font-bold">{boxesToBeCollected}</u></p>
            <p>Please collect the empty boxes on this Date: <u className="font-bold">{emptyBoxCollectionDate || "Pending Schedule"}</u></p>
          </div>

          {/* Customer & Crew Leader Details Box */}
          <div className="grid grid-cols-2 gap-4 pt-4 text-xs font-semibold">
            <div className="border border-moveit-border-soft p-3 space-y-4 min-h-[100px]">
              <p className="font-bold text-center border-b border-moveit-border-soft pb-1">CUSTOMER DETAILS</p>
              <p>NAME: <strong>{customerName}</strong></p>
              <p>SIGNATURE: <span className="font-mono text-emerald-700">{customerSig ? "✓ SIGNED" : ""}</span></p>
            </div>
            <div className="border border-moveit-border-soft p-3 space-y-4 min-h-[100px]">
              <p className="font-bold text-center border-b border-moveit-border-soft pb-1">CREW LEADER DETAILS</p>
              <p>NAME: <strong>{crewLeaderName}</strong></p>
              <p>SIGNATURE: <span className="font-mono text-emerald-700">{crewLeaderSig ? "✓ SIGNED" : ""}</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
