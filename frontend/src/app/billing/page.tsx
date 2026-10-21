"use client";

import { useCan } from "@/lib/use-can";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { services } from "@/services";
import { StorageInvoice, BillingSummary, BillingReconciliationReport, BillingReconciliationDiscrepancy } from "@/types";
import { PaymentFormValues } from "@/lib/validators/billing";
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
import { PaymentModal } from "@/components/modules/billing/payment-modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  Receipt, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  DollarSign, 
  Eye, 
  Building2, 
  FileText,
  CreditCard,
  XCircle
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Invoice Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "ISSUED", label: "Issued" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "VOID", label: "Void" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function BillingPage() {
  const can = useCan();
  const router = useRouter();

  const [invoices, setInvoices] = React.useState<StorageInvoice[]>([]);
  const [summary, setSummary] = React.useState<BillingSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Payment Modal State
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = React.useState<StorageInvoice | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Reconciliation State
  const [reconciliationReport, setReconciliationReport] = React.useState<BillingReconciliationReport | null>(null);
  const [isReconciling, setIsReconciling] = React.useState(false);

  const handleRunReconciliation = async () => {
    setIsReconciling(true);
    try {
      const report = await services.billingService.reconcileBillingWithStorage();
      setReconciliationReport(report);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Reconciliation failed.");
    } finally {
      setIsReconciling(false);
    }
  };

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [list, sum] = await Promise.all([
        services.billingService.getInvoices(),
        services.billingService.getBillingSummary(),
      ]);
      setInvoices(list);
      setSummary(sum);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing records.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    Promise.all([
      services.billingService.getInvoices(),
      services.billingService.getBillingSummary(),
    ])
      .then(([list, sum]) => {
        if (!active) return;
        setInvoices(list);
        setSummary(sum);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load invoices.");
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredInvoices = React.useMemo(() => {
    return invoices.filter((inv) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = inv.invoiceNumber.toLowerCase().includes(q);
        const matchesCust = inv.customerName.toLowerCase().includes(q);
        const matchesContract = inv.contractCode.toLowerCase().includes(q);
        const matchesNotes = inv.notes?.toLowerCase().includes(q);
        if (!matchesNum && !matchesCust && !matchesContract && !matchesNotes) return false;
      }

      // Status filter
      if (statusFilter !== "ALL") {
        if (inv.status !== statusFilter) return false;
      }

      return true;
    });
  }, [invoices, searchQuery, statusFilter]);

  const handleRecordPaymentSubmit = async (values: PaymentFormValues) => {
    try {
      await services.billingService.recordPayment(values);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Payment recording failed.");
      throw err;
    }
  };

  const columns: ColumnDef<StorageInvoice>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice Number",
      sortable: true,
      cell: (item) => (
        <div>
          <Link
            href={`/billing/${item.id}`}
            className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
          >
            <Receipt className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>{item.invoiceNumber}</span>
          </Link>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Issued: {formatDate(item.issueDate)}
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
            className="font-medium text-xs text-slate-900 dark:text-slate-100 hover:text-blue-600 flex items-center gap-1.5"
          >
            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate max-w-[180px]">{item.customerName}</span>
          </Link>
        </div>
      ),
    },
    {
      key: "contractCode",
      header: "Contract",
      cell: (item) => (
        <Link
          href={`/contracts/${item.contractId}`}
          className="font-mono text-xs text-slate-700 dark:text-slate-300 hover:text-blue-600 flex items-center gap-1"
        >
          <FileText className="h-3 w-3 shrink-0 text-slate-400" />
          <span>{item.contractCode}</span>
        </Link>
      ),
    },
    {
      key: "billingPeriodStart",
      header: "Billing Period",
      cell: (item) => (
        <span className="text-xs text-slate-700 dark:text-slate-300">
          {formatDate(item.billingPeriodStart)} → {formatDate(item.billingPeriodEnd)}
        </span>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
      cell: (item) => (
        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
          {formatDate(item.dueDate)}
        </span>
      ),
    },
    {
      key: "totalAmount",
      header: "Total Amount",
      sortable: true,
      cell: (item) => (
        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
          {formatCurrency(item.totalAmount, item.currency)}
        </span>
      ),
    },
    {
      key: "balanceDue",
      header: "Balance Due",
      sortable: true,
      cell: (item) => (
        <span
          className={`font-bold text-xs ${
            item.balanceDue > 0
              ? item.status === "OVERDUE"
                ? "text-rose-600 dark:text-rose-400"
                : "text-amber-600 dark:text-amber-400"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {formatCurrency(item.balanceDue, item.currency)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (item) => <StatusBadge status={item.status} size="sm" />,
    },
    {
      key: "id",
      header: "Actions",
      cell: (item) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/billing/${item.id}`)}
            className="gap-1 text-[11px]"
          >
            <Eye className="h-3 w-3" />
            <span>View</span>
          </Button>

          {item.balanceDue > 0 && item.status !== "VOID" && item.status !== "CANCELLED" && (
            (can("BILLING", "CREATE") || can("BILLING", "EDIT")) && (
<Button
              variant="primary"
              size="sm"
              onClick={() => setSelectedInvoiceForPayment(item)}
              className="gap-1 text-[11px] font-semibold"
            >
              <CreditCard className="h-3 w-3" />
              <span>Pay</span>
            </Button>
)
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <LoadingState message="Fetching billing ledgers and storage invoices..." className="py-24" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to Load Billing Records"
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
        title="Billing & Invoices"
        description="Manage storage invoices, billing periods, outstanding balances, and payment status."
        breadcrumbs={[{ label: "Billing & Invoices", isCurrent: true }]}
        actions={
          can("BILLING", "CREATE") && (
<Button
            variant="primary"
            size="sm"
            onClick={() => router.push("/billing/new")}
            className="gap-1.5 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>Create Invoice</span>
          </Button>
)
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <MetricCard
          title="Total Invoices"
          value={summary?.totalInvoices || 0}
          icon={<Receipt className="h-5 w-5 text-slate-500" />}
          subtitle="Issued billing records"
        />
        <MetricCard
          title="Draft Invoices"
          value={summary?.draftInvoices || 0}
          icon={<Clock className="h-5 w-5 text-slate-500" />}
          subtitle="Pending issuance"
        />
        <MetricCard
          title="Outstanding"
          value={formatCurrency(summary?.totalOutstanding || 0, "AED")}
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
          subtitle="Uncollected balance"
        />
        <MetricCard
          title="Paid Amount"
          value={formatCurrency(summary?.totalPaid || 0, "AED")}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          subtitle="Collected payments"
        />
        <MetricCard
          title="Overdue Amount"
          value={formatCurrency(summary?.totalOverdueAmount || 0, "AED")}
          icon={<XCircle className="h-5 w-5 text-rose-600" />}
          subtitle="Lapsed payments"
        />
        <MetricCard
          title="Total Billed"
          value={formatCurrency(summary?.totalAmount || 0, "AED")}
          icon={<DollarSign className="h-5 w-5 text-blue-600" />}
          subtitle="Subtotal + 5% VAT"
        />
      </div>

      {/* Operational Billing Reconciliation Card */}
      <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/70 dark:bg-purple-950/30 dark:border-purple-900/60 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Operational Billing & Storage Reconciliation Audit
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Cross-compare storage allocations, rates, periods, contracts, and invoices to detect unbilled space or discrepancies.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunReconciliation}
            isLoading={isReconciling}
            className="gap-1.5 text-xs border-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-800 dark:text-purple-200 font-semibold shrink-0"
          >
            <Clock className="h-3.5 w-3.5 text-purple-600" />
            <span>Run Reconciliation Audit</span>
          </Button>
        </div>

        {reconciliationReport && (
          <div className="pt-3 border-t border-purple-200 dark:border-purple-900/60 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
              <span>
                Audited {reconciliationReport.totalAllocationsChecked} Storage Allocation(s) & {reconciliationReport.totalInvoicesChecked} Invoice(s)
              </span>
              <span className={`font-bold ${reconciliationReport.discrepanciesCount > 0 ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                {reconciliationReport.discrepanciesCount} Discrepancies Identified
              </span>
            </div>

            {reconciliationReport.discrepancies.length > 0 && (
              <div className="space-y-2 mt-2">
                {reconciliationReport.discrepancies.map((disc: BillingReconciliationDiscrepancy) => (
                  <div
                    key={disc.id}
                    className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                          {disc.discrepancyType.replace(/_/g, " ")}
                        </span>
                        <span className="font-semibold">{disc.customerName}</span>
                      </div>
                      <p className="text-[11px] mt-1">{disc.description}</p>
                    </div>
                    <div className="text-right text-[11px] shrink-0 font-mono">
                      <span className="block text-slate-500">Expected: {disc.expectedValue}</span>
                      <span className="block text-amber-800 dark:text-amber-300 font-bold">Actual: {disc.actualValue}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex-1 max-w-md">
          <SearchInput
            placeholder="Search invoice #, customer name, contract, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
          />
        </div>

        <div className="flex items-center gap-3">
          <Select
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-48 text-xs"
          />
        </div>
      </div>

      {/* Invoices Table */}
      {filteredInvoices.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-6 w-6" />}
          title="No Storage Invoices Found"
          description={
            searchQuery || statusFilter !== "ALL"
              ? "No billing records match your search criteria. Try clearing search filters."
              : "No storage invoices have been created yet. Click '+ Create Invoice' to generate the first ledger record."
          }
          actionLabel={searchQuery || statusFilter !== "ALL" ? "Reset Filters" : "Create Invoice"}
          onAction={
            searchQuery || statusFilter !== "ALL"
              ? () => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }
              : () => router.push("/billing/new")
          }
        />
      ) : (
        <DataTable
          data={filteredInvoices}
          columns={columns}
          keyExtractor={(item) => item.id}
          pageSize={10}
        />
      )}

      {/* Payment Recording Modal */}
      {selectedInvoiceForPayment && (
        <PaymentModal
          isOpen={!!selectedInvoiceForPayment}
          onClose={() => setSelectedInvoiceForPayment(null)}
          onSubmit={handleRecordPaymentSubmit}
          invoice={selectedInvoiceForPayment}
        />
      )}
    </div>
  );
}
