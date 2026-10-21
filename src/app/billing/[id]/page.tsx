"use client";

import { useCan } from "@/lib/use-can";
import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { services } from "@/services";
import { 
  StorageInvoice, 
  PaymentRecord, 
  Customer, 
  StorageContract,
  PortalSyncResult
} from "@/types";
import { PaymentFormValues } from "@/lib/validators/billing";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { PaymentModal } from "@/components/modules/billing/payment-modal";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { 
  Receipt, 
  Building2, 
  FileText, 
  Calendar, 
  CreditCard, 
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Globe,
  ExternalLink,
  ShieldAlert,
  Layers,
  Ban
} from "lucide-react";

export default function InvoiceDetailPage() {
  const can = useCan();
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = React.useState<StorageInvoice | null>(null);
  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const [contract, setContract] = React.useState<StorageContract | null>(null);
  const [paymentHistory, setPaymentHistory] = React.useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Portal sync state
  const [portalSyncResult, setPortalSyncResult] = React.useState<PortalSyncResult | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);

  const fetchInvoiceData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await services.billingService.getInvoiceById(invoiceId);
      if (!data) {
        setError(`Invoice record "${invoiceId}" not found.`);
        setIsLoading(false);
        return;
      }
      setInvoice(data);

      const [cust, cnt, payments] = await Promise.all([
        services.customerService.getCustomerById(data.customerId),
        services.contractService.getContractById(data.contractId),
        services.billingService.getInvoicePaymentHistory(invoiceId),
      ]);

      setCustomer(cust);
      setContract(cnt);
      setPaymentHistory(payments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoice details.");
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  React.useEffect(() => {
    let active = true;
    services.billingService.getInvoiceById(invoiceId).then((data) => {
      if (!active) return;
      if (!data) {
        setError(`Invoice record "${invoiceId}" not found.`);
        setIsLoading(false);
        return;
      }
      setInvoice(data);
      Promise.all([
        services.customerService.getCustomerById(data.customerId),
        services.contractService.getContractById(data.contractId),
        services.billingService.getInvoicePaymentHistory(invoiceId),
      ]).then(([cust, cnt, payments]) => {
        if (!active) return;
        setCustomer(cust);
        setContract(cnt);
        setPaymentHistory(payments);
        setIsLoading(false);
      });
    }).catch((err) => {
      if (!active) return;
      setError(err instanceof Error ? err.message : "Failed to load invoice details.");
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [invoiceId]);

  const handleIssueInvoice = async () => {
    setActionError(null);
    try {
      await services.billingService.issueInvoice(invoiceId);
      await fetchInvoiceData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to issue invoice.");
    }
  };

  const handleVoidInvoice = async () => {
    if (!confirm("Are you sure you want to void this invoice? This action cannot be reversed.")) return;
    setActionError(null);
    try {
      await services.billingService.voidInvoice(invoiceId);
      await fetchInvoiceData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to void invoice.");
    }
  };

  const handleCancelInvoice = async () => {
    if (!confirm("Are you sure you want to cancel this invoice?")) return;
    setActionError(null);
    try {
      await services.billingService.cancelInvoice(invoiceId);
      await fetchInvoiceData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to cancel invoice.");
    }
  };

  const handleRecordPaymentSubmit = async (values: PaymentFormValues) => {
    try {
      await services.billingService.recordPayment(values);
      await fetchInvoiceData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Payment submission failed.");
      throw err;
    }
  };

  const handlePortalSync = async () => {
    setIsSyncing(true);
    setPortalSyncResult(null);
    try {
      const res = await services.portalIntegrationService.syncInvoiceStatus(invoiceId);
      setPortalSyncResult(res);
    } catch (err) {
      setPortalSyncResult({
        success: false,
        entityId: invoiceId,
        entityType: "INVOICE",
        syncedAt: new Date().toISOString(),
        message: err instanceof Error ? err.message : "Portal sync failed.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Fetching storage invoice and payment history..." className="py-24" />;
  }

  if (error || !invoice) {
    return (
      <ErrorState
        title="Invoice Record Not Found"
        message={error || "The requested invoice profile does not exist."}
        onRetry={() => router.push("/billing")}
        className="my-12"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={invoice.invoiceNumber}
        description={`Billing Invoice • Created ${formatDate(invoice.createdAt)}`}
        breadcrumbs={[
          { label: "Billing & Invoices", href: "/billing" },
          { label: invoice.invoiceNumber, isCurrent: true },
        ]}
        badge={<StatusBadge status={invoice.status} />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/billing")}
              className="gap-1.5 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Billing</span>
            </Button>

            {invoice.balanceDue > 0 && invoice.status !== "VOID" && invoice.status !== "CANCELLED" && (
              (can("BILLING", "CREATE") || can("BILLING", "EDIT")) && (
<Button
                variant="primary"
                size="sm"
                onClick={() => setIsPaymentModalOpen(true)}
                className="gap-1.5 text-xs font-semibold"
              >
                <CreditCard className="h-4 w-4" />
                <span>Record Payment</span>
              </Button>
)
            )}
          </div>
        }
      />

      {actionError && (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 text-xs flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Invoice State & Action Controls Toolbar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Invoice Lifecycle Controls:
          </span>
          <span className="text-slate-500">Current status is {invoice.status}.</span>
        </div>

        <div className="flex items-center gap-2">
          {invoice.status === "DRAFT" && (
            (can("BILLING", "EDIT") || can("BILLING", "APPROVE")) && (
<Button
              variant="primary"
              size="sm"
              onClick={handleIssueInvoice}
              className="gap-1 text-xs font-semibold"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Issue Invoice</span>
            </Button>
)
          )}

          {invoice.status !== "PAID" && invoice.status !== "VOID" && invoice.status !== "CANCELLED" && (
            <>
              {(can("BILLING", "EDIT") || can("BILLING", "CLOSE")) && (
<Button
                variant="outline"
                size="sm"
                onClick={handleCancelInvoice}
                className="text-amber-700 hover:bg-amber-50 text-xs"
              >
                Cancel Invoice
              </Button>
)}
              {(can("BILLING", "EDIT") || can("BILLING", "CLOSE")) && (
<Button
                variant="outline"
                size="sm"
                onClick={handleVoidInvoice}
                className="text-rose-700 hover:bg-rose-50 text-xs"
              >
                <Ban className="h-3.5 w-3.5" />
                <span>Void Invoice</span>
              </Button>
)}
            </>
          )}
        </div>
      </div>

      {/* Customer Portal Sync Integration Header Notice */}
      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Existing MoveIt Customer Portal Integration
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-200 font-bold">
                DTO REST Abstraction
              </span>
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              Customer-safe invoice data (amounts, due dates, balance) is mapped directly to portal DTOs. Internal staff notes & warehouse operational details are excluded.
            </p>
          </div>
        </div>

        {(can("BILLING", "EDIT") || can("BILLING", "RECONCILE")) && (
<Button
          variant="outline"
          size="sm"
          onClick={handlePortalSync}
          isLoading={isSyncing}
          className="gap-1.5 text-xs border-blue-300 hover:bg-blue-100 shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
          <span>Sync Status with Portal</span>
        </Button>
)}
      </div>

      {portalSyncResult && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            portalSyncResult.success
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200"
              : "border-rose-200 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{portalSyncResult.message} ({formatDateTime(portalSyncResult.syncedAt)})</span>
        </div>
      )}

      {/* Top Cards: Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <span className="text-slate-400 block text-[11px]">Subtotal (Excl. Tax)</span>
          <span className="font-bold text-lg text-slate-900 dark:text-slate-100">
            {formatCurrency(invoice.subtotal, invoice.currency)}
          </span>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-slate-400 block text-[11px]">VAT Tax ({invoice.taxRate * 100}%)</span>
          <span className="font-bold text-lg text-slate-900 dark:text-slate-100">
            {formatCurrency(invoice.taxAmount, invoice.currency)}
          </span>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-slate-400 block text-[11px]">Total Invoice Billed</span>
          <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
            {formatCurrency(invoice.totalAmount, invoice.currency)}
          </span>
        </Card>

        <Card className={`p-4 space-y-1 border ${invoice.balanceDue > 0 ? "border-amber-200 bg-amber-50/40 dark:bg-amber-950/20" : "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20"}`}>
          <span className="text-slate-400 block text-[11px]">Balance Due</span>
          <span className={`font-bold text-lg ${invoice.balanceDue > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {formatCurrency(invoice.balanceDue, invoice.currency)}
          </span>
        </Card>
      </div>

      {/* Middle Layout: Invoice Details & Context Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Line Items & Payment History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Receipt className="h-4 w-4 text-emerald-600" />
                Invoice Line Items & Billed Services
              </CardTitle>
              <span className="text-xs text-slate-500">{invoice.lineItems.length} Billed Items</span>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3">Unit</th>
                      <th className="p-3 text-right">Unit Rate</th>
                      <th className="p-3 text-right">Line Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {invoice.lineItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                        <td className="p-3">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                            {item.description}
                          </span>
                          {item.allocationId && (
                            <Link
                              href={`/allocations/${item.allocationId}`}
                              className="font-mono text-[10px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <Layers className="h-3 w-3" />
                              <span>Allocation: {item.allocationId}</span>
                            </Link>
                          )}
                        </td>
                        <td className="p-3 text-right font-semibold">{item.quantity}</td>
                        <td className="p-3 capitalize">{item.unit.replace("_", " ").toLowerCase()}</td>
                        <td className="p-3 text-right font-mono">
                          {formatCurrency(item.unitRate, invoice.currency)}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(item.amount, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-slate-200 dark:border-slate-700 font-semibold">
                    <tr>
                      <td colSpan={4} className="p-3 text-right text-slate-500">Subtotal:</td>
                      <td className="p-3 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(invoice.subtotal, invoice.currency)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="p-3 text-right text-slate-500">VAT ({invoice.taxRate * 100}%):</td>
                      <td className="p-3 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(invoice.taxAmount, invoice.currency)}
                      </td>
                    </tr>
                    <tr className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-slate-50/50 dark:bg-slate-800/40">
                      <td colSpan={4} className="p-3 text-right">Total Invoice Billed:</td>
                      <td className="p-3 text-right">
                        {formatCurrency(invoice.totalAmount, invoice.currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Payment History Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-purple-600" />
                Recorded Payment History
              </CardTitle>
              <span className="text-xs text-slate-500">{paymentHistory.length} Payments Recorded</span>
            </CardHeader>
            <CardContent>
              {paymentHistory.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  No internal payments recorded against this invoice yet. Click &quot;Record Payment&quot; above to log a transaction.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3">Payment Ref</th>
                        <th className="p-3">Payment Date</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">Recorded By</th>
                        <th className="p-3 text-right">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {paymentHistory.map((pmt) => (
                        <tr key={pmt.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-mono font-bold text-purple-600">{pmt.referenceNumber}</td>
                          <td className="p-3">{formatDate(pmt.paymentDate)}</td>
                          <td className="p-3 font-medium uppercase text-[10px]">
                            {pmt.paymentMethod.replace("_", " ")}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{pmt.recordedBy}</td>
                          <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(pmt.amount, invoice.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Customer & Contract Context */}
        <div className="space-y-6">
          {/* Customer Context Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-blue-600" />
                Customer Account Context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {customer ? (
                <div className="space-y-2">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Customer Name</span>
                    <Link
                      href={`/customers/${customer.id}`}
                      className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 flex items-center gap-1 mt-0.5"
                    >
                      <span>{customer.name}</span>
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </Link>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Customer Code & Account</span>
                    <p className="font-mono text-slate-700 dark:text-slate-300">{customer.code} ({customer.type})</p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Contact Email & Phone</span>
                    <p className="text-slate-700 dark:text-slate-300">{customer.email} • {customer.phone}</p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 italic">Customer details unavailable.</p>
              )}
            </CardContent>
          </Card>

          {/* Contract Context Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-purple-600" />
                Governing Storage Contract
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {contract ? (
                <div className="space-y-2">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Contract Code</span>
                    <Link
                      href={`/contracts/${contract.id}`}
                      className="font-mono font-bold text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <span>{contract.contractCode}</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Contract Type & Rate</span>
                    <p className="text-slate-700 dark:text-slate-300">
                      {contract.contractType.replace("_", " ")} • {formatCurrency(contract.storageRate, contract.currency)} / {contract.rateUnit.toLowerCase()}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Lease Term</span>
                    <p className="text-slate-700 dark:text-slate-300">
                      {formatDate(contract.startDate)} → {formatDate(contract.endDate)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 italic">Contract details unavailable.</p>
              )}
            </CardContent>
          </Card>

          {/* Invoice Dates & Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-emerald-600" />
                Schedule & Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Billing Period</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatDate(invoice.billingPeriodStart)} → {formatDate(invoice.billingPeriodEnd)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Issue Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(invoice.issueDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Payment Due Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(invoice.dueDate)}</span>
              </div>
              {invoice.notes && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Notes</span>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Recording Modal */}
      {isPaymentModalOpen && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSubmit={handleRecordPaymentSubmit}
          invoice={invoice}
        />
      )}
    </div>
  );
}
