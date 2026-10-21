"use client";

import { useCan } from "@/lib/use-can";
import React, { useEffect, useState } from "react";
import { services } from "@/services";
import { CrewSheet, Employee } from "@/types/crew-sheet";
import { useUIStore } from "@/store/use-ui-store";
import { CrewSheetForm } from "@/components/crew-sheet/crew-sheet-form";
import { 
  FileCheck, 
  Search, 
  Users, 
  UserCheck, 
  FileText,
  UserPlus,
  CheckCircle2,
  Briefcase,
  X
} from "lucide-react";

export default function CrewSheetsPage() {
  const can = useCan();
  const currentRole = useUIStore((state) => state.currentRole);

  const [crewSheets, setCrewSheets] = useState<CrewSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<CrewSheet | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Manpower & Assignment State
  const [showManpowerModal, setShowManpowerModal] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpRole, setNewEmpRole] = useState<"TEAM_LEADER" | "PACKER" | "HELPER" | "DRIVER">("PACKER");

  // Fast Creation / Auto-population state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableAllocations, setAvailableAllocations] = useState<Array<{ id: string; customerName: string; spaceCode: string }>>([]);
  const [selectedAllocationId, setSelectedAllocationId] = useState<string>("");
  const [selectedTlId, setSelectedTlId] = useState<string>("");
  const [selectedPackerIds, setSelectedPackerIds] = useState<string[]>([]);
  const [selectedHelperIds, setSelectedHelperIds] = useState<string[]>([]);

  const loadCrewSheets = async () => {
    try {
      const sheets = await services.crewSheetService.getCrewSheets();
      setCrewSheets(sheets);
    } catch (err) {
      console.error("Failed to load crew sheets:", err);
    }
  };

  const loadManpower = async () => {
    try {
      const emps = await services.crewSheetService.getEmployees();
      setEmployees(emps);
    } catch (err) {
      console.error("Failed to load manpower:", err);
    }
  };

  const loadAllocations = async () => {
    try {
      const list = await services.allocationService.getAllocations().catch(() => []);
      const mapped = list.map(a => ({
        id: a.id,
        customerName: a.customerName || `Customer ${a.customerId}`,
        spaceCode: a.locationPath || a.locationId || "SPACE-01"
      }));
      setAvailableAllocations(mapped);
    } catch (err) {
      console.error("Failed to load allocations:", err);
    }
  };

  useEffect(() => {
    let mounted = true;
    services.crewSheetService.getCrewSheets().then(sheets => {
      if (mounted) setCrewSheets(sheets);
    });
    services.crewSheetService.getEmployees().then(emps => {
      if (mounted) setEmployees(emps);
    });
    services.allocationService.getAllocations().catch(() => []).then(allocs => {
      if (mounted) {
        setAvailableAllocations(allocs.map(a => ({
          id: a.id,
          customerName: a.customerName || `Customer ${a.customerId}`,
          spaceCode: a.locationPath || a.locationId || "SPACE-01"
        })));
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;
    try {
      await services.crewSheetService.createEmployee({
        name: newEmpName.trim(),
        role: newEmpRole,
        isAvailable: true,
      });
      setNewEmpName("");
      await loadManpower();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleCreateAutoSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTlId) {
      alert("Please select a Team Leader.");
      return;
    }

    try {
      const newSheet = await services.crewSheetService.createCrewSheet({
        allocationId: selectedAllocationId || undefined,
        teamLeaderId: selectedTlId,
        packerIds: selectedPackerIds,
        helperIds: selectedHelperIds,
      }, "SUPER_ADMIN", "Operations User");

      setShowAssignModal(false);
      setSelectedSheet(newSheet);
      setIsCreatingNew(false);
      await loadCrewSheets();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const togglePacker = (id: string) => {
    if (selectedPackerIds.includes(id)) {
      setSelectedPackerIds(selectedPackerIds.filter(i => i !== id));
    } else {
      setSelectedPackerIds([...selectedPackerIds, id]);
    }
  };

  const toggleHelper = (id: string) => {
    if (selectedHelperIds.includes(id)) {
      setSelectedHelperIds(selectedHelperIds.filter(i => i !== id));
    } else {
      setSelectedHelperIds([...selectedHelperIds, id]);
    }
  };

  const filteredSheets = crewSheets.filter((cs) => {
    const sNo = cs.serialNumber || cs.crewSheetNumber || "";
    const pks = cs.packers || cs.packerNames?.join(", ") || "";
    const matchesSearch = 
      sNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cs.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cs.teamLeaderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pks.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || cs.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const teamLeaders = employees.filter(e => e.role === "TEAM_LEADER" && e.isAvailable);
  const packers = employees.filter(e => e.role === "PACKER" && e.isAvailable);
  const helpers = employees.filter(e => e.role === "HELPER" && e.isAvailable);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-moveit-text tracking-tight flex items-center gap-2">
            <FileCheck className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            MoveIt Crew Sheets & Manpower Assignment
          </h1>
          <p className="text-xs text-moveit-muted mt-1">
            Official digital MoveIt Crew Sheet (S.No. 4001 master template), Team Leader assignment, Performance Report & Material Out/In tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadManpower();
              setShowManpowerModal(true);
            }}
            className="px-3.5 py-2 bg-moveit-surface-raised hover:bg-moveit-surface-raised text-moveit-text border border-moveit-border rounded-lg text-xs font-semibold flex items-center gap-2 transition"
          >
            <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Manpower Registry ({employees.length})
          </button>

          {can("CREW_SHEET", "ASSIGN") && (
<button
            onClick={() => {
              loadAllocations();
              loadManpower();
              setShowAssignModal(true);
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg flex items-center gap-2 transition"
          >
            <UserCheck className="h-4 w-4" />
            Assign Crew & Auto-Populate
          </button>
)}
        </div>
      </div>

      {/* Main Content Area */}
      {isCreatingNew || selectedSheet ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedSheet(null);
                setIsCreatingNew(false);
                loadCrewSheets();
              }}
              className="text-xs text-moveit-muted hover:text-moveit-text flex items-center gap-1 font-semibold"
            >
              ← Back to Crew Sheets
            </button>

            <div className="flex items-center gap-2 bg-moveit-card border border-moveit-border px-3 py-1 rounded-lg text-xs">
              <span className="text-moveit-muted font-medium">Viewing Role:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{currentRole}</span>
            </div>
          </div>

          <CrewSheetForm 
            initialData={selectedSheet} 
            onSaved={() => {
              loadCrewSheets();
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
                placeholder="Search by client, S.No, Team Leader, or packers..."
                className="w-full bg-moveit-surface border border-moveit-border rounded-lg pl-9 pr-4 py-1.5 text-xs text-moveit-text focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-moveit-muted font-medium mr-1">Status:</span>
              {["ALL", "DRAFT", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "SUBMITTED", "COMPLETED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition text-[11px] ${
                    statusFilter === st
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "bg-moveit-surface-raised text-moveit-muted hover:bg-moveit-surface-raised"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Crew Sheets Grid */}
          {filteredSheets.length === 0 ? (
            <div className="p-12 text-center border border-moveit-border rounded-xl bg-moveit-surface text-moveit-muted space-y-3">
              <FileText className="h-10 w-10 text-moveit-muted mx-auto" />
              <p className="text-sm">No crew sheets found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSheets.map((cs) => (
                <div
                  key={cs.id}
                  onClick={() => setSelectedSheet(cs)}
                  className="bg-moveit-surface border border-moveit-border hover:border-amber-500/50 p-5 rounded-xl space-y-3 cursor-pointer transition shadow-lg group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-moveit-text group-hover:text-amber-400 transition font-mono">
                      {cs.serialNumber}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      cs.status === "COMPLETED"
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : cs.status === "SUBMITTED"
                        ? "bg-moveit-orange/20 text-moveit-orange border border-moveit-orange/30"
                        : cs.status === "IN_PROGRESS" || cs.status === "ACCEPTED"
                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        : "bg-moveit-surface-raised text-moveit-text border border-moveit-border"
                    }`}>
                      {cs.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-semibold text-moveit-text text-sm">
                      {cs.clientName || "Unnamed Client"}
                    </h4>
                    <p className="text-[11px] text-moveit-muted flex items-center gap-1 mt-0.5">
                      <UserCheck className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      TL: <span className="text-moveit-text font-medium">{cs.teamLeaderName || "Unassigned"}</span>
                    </p>
                    <p className="text-[11px] text-moveit-muted flex items-center gap-1 mt-0.5 truncate">
                      <Users className="h-3 w-3 text-moveit-muted" />
                      Packers: {cs.packers || "None"}
                    </p>
                  </div>

                  <div className="border-t border-moveit-border-soft pt-2 flex items-center justify-between text-[11px]">
                    <span className="text-moveit-muted flex items-center gap-1">
                      <Briefcase className="h-3 w-3 text-moveit-muted" />
                      {cs.propertyType}
                    </span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{cs.totalCbm} CBM</span>
                  </div>

                  {(cs.customerSignature || cs.teamLeaderSignature) && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-1.5 rounded text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Signed: {[cs.customerSignature ? "Customer" : null, cs.teamLeaderSignature ? "Team Leader" : null].filter(Boolean).join(" & ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manpower Registry Modal */}
      {showManpowerModal && (
        <div className="fixed inset-0 z-50 bg-moveit-surface/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-moveit-card border border-moveit-border rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-moveit-border pb-3">
              <h3 className="text-base font-bold text-moveit-text flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                MoveIt Manpower Registry & Employee Roles
              </h3>
              <button
                onClick={() => setShowManpowerModal(false)}
                className="text-moveit-muted hover:text-moveit-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Add Employee Form */}
            <form onSubmit={handleAddEmployee} className="bg-moveit-surface border border-moveit-border p-4 rounded-lg space-y-3">
              <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1">
                <UserPlus className="h-4 w-4" /> Add New Staff Member
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-moveit-muted mb-1">Full Name:</label>
                  <input
                    type="text"
                    required
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-moveit-card border border-moveit-border rounded px-2.5 py-1 text-moveit-text"
                  />
                </div>
                <div>
                  <label className="block text-moveit-muted mb-1">Assigned Role:</label>
                  <select
                    value={newEmpRole}
                    onChange={(e) => setNewEmpRole(e.target.value as "TEAM_LEADER" | "PACKER" | "HELPER" | "DRIVER")}
                    className="w-full bg-moveit-card border border-moveit-border rounded px-2.5 py-1 text-moveit-text"
                  >
                    <option value="TEAM_LEADER">Team Leader</option>
                    <option value="PACKER">Packer</option>
                    <option value="HELPER">Helper</option>
                    <option value="DRIVER">Driver</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-3 py-1 bg-amber-500 text-slate-950 font-bold text-xs rounded hover:bg-amber-400"
                >
                  Save Employee
                </button>
              </div>
            </form>

            {/* Staff List */}
            <div className="border border-moveit-border rounded-lg overflow-hidden max-h-60 overflow-y-auto text-xs">
              <table className="w-full text-left text-moveit-text">
                <thead className="bg-moveit-surface-raised text-moveit-text font-bold">
                  <tr>
                    <th className="p-2">Employee Name</th>
                    <th className="p-2">Role</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-moveit-border-soft">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-moveit-surface-raised/40">
                      <td className="p-2 font-medium text-moveit-text">{emp.name}</td>
                      <td className="p-2 text-amber-600 dark:text-amber-400 font-semibold">{emp.role.replace("_", " ")}</td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          emp.isAvailable ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-red-500/20 text-red-600 dark:text-red-400"
                        }`}>
                          {emp.isAvailable ? "AVAILABLE" : "UNAVAILABLE"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Assign Crew & Auto-Populate Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-moveit-surface/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateAutoSheet} className="bg-moveit-card border border-moveit-border rounded-xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-moveit-border pb-3">
              <h3 className="text-base font-bold text-moveit-text flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Assign Manpower & Auto-Populate Crew Sheet
              </h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="text-moveit-muted hover:text-moveit-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-moveit-text mb-1">Select Storage Allocation / Customer:</label>
                <select
                  value={selectedAllocationId}
                  onChange={(e) => setSelectedAllocationId(e.target.value)}
                  className="w-full bg-moveit-surface border border-moveit-border rounded-lg p-2 text-moveit-text"
                >
                  <option value="">-- Standalone Crew Sheet (Manual Header) --</option>
                  {availableAllocations.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.customerName} ({a.spaceCode}) - [ID: {a.id}]
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-moveit-muted mt-1">
                  Selecting an allocation will auto-populate Client Name, Contact, Address, CBM & Job Instructions.
                </p>
              </div>

              <div>
                <label className="block font-bold text-amber-600 dark:text-amber-400 mb-1">Team Leader (Required):</label>
                <select
                  required
                  value={selectedTlId}
                  onChange={(e) => setSelectedTlId(e.target.value)}
                  className="w-full bg-moveit-surface border border-amber-500/50 rounded-lg p-2 text-moveit-text font-medium"
                >
                  <option value="">-- Select Available Team Leader --</option>
                  {teamLeaders.map(tl => (
                    <option key={tl.id} value={tl.id}>{tl.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-moveit-text mb-1">Packers:</label>
                <div className="bg-moveit-surface border border-moveit-border p-2.5 rounded-lg max-h-32 overflow-y-auto space-y-1.5">
                  {packers.map(p => (
                    <label key={p.id} className="flex items-center gap-2 text-moveit-text cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPackerIds.includes(p.id)}
                        onChange={() => togglePacker(p.id)}
                        className="rounded border-moveit-border bg-moveit-card text-amber-500"
                      />
                      <span>{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-moveit-text mb-1">Helpers:</label>
                <div className="bg-moveit-surface border border-moveit-border p-2.5 rounded-lg max-h-32 overflow-y-auto space-y-1.5">
                  {helpers.map(h => (
                    <label key={h.id} className="flex items-center gap-2 text-moveit-text cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedHelperIds.includes(h.id)}
                        onChange={() => toggleHelper(h.id)}
                        className="rounded border-moveit-border bg-moveit-card text-amber-500"
                      />
                      <span>{h.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-moveit-border pt-3">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-moveit-surface-raised text-moveit-text rounded-lg hover:bg-moveit-surface-raised text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400 shadow-lg"
              >
                Create & Auto-Populate Crew Sheet
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
