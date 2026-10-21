"use client";

import * as React from "react";
import { services } from "@/services";
import { AuditEvent, AuditSummary } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { 
  Clock, 
  User, 
  Activity, 
  RefreshCw,
  Lock,
  Building2,
  CheckCircle2
} from "lucide-react";

const ENTITY_OPTIONS = [
  { value: "ALL", label: "All Entity Types" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "CONTRACT", label: "Contract" },
  { value: "ALLOCATION", label: "Allocation" },
  { value: "INVENTORY", label: "Inventory" },
  { value: "INVOICE", label: "Invoice" },
  { value: "DOCUMENT", label: "Document" },
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "PORTAL", label: "Portal Integration" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState("audit");
  const [events, setEvents] = React.useState<AuditEvent[]>([]);
  const [summary, setSummary] = React.useState<AuditSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedEntity, setSelectedEntity] = React.useState("ALL");

  const loadAuditData = React.useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const [list, sum] = await Promise.all([
        services.auditService.getAuditEvents({
          entityType: selectedEntity !== "ALL" ? selectedEntity : undefined,
          search: searchQuery || undefined,
        }),
        services.auditService.getAuditSummary(),
      ]);

      setEvents(list);
      setSummary(sum);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit trail events.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedEntity, searchQuery]);

  React.useEffect(() => {
    let active = true;
    Promise.all([
      services.auditService.getAuditEvents({
        entityType: selectedEntity !== "ALL" ? selectedEntity : undefined,
        search: searchQuery || undefined,
      }),
      services.auditService.getAuditSummary(),
    ])
      .then(([list, sum]) => {
        if (!active) return;
        setEvents(list);
        setSummary(sum);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load audit trail events.");
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedEntity, searchQuery]);

  const columns = React.useMemo<ColumnDef<AuditEvent>[]>(
    () => [
      {
        key: "timestamp",
        header: "Timestamp",
        cell: (row) => (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-mono">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>{formatDateTime(row.timestamp)}</span>
          </div>
        ),
      },
      {
        key: "performedBy",
        header: "User",
        cell: (row) => (
          <div className="flex items-center gap-1.5 font-medium text-xs text-slate-800 dark:text-slate-200">
            <User className="h-3.5 w-3.5 text-blue-500" />
            <span>{row.performedBy}</span>
          </div>
        ),
      },
      {
        key: "action",
        header: "Action",
        cell: (row) => (
          <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[11px] font-mono font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
            {row.action}
          </span>
        ),
      },
      {
        key: "entityType",
        header: "Entity",
        cell: (row) => (
          <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
            {row.entityType} ({row.entityId})
          </span>
        ),
      },
      {
        key: "description",
        header: "Description",
        cell: (row) => (
          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
            {row.description}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Audit Trail & System Settings"
        description="Inspect internal activity logs, governance audit trails, and customer portal security settings."
        breadcrumbs={[{ label: "Settings & Audit", isCurrent: true }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAuditData(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh Trail
          </Button>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        items={[
          {
            id: "audit",
            label: "Audit & Activity Trail",
            icon: <Activity className="h-4 w-4" />,
            content: (
              <div className="space-y-6">
                {/* Audit KPIs */}
                {summary && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <MetricCard
                      title="Total Recorded Events"
                      value={summary.totalEvents.toString()}
                      subtitle="System-wide audit trail logs"
                      icon={<Activity className="h-5 w-5 text-blue-600" />}
                    />
                    <MetricCard
                      title="Events Logged Today"
                      value={summary.eventsToday.toString()}
                      subtitle="Today's operations activity"
                      icon={<Clock className="h-5 w-5 text-emerald-600" />}
                    />
                    <MetricCard
                      title="Active Operator Accounts"
                      value={summary.uniqueUsers.toString()}
                      subtitle="Staff recorded in audit trail"
                      icon={<User className="h-5 w-5 text-indigo-600" />}
                    />
                  </div>
                )}

                {/* Audit Search & Filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <SearchInput
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search audit description, user, or entity ID..."
                    className="w-full sm:w-80"
                  />
                  <Select
                    options={ENTITY_OPTIONS}
                    value={selectedEntity}
                    onChange={(e) => setSelectedEntity(e.target.value)}
                    className="w-full sm:w-56"
                  />
                </div>

                {/* Audit Data Table */}
                {isLoading ? (
                  <LoadingState message="Loading internal audit event log..." />
                ) : error ? (
                  <ErrorState message={error} onRetry={() => loadAuditData()} />
                ) : (
                  <DataTable
                    data={events}
                    columns={columns}
                    keyExtractor={(item) => item.id}
                    emptyMessage="No audit trail events match the selected criteria."
                  />
                )}
              </div>
            ),
          },
          {
            id: "portal-security",
            label: "Portal Security Boundary",
            icon: <Lock className="h-4 w-4" />,
            content: (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-emerald-600" />
                    Customer Portal Integration Security Boundary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <p>
                    The <strong>ICustomerPortalIntegrationService</strong> acts as a strict abstraction layer between MoveIt&apos;s internal storage management domain and the existing external customer portal.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20 space-y-2">
                      <h4 className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" /> APPROVED EXPOSED DATA (PORTAL DTOs)
                      </h4>
                      <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                        <li>Customer name & code summary</li>
                        <li>Active storage space allocations summary</li>
                        <li>Approved storage contracts & start/end dates</li>
                        <li>Verified contract documents & PDFs</li>
                        <li>Invoices, balance due, & payment statuses</li>
                        <li>General customer storage dates</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20 space-y-2">
                      <h4 className="font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                        <Lock className="h-4 w-4" /> RESTRICTED INTERNAL DATA (NEVER EXPOSED)
                      </h4>
                      <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                        <li>Internal warehouse operational notes</li>
                        <li>Internal allocation scoring & AI recommendation logic</li>
                        <li>Physical warehouse rack/shelf location details</li>
                        <li>Operator staff names & internal task logs</li>
                        <li>Internal capacity planning calculations</li>
                        <li>Internal audit events & operational alerts</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ),
          },
          {
            id: "system-config",
            label: "System Parameters",
            icon: <Building2 className="h-4 w-4" />,
            content: (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Storage Measurement & System Parameters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">Default Currency</span>
                      <span className="text-slate-500 font-mono">AED (United Arab Emirates Dirham)</span>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">Configured Tax Rate</span>
                      <span className="text-slate-500 font-mono">5.00% VAT</span>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">Capacity Warning Threshold</span>
                      <span className="text-slate-500 font-mono">85.0% Occupancy</span>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">Contract Expiry Warning Window</span>
                      <span className="text-slate-500 font-mono">30 Days Prior</span>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">Document Expiry Warning Window</span>
                      <span className="text-slate-500 font-mono">30 Days Prior</span>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">Invoice Payment Due Window</span>
                      <span className="text-slate-500 font-mono">20 Days Net</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
