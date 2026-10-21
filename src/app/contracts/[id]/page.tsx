"use client";

import { useCan } from "@/lib/use-can";
import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { services } from "@/services";
import { 
  StorageContract, 
  ContractStatus, 
  CustomerDocument, 
  RequiredDocumentChecklistItem, 
  Customer, 
  StorageAllocation,
  InventoryRecord 
} from "@/types";
import { DocumentFormValues } from "@/lib/validators/document";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Modal } from "@/components/ui/modal";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { DocumentUploadModal } from "@/components/modules/contracts/document-upload-modal";
import { formatCurrency, formatDate, formatDateTime, formatSqFt } from "@/lib/utils";
import { 
  FileText, 
  Building2, 
  DollarSign, 
  Layers, 
  FileCheck2, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  ArrowLeft,
  Eye,
  Trash2,
  Package,
  ShieldAlert,
  ExternalLink
} from "lucide-react";

export default function ContractDetailPage() {
  const can = useCan();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const contractId = params.id as string;
  const initialTab = searchParams.get("tab") || "overview";

  const [contract, setContract] = React.useState<StorageContract | null>(null);
  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const [allocations, setAllocations] = React.useState<StorageAllocation[]>([]);
  const [inventoryRecords, setInventoryRecords] = React.useState<InventoryRecord[]>([]);
  const [documents, setDocuments] = React.useState<CustomerDocument[]>([]);
  const [checklist, setChecklist] = React.useState<RequiredDocumentChecklistItem[]>([]);
  const [allCustomers, setAllCustomers] = React.useState<Customer[]>([]);
  const [allContracts, setAllContracts] = React.useState<StorageContract[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [selectedDocPreview, setSelectedDocPreview] = React.useState<CustomerDocument | null>(null);
  const [statusChangeError, setStatusChangeError] = React.useState<string | null>(null);

  const fetchContractData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await services.contractService.getContractById(contractId);
      if (!data) {
        setError(`Contract record "${contractId}" not found.`);
        setIsLoading(false);
        return;
      }
      setContract(data);

      const [cust, allocList, docList, checkList, custs, cnts, records] = await Promise.all([
        services.customerService.getCustomerById(data.customerId),
        services.allocationService.getAllocations().catch(() => []),
        services.documentService.getContractDocuments(contractId),
        services.documentService.getContractChecklist(contractId),
        services.customerService.getCustomers(),
        services.contractService.getContracts(),
        services.inventoryService.getInventoryRecords().catch(() => []),
      ]);

      setCustomer(cust);
      setAllocations(allocList.filter((a: StorageAllocation) => data.allocationIds.includes(a.id)));
      setDocuments(docList);
      setChecklist(checkList);
      setAllCustomers(custs);
      setAllContracts(cnts);
      setInventoryRecords(records.filter((p: InventoryRecord) => p.customerId === data.customerId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contract details.");
    } finally {
      setIsLoading(false);
    }
  }, [contractId]);

  React.useEffect(() => {
    let active = true;
    services.contractService.getContractById(contractId).then((data) => {
      if (!active) return;
      if (!data) {
        setError(`Contract record "${contractId}" not found.`);
        setIsLoading(false);
        return;
      }
      setContract(data);
      Promise.all([
        services.customerService.getCustomerById(data.customerId),
        services.allocationService.getAllocations().catch(() => []),
        services.documentService.getContractDocuments(contractId),
        services.documentService.getContractChecklist(contractId),
        services.customerService.getCustomers(),
        services.contractService.getContracts(),
        services.inventoryService.getInventoryRecords().catch(() => []),
      ]).then(([cust, allocList, docList, checkList, custs, cnts, records]) => {
        if (!active) return;
        setCustomer(cust);
        setAllocations(allocList.filter((a: StorageAllocation) => data.allocationIds.includes(a.id)));
        setDocuments(docList);
        setChecklist(checkList);
        setAllCustomers(custs);
        setAllContracts(cnts);
        setInventoryRecords(records.filter((p: InventoryRecord) => p.customerId === data.customerId));
        setIsLoading(false);
      });
    }).catch((err) => {
      if (!active) return;
      setError(err instanceof Error ? err.message : "Failed to load contract details.");
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [contractId]);

  const handleStatusTransition = async (newStatus: ContractStatus) => {
    setStatusChangeError(null);
    try {
      await services.contractService.updateContractStatus(contractId, newStatus);
      await fetchContractData();
    } catch (err) {
      setStatusChangeError(err instanceof Error ? err.message : "Status change failed.");
    }
  };

  const handleUploadDocument = async (values: DocumentFormValues) => {
    try {
      await services.documentService.uploadDocumentMetadata({
        ...values,
        contractId,
      });
      await fetchContractData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Document upload failed.");
      throw err;
    }
  };

  const handleUpdateDocStatus = async (docId: string, status: CustomerDocument["status"]) => {
    try {
      await services.documentService.updateDocumentStatus(docId, status);
      await fetchContractData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Document status update failed.");
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document record metadata?")) return;
    try {
      await services.documentService.deleteDocument(docId);
      await fetchContractData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete document.");
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading storage contract details and compliance documents..." className="py-24" />;
  }

  if (error || !contract) {
    return (
      <ErrorState
        title="Contract Record Not Found"
        message={error || "The requested contract profile does not exist."}
        onRetry={() => router.push("/contracts")}
        className="my-12"
      />
    );
  }

  const daysLeft = contract.daysUntilExpiry;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={contract.contractCode}
        description={`Contract Code: ${contract.contractCode} • Type: ${contract.contractType.replace("_", " ")}`}
        breadcrumbs={[
          { label: "Contracts", href: "/contracts" },
          { label: contract.contractCode, isCurrent: true },
        ]}
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status={contract.status} />
            {daysLeft !== undefined && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  daysLeft < 0
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    : daysLeft <= 30
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                }`}
              >
                {daysLeft < 0
                  ? `Expired ${Math.abs(daysLeft)}d ago`
                  : daysLeft === 0
                  ? "Expires Today"
                  : `${daysLeft} Days Remaining`}
              </span>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/contracts")}
              className="gap-1.5 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Directory</span>
            </Button>

            {(can("DOCUMENTS", "UPLOAD") || can("DOCUMENTS", "CREATE")) && (
<Button
              variant="primary"
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="gap-1.5 text-xs font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>Upload Document</span>
            </Button>
)}
          </div>
        }
      />

      {statusChangeError && (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 text-xs flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{statusChangeError}</span>
        </div>
      )}

      {/* Contract Lifecycle Quick Status Transition Toolbar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Lifecycle Controls:
          </span>
          <span className="text-slate-500">Current state is {contract.status}.</span>
        </div>

        <div className="flex items-center gap-2">
          {contract.status === "DRAFT" && (
            <>
              {(can("CONTRACTS", "EDIT") || can("CONTRACTS", "APPROVE")) && (
<Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusTransition("PENDING_SIGNATURE")}
              >
                Mark Pending Signature
              </Button>
)}
              {(can("CONTRACTS", "APPROVE") || can("CONTRACTS", "EDIT")) && (
<Button
                variant="primary"
                size="sm"
                onClick={() => handleStatusTransition("ACTIVE")}
              >
                Activate Contract
              </Button>
)}
            </>
          )}

          {contract.status === "PENDING_SIGNATURE" && (
            (can("CONTRACTS", "APPROVE") || can("CONTRACTS", "EDIT")) && (
<Button
              variant="primary"
              size="sm"
              onClick={() => handleStatusTransition("ACTIVE")}
            >
              Mark Signed & Activate
            </Button>
)
          )}

          {(contract.status === "ACTIVE" || contract.status === "EXPIRING_SOON") && (
            (can("CONTRACTS", "CLOSE") || can("CONTRACTS", "EDIT")) && (
<Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusTransition("TERMINATED")}
              className="text-purple-700 hover:bg-purple-50"
            >
              Terminate Agreement
            </Button>
)
          )}

          {contract.status === "DRAFT" && (
            (can("CONTRACTS", "CLOSE") || can("CONTRACTS", "EDIT")) && (
<Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusTransition("CANCELLED")}
              className="text-rose-600 hover:bg-rose-50"
            >
              Cancel Draft
            </Button>
)
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs
        defaultValue={initialTab}
        items={[
          {
            id: "overview",
            label: "Overview & Commercial Terms",
            content: (
              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Customer & Commercial Terms */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Customer Info Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          Customer Profile & Account
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs">
                        {customer ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-slate-400 block text-[11px]">Customer Name</span>
                              <Link
                                href={`/customers/${customer.id}`}
                                className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 flex items-center gap-1.5 mt-0.5"
                              >
                                <span>{customer.name}</span>
                                <ExternalLink className="h-3 w-3 text-slate-400" />
                              </Link>
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[11px]">Customer Code & Type</span>
                              <p className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">
                                {customer.code} ({customer.type})
                              </p>
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[11px]">Contact Email</span>
                              <p className="text-slate-700 dark:text-slate-300 mt-0.5">{customer.email}</p>
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[11px]">Phone</span>
                              <p className="text-slate-700 dark:text-slate-300 mt-0.5">{customer.phone}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-500 italic">Customer details unavailable.</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Commercial Pricing Terms Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-emerald-600" />
                          Commercial Storage Terms & Pricing Basis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                          <div>
                            <span className="text-slate-400 block text-[11px]">Storage Rate</span>
                            <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                              {formatCurrency(contract.storageRate, contract.currency)}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[11px]">Rate Pricing Unit</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block uppercase">
                              {contract.rateUnit.replace("_", " ")}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[11px]">Billing Cycle</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block capitalize">
                              {contract.billingFrequency.toLowerCase()}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[11px]">Security Deposit</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block">
                              {formatCurrency(contract.depositAmount, contract.currency)}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div>
                            <span className="text-slate-400 block text-[11px]">Agreement Start Date</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 block">
                              {formatDate(contract.startDate)}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[11px]">Agreement End Date</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 block">
                              {formatDate(contract.endDate)}
                            </span>
                          </div>
                        </div>

                        {contract.notes && (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400 block text-[11px]">Special Terms / Notes</span>
                            <p className="text-slate-700 dark:text-slate-300 mt-0.5 whitespace-pre-wrap">
                              {contract.notes}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column: Linked Allocations & Inventory Summary */}
                  <div className="space-y-6">
                    {/* Linked Storage Allocations */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Layers className="h-4 w-4 text-purple-600" />
                          Governed Storage Allocations
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs">
                        {allocations.length === 0 ? (
                          <p className="text-slate-400 italic">No allocations attached to this contract.</p>
                        ) : (
                          <div className="space-y-2">
                            {allocations.map((alloc) => (
                              <div
                                key={alloc.id}
                                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <Link
                                    href={`/allocations/${alloc.id}`}
                                    className="font-mono font-semibold text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    <span>{alloc.allocationCode}</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                  <StatusBadge status={alloc.status} size="sm" />
                                </div>
                                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                                  Warehouse: <span className="font-medium text-slate-800 dark:text-slate-200">{alloc.warehouseName}</span>
                                </p>
                                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                                  Capacity: <span className="font-semibold">{formatSqFt(alloc.allocatedCapacity)}</span>
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Stored Inventory Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4 text-amber-600" />
                          Stored Inventory Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs">
                        <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                          <div>
                            <span className="text-amber-800 dark:text-amber-400 block text-[11px]">Total Stored Packages</span>
                            <span className="font-bold text-lg text-amber-900 dark:text-amber-200">
                              {inventoryRecords.length} Units
                            </span>
                          </div>
                          <Package className="h-8 w-8 text-amber-500 opacity-60" />
                        </div>
                        <p className="text-slate-500 text-[11px]">
                          Physical inventory stored across allocations under this customer contract.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: "documents",
            label: `Compliance & Documents (${documents.length})`,
            content: (
              <div className="space-y-6 pt-4">
                {/* Required Documents Compliance Checklist */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <FileCheck2 className="h-4 w-4 text-blue-600" />
                      Required Compliance Document Checklist
                    </CardTitle>
                    {(can("DOCUMENTS", "UPLOAD") || can("DOCUMENTS", "CREATE")) && (
<Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsUploadModalOpen(true)}
                      className="gap-1 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Upload Missing Doc</span>
                    </Button>
)}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {checklist.map((item, idx) => {
                        const isOk = item.status === "APPROVED" || item.status === "UPLOADED";
                        const isWarning = item.status === "EXPIRING_SOON" || item.status === "PENDING_REVIEW";
                        const isBad = item.status === "EXPIRED" || item.status === "MISSING";

                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border transition-all text-xs flex items-start gap-3 ${
                              isOk
                                ? "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-800"
                                : isWarning
                                ? "border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-800"
                                : "border-rose-200 bg-rose-50/40 dark:bg-rose-950/20 dark:border-rose-800"
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {isOk && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                              {isWarning && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                              {isBad && <XCircle className="h-4 w-4 text-rose-600" />}
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-semibold text-slate-900 dark:text-slate-100">
                                {item.label}
                                {item.isRequired && <span className="text-rose-500 font-bold ml-1">*</span>}
                              </p>
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <StatusBadge status={item.status} size="sm" />
                                {item.document && (
                                  <span className="font-mono text-[10px] text-slate-500">
                                    ({item.document.documentCode})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Uploaded Documents Table */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-purple-600" />
                      Uploaded Documents & File Metadata
                    </CardTitle>
                    <span className="text-xs text-slate-500">{documents.length} File Records</span>
                  </CardHeader>
                  <CardContent>
                    {documents.length === 0 ? (
                      <EmptyState
                        icon={<FileText className="h-6 w-6" />}
                        title="No Contract Documents Uploaded"
                        description="Upload signed storage agreements, passport/visa copies, insurance policies, or inspection reports."
                        actionLabel="Upload Document Metadata"
                        onAction={() => setIsUploadModalOpen(true)}
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="p-3">Doc Code & Title</th>
                              <th className="p-3">Type</th>
                              <th className="p-3">File Name</th>
                              <th className="p-3">Expiry Date</th>
                              <th className="p-3">Status</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {documents.map((doc) => (
                              <tr key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                <td className="p-3">
                                  <span className="font-mono font-bold text-blue-600 block">{doc.documentCode}</span>
                                  <span className="font-medium text-slate-900 dark:text-slate-100">{doc.title}</span>
                                </td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 font-medium uppercase">
                                    {doc.documentType.replace("_", " ")}
                                  </span>
                                </td>
                                <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                  {doc.fileName}
                                </td>
                                <td className="p-3">
                                  {doc.expiryDate ? (
                                    <div>
                                      <span>{formatDate(doc.expiryDate)}</span>
                                      {doc.daysUntilExpiry !== undefined && (
                                        <span
                                          className={`block text-[10px] font-medium ${
                                            doc.daysUntilExpiry < 0
                                              ? "text-rose-600"
                                              : doc.daysUntilExpiry <= 30
                                              ? "text-amber-600"
                                              : "text-slate-400"
                                          }`}
                                        >
                                          {doc.daysUntilExpiry < 0
                                            ? `Expired ${Math.abs(doc.daysUntilExpiry)}d ago`
                                            : `${doc.daysUntilExpiry}d remaining`}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic">No Expiry</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  <StatusBadge status={doc.status} size="sm" />
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedDocPreview(doc)}
                                      className="gap-1 text-[11px]"
                                    >
                                      <Eye className="h-3 w-3" />
                                      <span>Preview</span>
                                    </Button>

                                    {doc.status === "PENDING_REVIEW" || doc.status === "UPLOADED" ? (
                                      (can("DOCUMENTS", "APPROVE") || can("DOCUMENTS", "EDIT")) && (
<Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => handleUpdateDocStatus(doc.id, "APPROVED")}
                                      >
                                        Approve
                                      </Button>
)
                                    ) : null}

                                    {can("DOCUMENTS", "DELETE") && (
<Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteDocument(doc.id)}
                                      className="text-rose-600 hover:bg-rose-50"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
)}
                                  </div>
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
            ),
          },
        ]}
      />

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSubmit={handleUploadDocument}
        customers={allCustomers}
        contracts={allContracts}
        defaultCustomerId={contract.customerId}
        defaultContractId={contract.id}
      />

      {/* Document Preview / Details Modal */}
      {selectedDocPreview && (
        <Modal
          isOpen={!!selectedDocPreview}
          onClose={() => setSelectedDocPreview(null)}
          title={`Document Metadata — ${selectedDocPreview.documentCode}`}
          description="Internal document reference metadata details."
          size="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Storage Reference Notice */}
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200 space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="font-bold">Preview Unavailable in Mock Storage</span>
              </div>
              <p className="text-[11px] text-blue-800 dark:text-blue-300">
                This document is saved as a system storage reference abstraction:
              </p>
              <code className="block p-2 rounded bg-blue-100/80 dark:bg-blue-900/60 font-mono text-[11px] text-blue-950 dark:text-blue-100 break-all">
                {selectedDocPreview.storageReference}
              </code>
            </div>

            <div className="grid grid-cols-2 gap-4 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <div>
                <span className="text-slate-400 block text-[11px]">Document Title</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedDocPreview.title}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Document Type</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 uppercase">
                  {selectedDocPreview.documentType.replace("_", " ")}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">File Name & Type</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {selectedDocPreview.fileName} ({selectedDocPreview.fileType})
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Simulated File Size</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {(selectedDocPreview.fileSize / (1024 * 1024)).toFixed(2)} MB ({selectedDocPreview.fileSize.toLocaleString()} Bytes)
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Issue Date</span>
                <span>{formatDate(selectedDocPreview.issueDate)}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Expiry Date</span>
                <span>{selectedDocPreview.expiryDate ? formatDate(selectedDocPreview.expiryDate) : "No Expiry"}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Uploaded By</span>
                <span>{selectedDocPreview.uploadedBy} ({formatDateTime(selectedDocPreview.uploadedAt)})</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Compliance Status</span>
                <StatusBadge status={selectedDocPreview.status} size="sm" />
              </div>
            </div>

            {selectedDocPreview.notes && (
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[11px]">Notes</span>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5">{selectedDocPreview.notes}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setSelectedDocPreview(null)}>
                Close Details
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
