"use client";

import { useCan } from "@/lib/use-can";
import React, { useEffect, useState } from "react";
import { services } from "@/services";
import { 
  Employee, 
  EmployeeDocument, 
  EmployeeExpiryAlert, 
  DocumentType,
  EmployeeRole
} from "@/types/employee";
import { useUIStore } from "@/store/use-ui-store";
import { 
  Users, 
  Plus, 
  Search, 
  AlertTriangle, 
  FileText, 
  ShieldCheck, 
  ShieldAlert, 
  Briefcase, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  Upload, 
  Lock, 
  X,
  FileBadge
} from "lucide-react";

export default function EmployeesPage() {
  const can = useCan();
  const currentRole = useUIStore((state) => state.currentRole);
  const isAuthorizedHR = currentRole === "SUPER_ADMIN" || currentRole === "STORAGE_MANAGER" || currentRole === "HR_ADMIN";

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [expiryAlerts, setExpiryAlerts] = useState<EmployeeExpiryAlert[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"PROFILE" | "DOCUMENTS" | "JOBS" | "ALERTS">("PROFILE");

  // Create Employee Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newPhone, setNewPhone] = useState<string>("");
  const [newEmail, setNewEmail] = useState<string>("");
  const [newRole, setNewRole] = useState<EmployeeRole>("TEAM_LEADER");
  const [newIsTL, setNewIsTL] = useState<boolean>(true);

  // Upload Document Modal State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [docType, setDocType] = useState<DocumentType>("EMIRATES_ID");
  const [docNum, setDocNum] = useState<string>("");
  const [docFileName, setDocFileName] = useState<string>("");
  const [docIssueDate, setDocIssueDate] = useState<string>("");
  const [docExpiryDate, setDocExpiryDate] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const emps = await services.employeeService.getEmployees();
      setEmployees(emps);
      const alerts = await services.employeeService.getExpiringDocumentsAlerts();
      setExpiryAlerts(alerts);

      if (emps.length > 0 && !selectedEmployee) {
        setSelectedEmployee(emps[0]);
      } else if (selectedEmployee) {
        const updated = emps.find((e) => e.id === selectedEmployee.id);
        if (updated) setSelectedEmployee(updated);
      }
    } catch (err) {
      console.error("Failed to load employee data:", err);
    }
  };

  const selectedEmployeeId = selectedEmployee?.id;

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const emps = await services.employeeService.getEmployees();
      const alerts = await services.employeeService.getExpiringDocumentsAlerts();
      if (!mounted) return;
      setEmployees(emps);
      setExpiryAlerts(alerts);
      if (emps.length > 0 && !selectedEmployeeId) {
        setSelectedEmployee(emps[0]);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [selectedEmployeeId]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await services.employeeService.createEmployee({
        name: newName,
        phone: newPhone,
        email: newEmail,
        role: newRole,
        isTeamLeaderEligible: newIsTL,
        status: "ACTIVE"
      });

      setShowCreateModal(false);
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setSelectedEmployee(created);
      await loadData();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleToggleTL = async (employeeId: string, currentEligible: boolean) => {
    try {
      const updated = await services.employeeService.toggleTeamLeaderEligibility(
        employeeId,
        !currentEligible,
        currentRole,
        "HR Operations"
      );
      setSelectedEmployee(updated);
      await loadData();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setUploadError(null);

    try {
      await services.employeeService.uploadDocument({
        employeeId: selectedEmployee.id,
        documentType: docType,
        documentNumber: docNum,
        fileName: docFileName || `${docType.toLowerCase()}_${selectedEmployee.id}.pdf`,
        issueDate: docIssueDate || undefined,
        expiryDate: docExpiryDate || undefined
      }, currentRole, "HR Manager");

      setShowUploadModal(false);
      setDocNum("");
      setDocFileName("");
      setDocIssueDate("");
      setDocExpiryDate("");
      await loadData();
    } catch (err: unknown) {
      setUploadError((err as Error).message);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Are you sure you want to remove this employee document?")) return;
    try {
      await services.employeeService.deleteDocument(docId, currentRole, "HR Manager");
      await loadData();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesRole = roleFilter === "ALL" || 
      (roleFilter === "TEAM_LEADERS" && (emp.role === "TEAM_LEADER" || emp.isTeamLeaderEligible)) ||
      (roleFilter === "PACKERS" && emp.role === "PACKER") ||
      (roleFilter === "HELPERS" && emp.role === "HELPER") ||
      (roleFilter === "DRIVERS" && emp.role === "DRIVER");

    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesRole && matchesSearch;
  });

  const totalEmployees = employees.length;
  const teamLeaderCount = employees.filter((e) => e.role === "TEAM_LEADER" || e.isTeamLeaderEligible).length;
  const activeCount = employees.filter((e) => e.status === "ACTIVE" || e.status === "ON_JOB").length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-moveit-text tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            Employee Management, Team Leader Profiles & Identity Documents
          </h1>
          <p className="text-xs text-moveit-muted mt-1">
            Manage employee master records, Emirates ID, Passport, Visa, optional NOC letters, document expiry alerts & Team Leader eligibility.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {expiryAlerts.length > 0 && (
            <button
              onClick={() => setActiveTab("ALERTS")}
              className="bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2 hover:bg-amber-500/20 transition"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              {expiryAlerts.length} Document Expiry Alert(s)
            </button>
          )}

          {can("EMPLOYEES", "CREATE") && (
<button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg flex items-center gap-2 transition"
          >
            <Plus className="h-4 w-4" />
            New Employee Profile
          </button>
)}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div className="bg-moveit-card border border-moveit-border p-4 rounded-xl space-y-1">
          <span className="text-moveit-muted font-semibold uppercase text-[10px]">Total Employee Strength</span>
          <p className="text-2xl font-black text-moveit-text font-mono">{totalEmployees}</p>
        </div>
        <div className="bg-moveit-card border border-moveit-border p-4 rounded-xl space-y-1">
          <span className="text-amber-600 dark:text-amber-400 font-semibold uppercase text-[10px]">Eligible Team Leaders</span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{teamLeaderCount}</p>
        </div>
        <div className="bg-moveit-card border border-moveit-border p-4 rounded-xl space-y-1">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold uppercase text-[10px]">Active / On Job Staff</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{activeCount}</p>
        </div>
        <div className="bg-moveit-card border border-moveit-border p-4 rounded-xl space-y-1">
          <span className="text-red-600 dark:text-red-400 font-semibold uppercase text-[10px]">Expiring Identity Docs</span>
          <p className="text-2xl font-black text-red-600 dark:text-red-400 font-mono">{expiryAlerts.length}</p>
        </div>
      </div>

      {/* Main Grid: Employee List (Left 4 cols) & Detail View (Right 8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Search & Employee List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-moveit-card border border-moveit-border p-3 rounded-xl space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-moveit-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, email..."
                className="w-full bg-moveit-surface border border-moveit-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-moveit-text focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Role Filter Tabs */}
            <div className="flex gap-1 bg-moveit-surface p-1 rounded-lg border border-moveit-border text-[10px] font-semibold flex-wrap">
              {["ALL", "TEAM_LEADERS", "PACKERS", "HELPERS", "DRIVERS"].map((rf) => (
                <button
                  key={rf}
                  onClick={() => setRoleFilter(rf)}
                  className={`px-2.5 py-1 rounded transition ${
                    roleFilter === rf
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "text-moveit-muted hover:text-moveit-text"
                  }`}
                >
                  {rf.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {filteredEmployees.map((emp) => {
              const isSelected = selectedEmployee?.id === emp.id;
              const docs = emp.documents || [];
              const hasExpiringDoc = docs.some((d) => d.status === "EXPIRING_SOON" || d.status === "EXPIRED");

              return (
                <div
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className={`p-4 rounded-xl border transition cursor-pointer space-y-2.5 ${
                    isSelected
                      ? "bg-moveit-card border-amber-500 shadow-lg"
                      : "bg-moveit-surface border-moveit-border hover:border-moveit-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-moveit-text text-xs truncate max-w-[170px]">
                      {emp.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        emp.status === "ACTIVE" || emp.status === "ON_JOB"
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-moveit-surface-raised text-moveit-muted"
                      }`}
                    >
                      {emp.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-moveit-muted">
                    <span className="px-2 py-0.5 rounded bg-moveit-surface-raised text-moveit-text text-[10px] font-semibold">
                      {emp.role.replace("_", " ")}
                    </span>
                    {emp.isTeamLeaderEligible && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                        <UserCheck className="h-3 w-3" /> TL Eligible
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-moveit-text bg-moveit-surface/60 p-2 rounded border border-moveit-border font-mono">
                    <div>
                      <span className="text-moveit-muted block">Mobile</span>
                      <span>{emp.phone || emp.mobileNumber || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-moveit-muted block">Identity Docs</span>
                      <span className="text-amber-600 dark:text-amber-400">{docs.length} File(s)</span>
                    </div>
                  </div>

                  {hasExpiringDoc && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 p-1.5 rounded">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Expiring / Expired Document Alert</span>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredEmployees.length === 0 && (
              <div className="p-8 text-center bg-moveit-surface border border-moveit-border rounded-xl text-moveit-muted text-xs">
                No employees found matching filter criteria.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Employee Profile View */}
        <div className="lg:col-span-8 space-y-4">
          {selectedEmployee ? (
            <div className="bg-moveit-card border border-moveit-border rounded-xl p-6 space-y-6">
              {/* Profile Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-moveit-border pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold text-lg">
                    {selectedEmployee.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-moveit-text flex items-center gap-2">
                      {selectedEmployee.name}
                      {selectedEmployee.isTeamLeaderEligible && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500 text-slate-950">
                          TEAM LEADER
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-moveit-muted mt-0.5 font-mono">
                      ID: {selectedEmployee.id} | Email: {selectedEmployee.email} | Mobile: {selectedEmployee.phone}
                    </p>
                  </div>
                </div>

                {/* Team Leader Eligibility Toggle */}
                <div className="flex items-center gap-2 bg-moveit-surface p-2 rounded-lg border border-moveit-border">
                  <span className="text-xs font-semibold text-moveit-text">TL Eligibility:</span>
                  {can("EMPLOYEES", "EDIT") && (
<button
                    onClick={() => handleToggleTL(selectedEmployee.id, !!selectedEmployee.isTeamLeaderEligible)}
                    className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                      selectedEmployee.isTeamLeaderEligible
                        ? "bg-amber-500 text-slate-950"
                        : "bg-moveit-surface-raised text-moveit-muted hover:text-moveit-text"
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    {selectedEmployee.isTeamLeaderEligible ? "ELIGIBLE (ACTIVE)" : "SET ELIGIBLE"}
                  </button>
)}
                </div>
              </div>

              {/* Detail Navigation Tabs */}
              <div className="flex gap-2 border-b border-moveit-border pb-2 text-xs font-bold">
                <button
                  onClick={() => setActiveTab("PROFILE")}
                  className={`px-4 py-2 rounded-lg transition ${
                    activeTab === "PROFILE"
                      ? "bg-amber-500 text-slate-950"
                      : "text-moveit-muted hover:bg-moveit-surface-raised hover:text-moveit-text"
                  }`}
                >
                  Personal Info & Role
                </button>
                <button
                  onClick={() => setActiveTab("DOCUMENTS")}
                  className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${
                    activeTab === "DOCUMENTS"
                      ? "bg-amber-500 text-slate-950"
                      : "text-moveit-muted hover:bg-moveit-surface-raised hover:text-moveit-text"
                  }`}
                >
                  Identity Documents ({(selectedEmployee.documents || []).length})
                </button>
                <button
                  onClick={() => setActiveTab("JOBS")}
                  className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${
                    activeTab === "JOBS"
                      ? "bg-amber-500 text-slate-950"
                      : "text-moveit-muted hover:bg-moveit-surface-raised hover:text-moveit-text"
                  }`}
                >
                  Job Assignments & Crew History
                </button>
                <button
                  onClick={() => setActiveTab("ALERTS")}
                  className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${
                    activeTab === "ALERTS"
                      ? "bg-amber-500 text-slate-950"
                      : "text-moveit-muted hover:bg-moveit-surface-raised hover:text-moveit-text"
                  }`}
                >
                  Expiry Alerts ({expiryAlerts.length})
                </button>
              </div>

              {/* Tab 1: Personal Info & Profile */}
              {activeTab === "PROFILE" && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-moveit-surface p-4 rounded-xl border border-moveit-border space-y-2">
                      <span className="text-moveit-muted uppercase font-bold text-[10px]">Full Name</span>
                      <p className="text-sm font-bold text-moveit-text">{selectedEmployee.name}</p>
                    </div>

                    <div className="bg-moveit-surface p-4 rounded-xl border border-moveit-border space-y-2">
                      <span className="text-moveit-muted uppercase font-bold text-[10px]">Mobile / Phone Number</span>
                      <p className="text-sm font-bold text-moveit-text font-mono">{selectedEmployee.phone}</p>
                    </div>

                    <div className="bg-moveit-surface p-4 rounded-xl border border-moveit-border space-y-2">
                      <span className="text-moveit-muted uppercase font-bold text-[10px]">Email Address</span>
                      <p className="text-sm font-bold text-moveit-text font-mono">{selectedEmployee.email}</p>
                    </div>

                    <div className="bg-moveit-surface p-4 rounded-xl border border-moveit-border space-y-2">
                      <span className="text-moveit-muted uppercase font-bold text-[10px]">Assigned Role</span>
                      <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{selectedEmployee.role.replace("_", " ")}</p>
                    </div>
                  </div>

                  <div className="bg-moveit-surface p-4 rounded-xl border border-moveit-border space-y-3">
                    <h4 className="font-bold text-moveit-text text-xs uppercase text-moveit-muted">Availability & Team Leader Eligibility Status</h4>
                    <div className="grid grid-cols-3 gap-3 font-mono">
                      <div className="p-3 bg-moveit-card rounded border border-moveit-border">
                        <span className="text-moveit-muted text-[10px] block">EMPLOYMENT STATUS</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedEmployee.status || "ACTIVE"}</span>
                      </div>
                      <div className="p-3 bg-moveit-card rounded border border-moveit-border">
                        <span className="text-moveit-muted text-[10px] block">IS AVAILABLE FOR JOBS</span>
                        <span className="font-bold text-moveit-text">{selectedEmployee.isAvailable ? "YES" : "NO (ON JOB)"}</span>
                      </div>
                      <div className="p-3 bg-moveit-card rounded border border-moveit-border">
                        <span className="text-moveit-muted text-[10px] block">TEAM LEADER ELIGIBILITY</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{selectedEmployee.isTeamLeaderEligible ? "ELIGIBLE" : "NOT ELIGIBLE"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Identity Documents (Emirates ID, Passport, Visa, optional NOC) */}
              {activeTab === "DOCUMENTS" && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-moveit-text">
                      <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="font-bold">Required Documents: Emirates ID, Passport Copy, Visa & Optional NOC Letter</span>
                    </div>

                    {isAuthorizedHR ? (
                      (can("EMPLOYEES", "UPLOAD") || can("EMPLOYEES", "EDIT")) && (
<button
                        onClick={() => setShowUploadModal(true)}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow flex items-center gap-1.5"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload Document
                      </button>
)
                    ) : (
                      <div className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded text-red-600 dark:text-red-400 text-[11px] font-semibold flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                        Restricted View Access (HR Only)
                      </div>
                    )}
                  </div>

                  {/* Documents Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {["EMIRATES_ID", "PASSPORT", "VISA", "NOC_LETTER"].map((typeKey) => {
                      const selDocs = selectedEmployee.documents || [];
                      const doc = selDocs.find((d) => d.documentType === typeKey);

                      return (
                        <div key={typeKey} className="bg-moveit-surface p-4 rounded-xl border border-moveit-border space-y-3">
                          <div className="flex items-center justify-between border-b border-moveit-border pb-2">
                            <span className="font-bold text-moveit-text flex items-center gap-2">
                              <FileBadge className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                              {typeKey.replace(/_/g, " ")}
                              {typeKey === "NOC_LETTER" && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-moveit-surface-raised text-moveit-muted">
                                  OPTIONAL
                                </span>
                              )}
                            </span>

                            {doc && (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                doc.status === "VALID"
                                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                  : doc.status === "EXPIRING_SOON"
                                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                  : "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                              }`}>
                                {doc.status.replace("_", " ")}
                              </span>
                            )}
                          </div>

                          {doc ? (
                            <div className="space-y-2 text-[11px] font-mono">
                              <div>
                                <span className="text-moveit-muted block">Doc Number</span>
                                <span className="font-bold text-moveit-text">
                                  {isAuthorizedHR ? doc.documentNumber || "N/A" : "[RESTRICTED ACCESS]"}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-moveit-muted block">Issue Date</span>
                                  <span className="text-moveit-text">{doc.issueDate || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-moveit-muted block">Expiry Date</span>
                                  <span className={doc.status === "VALID" ? "text-moveit-text" : "text-amber-600 dark:text-amber-400 font-bold"}>
                                    {doc.expiryDate || "N/A"}
                                  </span>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-moveit-border-soft flex items-center justify-between text-[10px]">
                                <span className="text-moveit-muted">Uploaded by {doc.uploadedBy}</span>
                                {isAuthorizedHR && (
                                  can("EMPLOYEES", "DELETE") && (
<button
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="text-red-600 dark:text-red-400 hover:text-red-300 text-[10px] font-semibold"
                                  >
                                    Remove
                                  </button>
)
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 text-center border border-dashed border-moveit-border rounded text-moveit-muted text-[11px]">
                              No {typeKey.replace(/_/g, " ")} uploaded yet.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 3: Job Assignments & Crew History */}
              {activeTab === "JOBS" && (
                <div className="space-y-4 text-xs">
                  <div className="bg-moveit-surface p-4 rounded-xl border border-moveit-border space-y-3">
                    <h4 className="font-bold text-moveit-text text-xs flex items-center gap-2 border-b border-moveit-border pb-2">
                      <Briefcase className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      Current Assigned Job
                    </h4>
                    {(selectedEmployee.assignedJobs || []).length > 0 ? (
                      <div className="space-y-2">
                        {(selectedEmployee.assignedJobs || []).map((j, idx) => (
                          <div key={idx} className="p-3 bg-moveit-card border border-moveit-border rounded flex justify-between items-center font-mono">
                            <div>
                              <span className="font-bold text-moveit-text text-xs block">{j.customerName}</span>
                              <span className="text-moveit-muted text-[10px]">Job ID: {j.jobId} | Role: {j.assignedRole}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                              {j.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-moveit-muted text-[11px]">No active job assignment. Employee is available.</div>
                    )}
                  </div>

                  <div className="bg-moveit-surface p-4 rounded-xl border border-moveit-border space-y-3">
                    <h4 className="font-bold text-moveit-text text-xs flex items-center gap-2 border-b border-moveit-border pb-2">
                      <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      Crew History Logs ({(selectedEmployee.crewHistory || []).length})
                    </h4>
                    {(selectedEmployee.crewHistory || []).length > 0 ? (
                      <div className="space-y-2">
                        {(selectedEmployee.crewHistory || []).map((h, idx) => (
                          <div key={idx} className="p-2.5 bg-moveit-card border border-moveit-border rounded flex justify-between items-center font-mono text-[11px]">
                            <div>
                              <span className="font-bold text-moveit-text">{h.customerName}</span>
                              <span className="text-moveit-muted block text-[10px]">Crew Sheet: {h.crewSheetId} | Role: {h.role}</span>
                            </div>
                            <span className="text-moveit-text font-bold">{h.jobDate}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-moveit-muted text-[11px]">No historical crew logs recorded.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Document Expiry Alerts */}
              {activeTab === "ALERTS" && (
                <div className="space-y-4 text-xs">
                  <div className="bg-moveit-surface p-4 rounded-xl border border-moveit-border space-y-3">
                    <h4 className="font-bold text-moveit-text text-xs flex items-center gap-2 border-b border-moveit-border pb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      Consolidated Employee Document Expiry Alerts ({expiryAlerts.length})
                    </h4>

                    <div className="border border-moveit-border rounded-lg overflow-hidden font-mono">
                      <table className="w-full text-left text-moveit-text">
                        <thead className="bg-moveit-card text-moveit-text font-bold border-b border-moveit-border">
                          <tr>
                            <th className="p-2.5">Employee</th>
                            <th className="p-2.5">Document Type</th>
                            <th className="p-2.5">Expiry Date</th>
                            <th className="p-2.5 text-center">Days Remaining</th>
                            <th className="p-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-moveit-border-soft">
                          {expiryAlerts.map((alt, idx) => (
                            <tr key={idx} className="hover:bg-moveit-card/50">
                              <td className="p-2.5 font-bold text-moveit-text">{alt.employeeName}</td>
                              <td className="p-2.5 text-amber-600 dark:text-amber-400">{alt.documentType.replace(/_/g, " ")}</td>
                              <td className="p-2.5">{alt.expiryDate}</td>
                              <td className="p-2.5 text-center font-bold">
                                {alt.daysRemaining <= 0 ? (
                                  <span className="text-red-600 dark:text-red-400">EXPIRED ({Math.abs(alt.daysRemaining)} days ago)</span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400">{alt.daysRemaining} days</span>
                                )}
                              </td>
                              <td className="p-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  alt.status === "EXPIRED"
                                    ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                                    : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                }`}>
                                  {alt.status}
                                </span>
                              </td>
                            </tr>
                          ))}

                          {expiryAlerts.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-moveit-muted text-xs font-sans">
                                All employee identity documents are valid with no upcoming expiries.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-16 text-center border border-moveit-border rounded-xl bg-moveit-surface text-moveit-muted">
              Select an employee from the list to view profile, documents, and team leader eligibility.
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Create Employee */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-moveit-surface/80 backdrop-blur-sm flex items-center justify-center p-4 text-xs">
          <form onSubmit={handleCreateEmployee} className="bg-moveit-card border border-moveit-border rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-moveit-border pb-3">
              <h3 className="text-sm font-bold text-moveit-text flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Create New Employee Profile
              </h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-moveit-muted hover:text-moveit-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-moveit-muted mb-1 font-bold">Employee Full Name:</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Rashid Al-Kaabi"
                className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-moveit-muted mb-1 font-bold">Mobile Number:</label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+971501234567"
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text font-mono"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1 font-bold">Email Address:</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@moveit.com"
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-moveit-muted mb-1 font-bold">Role:</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as EmployeeRole)}
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
                >
                  <option value="TEAM_LEADER">Team Leader</option>
                  <option value="PACKER">Packer</option>
                  <option value="HELPER">Helper</option>
                  <option value="DRIVER">Driver</option>
                  <option value="SUPERVISOR">Supervisor</option>
                </select>
              </div>

              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-amber-600 dark:text-amber-400 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={newIsTL}
                    onChange={(e) => setNewIsTL(e.target.checked)}
                    className="rounded border-moveit-border bg-moveit-surface text-amber-500"
                  />
                  <span>TL Eligible</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-moveit-border">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-3 py-1.5 bg-moveit-surface-raised text-moveit-text rounded font-semibold">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded shadow-lg">
                Create Employee
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 2: Upload Identity Document */}
      {showUploadModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-moveit-surface/80 backdrop-blur-sm flex items-center justify-center p-4 text-xs">
          <form onSubmit={handleUploadDocument} className="bg-moveit-card border border-moveit-border rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-moveit-border pb-3">
              <h3 className="text-sm font-bold text-moveit-text flex items-center gap-2">
                <Upload className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Upload Identity Document ({selectedEmployee.name})
              </h3>
              <button type="button" onClick={() => setShowUploadModal(false)} className="text-moveit-muted hover:text-moveit-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-2 bg-red-500/20 border border-red-500/30 rounded text-red-600 dark:text-red-400 font-semibold">
                {uploadError}
              </div>
            )}

            <div>
              <label className="block text-moveit-muted mb-1 font-bold">Document Type:</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
              >
                <option value="EMIRATES_ID">Emirates ID</option>
                <option value="PASSPORT">Passport Copy</option>
                <option value="VISA">Residence Visa</option>
                <option value="NOC_LETTER">NOC Letter (Optional)</option>
              </select>
            </div>

            <div>
              <label className="block text-moveit-muted mb-1 font-bold">Document Number:</label>
              <input
                type="text"
                required
                value={docNum}
                onChange={(e) => setDocNum(e.target.value)}
                placeholder="e.g. 784-1990-1234567-1"
                className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text font-mono"
              />
            </div>

            <div>
              <label className="block text-moveit-muted mb-1">Document File Name:</label>
              <input
                type="text"
                value={docFileName}
                onChange={(e) => setDocFileName(e.target.value)}
                placeholder="e.g. emirates_id_copy.pdf"
                className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-moveit-muted mb-1">Issue Date:</label>
                <input
                  type="date"
                  value={docIssueDate}
                  onChange={(e) => setDocIssueDate(e.target.value)}
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
                />
              </div>
              <div>
                <label className="block text-moveit-muted mb-1">
                  Expiry Date {docType === "NOC_LETTER" ? "(Optional)" : "(Required)"}:
                </label>
                <input
                  type="date"
                  required={docType !== "NOC_LETTER"}
                  value={docExpiryDate}
                  onChange={(e) => setDocExpiryDate(e.target.value)}
                  className="w-full bg-moveit-surface border border-moveit-border rounded p-2 text-moveit-text"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-moveit-border">
              <button type="button" onClick={() => setShowUploadModal(false)} className="px-3 py-1.5 bg-moveit-surface-raised text-moveit-text rounded font-semibold">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded shadow-lg">
                Upload & Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
