"use client";

import { useCan } from "@/lib/use-can";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { services } from "@/services";
import { StorageContract, ContractSummary } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  FileText, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Eye, 
  FileCheck2,
  Building2,
  Calendar,
  DollarSign
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_SIGNATURE", label: "Pending Signature" },
  { value: "EXPIRING_SOON", label: "Expiring Soon" },
  { value: "EXPIRED", label: "Expired" },
  { value: "TERMINATED", label: "Terminated" },
  { value: "CANCELLED", label: "Cancelled" },
];

const TYPE_OPTIONS = [
  { value: "ALL", label: "All Contract Types" },
  { value: "STORAGE", label: "Storage" },
  { value: "LONG_TERM_STORAGE", label: "Long-Term Storage" },
  { value: "SHORT_TERM_STORAGE", label: "Short-Term Storage" },
  { value: "CORPORATE_STORAGE", label: "Corporate Storage" },
];

export default function ContractsPage() {
  const can = useCan();
  const router = useRouter();

  const [contracts, setContracts] = React.useState<StorageContract[]>([]);
  const [summary, setSummary] = React.useState<ContractSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [list, sum] = await Promise.all([
        services.contractService.getContracts(),
        services.contractService.getContractSummary(),
      ]);
      setContracts(list);
      setSummary(sum);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load storage contracts.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    Promise.all([
      services.contractService.getContracts(),
      services.contractService.getContractSummary(),
    ])
      .then(([list, sum]) => {
        if (!active) return;
        setContracts(list);
        setSummary(sum);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load contracts.");
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredContracts = React.useMemo(() => {
    return contracts.filter((contract) => {
      // Search text
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesCode = contract.contractCode.toLowerCase().includes(query);
        const matchesCustomer = contract.customerName.toLowerCase().includes(query);
        const matchesNotes = contract.notes?.toLowerCase().includes(query);
        if (!matchesCode && !matchesCustomer && !matchesNotes) return false;
      }

      // Status filter
      if (statusFilter !== "ALL") {
        if (contract.status !== statusFilter) return false;
      }

      // Type filter
      if (typeFilter !== "ALL") {
        if (contract.contractType !== typeFilter) return false;
      }

      return true;
    });
  }, [contracts, searchQuery, statusFilter, typeFilter]);

  const columns: ColumnDef<StorageContract>[] = [
    {
      key: "contractCode",
      header: "Contract ID",
      sortable: true,
      cell: (item) => (
        <div>
          <Link
            href={`/contracts/${item.id}`}
            className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>{item.contractCode}</span>
          </Link>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Created: {formatDate(item.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: "customerName",
      header: "Customer",
      sortable: true,
      cell: (item) => (
        <div>
          <Link
            href={`/customers/${item.customerId}`}
            className="font-medium text-xs text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5"
          >
            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate max-w-[200px]">{item.customerName}</span>
          </Link>
        </div>
      ),
    },
    {
      key: "contractType",
      header: "Contract Type",
      cell: (item) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 uppercase tracking-wider">
          {item.contractType.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "startDate",
      header: "Dates & Term",
      sortable: true,
      cell: (item) => {
        const daysLeft = item.daysUntilExpiry;
        return (
          <div className="space-y-0.5 text-xs">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{formatDate(item.startDate)} → {formatDate(item.endDate)}</span>
            </div>
            {daysLeft !== undefined && (
              <span
                className={`text-[10px] font-medium px-1.5 py-0.2 rounded inline-block ${
                  daysLeft < 0
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    : daysLeft <= 30
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    : "text-slate-500"
                }`}
              >
                {daysLeft < 0
                  ? `Expired ${Math.abs(daysLeft)} days ago`
                  : daysLeft === 0
                  ? "Expires today"
                  : `${daysLeft} days remaining`}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "allocationIds",
      header: "Allocations",
      cell: (item) => {
        if (!item.allocationIds || item.allocationIds.length === 0) {
          return <span className="text-slate-400 italic text-xs">Unassigned</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {item.allocationIds.map((allocId) => (
              <Link
                key={allocId}
                href={`/allocations/${allocId}`}
                className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[11px] font-mono hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
              >
                {allocId}
              </Link>
            ))}
          </div>
        );
      },
    },
    {
      key: "storageRate",
      header: "Storage Rate",
      sortable: true,
      cell: (item) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>
              {formatCurrency(item.storageRate, item.currency)}{" "}
              <span className="text-[11px] font-normal text-slate-500">
                / {item.rateUnit.replace("_", " ")}
              </span>
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Billing: {item.billingFrequency.toLowerCase()}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (item) => <StatusBadge status={item.status} size="sm" />,
    },
    {
      key: "documentStatus",
      header: "Documents",
      cell: (item) => {
        const count = item.documentIds ? item.documentIds.length : 0;
        return (
          <div className="flex items-center gap-1 text-xs">
            <FileCheck2 className={`h-4 w-4 ${count > 0 ? "text-emerald-600" : "text-amber-500"}`} />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {count > 0 ? `${count} Attached` : "No Documents"}
            </span>
          </div>
        );
      },
    },
    {
      key: "id",
      header: "Actions",
      cell: (item) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/contracts/${item.id}`)}
            className="gap-1 text-[11px]"
          >
            <Eye className="h-3 w-3" />
            <span>View</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/contracts/${item.id}?tab=documents`)}
            className="gap-1 text-[11px] text-slate-600 hover:text-blue-600"
          >
            <FileCheck2 className="h-3 w-3" />
            <span>Docs</span>
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <LoadingState message="Fetching storage contracts and agreement records..." className="py-24" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to Load Contracts"
        message={error}
        onRetry={loadData}
        className="my-12"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Contracts"
        description="Manage storage agreements, terms, rates, dates, and contract documents."
        breadcrumbs={[{ label: "Contracts & Compliance", isCurrent: true }]}
        actions={
          can("CONTRACTS", "CREATE") && (
<Button
            variant="primary"
            size="sm"
            onClick={() => router.push("/contracts/new")}
            className="gap-1.5 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>New Contract</span>
          </Button>
)
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard
          title="Total Contracts"
          value={summary?.totalContracts || 0}
          icon={<FileText className="h-5 w-5 text-slate-500" />}
          subtitle="Storage agreements on record"
        />
        <MetricCard
          title="Active Contracts"
          value={summary?.activeContracts || 0}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          subtitle="Currently active storage terms"
        />
        <MetricCard
          title="Pending Contracts"
          value={summary?.pendingContracts || 0}
          icon={<Clock className="h-5 w-5 text-sky-600" />}
          subtitle="Draft or awaiting signature"
        />
        <MetricCard
          title="Expiring Soon"
          value={summary?.expiringSoonContracts || 0}
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
          subtitle="Expiring within 30 days"
        />
        <MetricCard
          title="Expired Contracts"
          value={summary?.expiredContracts || 0}
          icon={<XCircle className="h-5 w-5 text-rose-600" />}
          subtitle="Lapsed or completed agreements"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex-1 max-w-md">
          <SearchInput
            placeholder="Search by contract code, customer, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <Select
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40 text-xs"
          />

          {/* Type Filter */}
          <Select
            options={TYPE_OPTIONS}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-44 text-xs"
          />
        </div>
      </div>

      {/* Contracts Table */}
      {filteredContracts.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No Storage Contracts Found"
          description={
            searchQuery || statusFilter !== "ALL" || typeFilter !== "ALL"
              ? "No contract records match your filter criteria. Try clearing search filters."
              : "No storage contracts have been created yet. Click '+ New Contract' to register the first agreement."
          }
          actionLabel={
            searchQuery || statusFilter !== "ALL" || typeFilter !== "ALL"
              ? "Reset Filters"
              : "Create Contract"
          }
          onAction={
            searchQuery || statusFilter !== "ALL" || typeFilter !== "ALL"
              ? () => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setTypeFilter("ALL");
                }
              : () => router.push("/contracts/new")
          }
        />
      ) : (
        <DataTable
          data={filteredContracts}
          columns={columns}
          keyExtractor={(item) => item.id}
          pageSize={10}
        />
      )}
    </div>
  );
}
