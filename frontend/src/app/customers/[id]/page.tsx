"use client";

import { useCan } from "@/lib/use-can";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { services } from "@/services";
import { hasPermission, PermissionModule } from "@/types";
import { useUIStore } from "@/store/use-ui-store";
import { Customer, StorageContract, CustomerDocument, StorageInvoice, StorageAllocation, PackageRecord } from "@/types";
import { CustomerStorageOverview } from "@/services/interfaces/ICustomerService";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { CustomerFormModal } from "@/components/modules/customers/customer-form-modal";
import { CustomerFormValues } from "@/lib/validators/customer";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate, formatDateTime, formatSqFt } from "@/lib/utils";
import { 
  Edit3, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  User, 
  Layers, 
  Package, 
  FileText, 
  Receipt, 
  Clock, 
  ArrowLeft,
  FileCheck2
} from "lucide-react";

/** Which module a customer-detail tab belongs to; a tab is shown only when the user may VIEW that module. */
const TAB_MODULE: Record<string, PermissionModule> = {
  current_storage: "ALLOCATIONS",
  previous_storage: "ALLOCATIONS",
  inventory: "INVENTORY",
  contracts: "CONTRACTS",
  documents: "DOCUMENTS",
  billing: "BILLING",
};
function TABS_FOR<T extends { id: string }>(canSee: (m: PermissionModule) => boolean, items: T[]): T[] {
  return items.filter((t) => !TAB_MODULE[t.id] || canSee(TAB_MODULE[t.id]));
}

export default function CustomerDetailPage() {
  const can = useCan();
  const params = useParams();
  const router = useRouter();
  const role = useUIStore((st) => st.currentRole);
  const canSee = (m: PermissionModule) => hasPermission(role, m, "VIEW");
  const customerId = params.id as string;

  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const [storageOverview, setStorageOverview] = React.useState<CustomerStorageOverview | null>(null);
  const [customerContracts, setCustomerContracts] = React.useState<StorageContract[]>([]);
  const [customerDocuments, setCustomerDocuments] = React.useState<CustomerDocument[]>([]);
  const [customerInvoices, setCustomerInvoices] = React.useState<StorageInvoice[]>([]);
  const [customerAllocations, setCustomerAllocations] = React.useState<StorageAllocation[]>([]);
  const [customerPackages, setCustomerPackages] = React.useState<PackageRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchCustomer = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await services.customerService.getCustomerById(customerId);
      if (!data) {
        setError("Customer record not found.");
      } else {
        setCustomer(data);
        const [overview, cnts, docs, invs] = await Promise.all([
          services.customerService.getCustomerStorageOverview(customerId),
          services.contractService.getCustomerContracts(customerId).catch(() => []),
          services.documentService.getCustomerDocuments(customerId).catch(() => []),
          services.billingService.getCustomerInvoices(customerId).catch(() => []),
        ]);
        setStorageOverview(overview);
        setCustomerContracts(cnts);
        setCustomerDocuments(docs);
        setCustomerInvoices(invs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customer profile.");
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  React.useEffect(() => {
    let active = true;
    services.customerService
      .getCustomerById(customerId)
      .then((data) => {
        if (!active) return;
        if (!data) {
          setError("Customer record not found.");
          setIsLoading(false);
        } else {
          setCustomer(data);
          Promise.all([
            services.customerService.getCustomerStorageOverview(customerId),
            services.contractService.getCustomerContracts(customerId).catch(() => []),
            services.documentService.getCustomerDocuments(customerId).catch(() => []),
            services.billingService.getCustomerInvoices(customerId).catch(() => []),
          ]).then(([overview, cnts, docs, invs]) => {
            if (!active) return;
            setStorageOverview(overview);
            setCustomerContracts(cnts);
            setCustomerDocuments(docs);
            setCustomerInvoices(invs);
            setIsLoading(false);
          });
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load customer profile.");
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [customerId]);

  React.useEffect(() => {
    let active = true;
    Promise.all([services.allocationService.getAllocations().catch(() => []), services.inventoryService.getCustomerInventory(customerId).catch(() => [])])
      .then(([allocs, inv]) => {
        if (!active) return;
        setCustomerAllocations(allocs.filter((a) => a.customerId === customerId));
        setCustomerPackages(
          inv.map((r) => ({ ...r, quantity: r.itemCount, currentLocationPath: r.locationPath, slotId: r.locationId }))
        );
      })
      .catch(() => {
        if (!active) return;
        setCustomerAllocations([]);
        setCustomerPackages([]);
      });
    return () => {
      active = false;
    };
  }, [customerId]);

  const handleUpdate = async (values: CustomerFormValues) => {
    setIsSubmitting(true);
    try {
      await services.customerService.updateCustomer(customerId, values);
      await fetchCustomer();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update customer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Fetching MoveIt customer 360 profile..." className="py-24" />;
  }

  if (error || !customer) {
    return (
      <ErrorState
        title="Customer Record Not Found"
        message={error || "The requested customer profile does not exist."}
        onRetry={() => router.push("/customers")}
        className="my-12"
      />
    );
  }

  // Linked mock entities
  const linkedAllocations = customerAllocations;
  const linkedPackages = customerPackages;
  const linkedContracts = customerContracts;
  const linkedDocuments = customerDocuments;
  const linkedInvoices = customerInvoices;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={customer.name}
        description={`Customer Code: ${customer.code} • Account Status: ${customer.status}`}
        breadcrumbs={[
          { label: "Customers", href: "/customers" },
          { label: customer.code, isCurrent: true },
        ]}
        badge={
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                customer.type === "CORPORATE"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                  : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
              }`}
            >
              {customer.type}
            </span>
            <StatusBadge status={customer.status === "ACTIVE" ? "VALID" : "EXPIRED"} />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/customers")}
              className="gap-1 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Directory</span>
            </Button>
            {can("CUSTOMERS", "EDIT") && (
<Button
              variant="primary"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="gap-1.5 text-xs"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Profile</span>
            </Button>
)}
          </div>
        }
      />

      {/* Deactivation / Closure Preservation Alert Notice */}
      {customer.status === "INACTIVE" && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 flex items-center gap-3 text-xs text-amber-900 dark:text-amber-200">
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">Customer Profile Is Closed / Inactive</span>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Historical operational records preserved: All storage allocations (current and previous), package inventory, packing lists, contracts, compliance documents, invoices, and closure logs are retained and fully accessible.
            </p>
          </div>
        </div>
      )}

      {/* Top Section: Profile Information + Storage Requirement & Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information & Metadata */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {customer.type === "CORPORATE" ? (
                <Building2 className="h-5 w-5 text-blue-600" />
              ) : (
                <User className="h-5 w-5 text-purple-600" />
              )}
              Customer Profile & Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">
                  {customer.type === "CORPORATE" ? "Company Name" : "Full Name"}
                </span>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {customer.companyName || customer.name}
                </p>
              </div>

              {customer.type === "CORPORATE" && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    Primary Contact Person
                  </span>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {customer.firstName || customer.lastName
                      ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
                      : "Not specified"}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Email Address</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                  <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Primary Phone</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span>{customer.phone}</span>
                </p>
              </div>

              {customer.alternatePhone && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Alt Phone</span>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{customer.alternatePhone}</p>
                </div>
              )}
            </div>

            <div className="space-y-1 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase">Address & Location</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span>{customer.address}, {customer.city}, {customer.country}</span>
              </p>
            </div>

            {/* Storage Requirements Summary Card */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/60 space-y-2">
              <h4 className="font-bold text-xs text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-blue-600" />
                Storage Requirements Specification
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">Required Storage</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {customer.requiredSqFt ? formatSqFt(customer.requiredSqFt) : "1,200 SQ.FT"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">Storage Start Date</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {customer.storageStartDate ? formatDate(customer.storageStartDate) : "2026-01-15"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">Expected Duration</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {customer.storageDurationMonths ? `${customer.storageDurationMonths} Months` : "12 Months"}
                  </span>
                </div>
              </div>
            </div>

            {customer.notes && (
              <div className="space-y-1 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Service & Operational Notes</span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
                  {customer.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Storage Summary Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-950/40 dark:border-blue-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-blue-900 dark:text-blue-200">Active Allocations</span>
              </div>
              <span className="font-bold text-base text-blue-700 dark:text-blue-300">
                {storageOverview?.activeAllocationsCount || 0}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold text-emerald-900 dark:text-emerald-200">Stored Packages</span>
              </div>
              <span className="font-bold text-base text-emerald-700 dark:text-emerald-300">
                {storageOverview?.totalStoredPackagesCount || 0}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-100 dark:bg-purple-950/40 dark:border-purple-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-purple-600" />
                <span className="font-semibold text-purple-900 dark:text-purple-200">Total Occupied</span>
              </div>
              <span className="font-bold text-base text-purple-700 dark:text-purple-300">
                {formatSqFt(storageOverview?.totalOccupiedSqFt || 0)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100 dark:bg-amber-950/40 dark:border-amber-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-amber-600" />
                <span className="font-semibold text-amber-900 dark:text-amber-200">Outstanding Balance</span>
              </div>
              <span className="font-bold text-sm text-amber-700 dark:text-amber-300">
                {formatCurrency(storageOverview?.outstandingInvoicesAmount || 0)}
              </span>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 space-y-1">
              <p>Account Created: {formatDate(customer.createdAt)}</p>
              <p>Last Activity: {formatDate(customer.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer 360 Tabbed Details Section */}
      <Tabs
        items={TABS_FOR(canSee, [
          {
            id: "overview",
            label: "Overview",
            icon: <FileText className="h-4 w-4" />,
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Customer Account Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
                  <p>
                    Centralized account overview for <strong>{customer.name}</strong> ({customer.code}). This customer account holds {storageOverview?.activeAllocationsCount || 0} active storage allocation(s) utilizing {formatSqFt(storageOverview?.totalOccupiedSqFt || 0)} across MoveIt logistics centers.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Required Storage SQ.FT</h4>
                      <p className="text-slate-500 font-bold text-sm text-blue-600 dark:text-blue-400">
                        {customer.requiredSqFt ? formatSqFt(customer.requiredSqFt) : "1,200 SQ.FT"}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Storage Start Date</h4>
                      <p className="text-slate-500 font-bold text-sm text-blue-600 dark:text-blue-400">
                        {customer.storageStartDate ? formatDate(customer.storageStartDate) : "2026-01-15"}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Expected Duration</h4>
                      <p className="text-slate-500 font-bold text-sm text-blue-600 dark:text-blue-400">
                        {customer.storageDurationMonths ? `${customer.storageDurationMonths} Months` : "12 Months"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ),
          },
          {
            id: "current_storage",
            label: "Current Storage",
            icon: <Layers className="h-4 w-4" />,
            badge: linkedAllocations.filter((a) => a.status === "CONFIRMED" || a.status === "ACTIVE" || a.status === "RECOMMENDED").length,
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Current Active Storage Allocations & Locations</CardTitle>
                </CardHeader>
                <CardContent>
                  {linkedAllocations.filter((a) => a.status === "CONFIRMED" || a.status === "ACTIVE" || a.status === "RECOMMENDED").length === 0 ? (
                    <EmptyState
                      title="No Active Allocations"
                      description="This customer does not currently have active storage allocations."
                    />
                  ) : (
                    <div className="space-y-3">
                      {linkedAllocations
                        .filter((a) => a.status === "CONFIRMED" || a.status === "ACTIVE" || a.status === "RECOMMENDED")
                        .map((alloc) => (
                          <div
                            key={alloc.id}
                            onClick={() => router.push(`/allocations/${alloc.id}`)}
                            className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs cursor-pointer transition-all shadow-2xs hover:shadow-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold font-mono text-blue-600 dark:text-blue-400">{alloc.allocationCode}</span>
                                <StatusBadge status={alloc.status === "CONFIRMED" || alloc.status === "ACTIVE" ? "VALID" : "PENDING"} size="sm" />
                                {alloc.aiRecommended && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                    AI Suggested
                                  </span>
                                )}
                              </div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                Location: {alloc.locationPath}
                              </p>
                              <p className="text-slate-400 text-[11px]">Warehouse: {alloc.warehouseName}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-slate-900 dark:text-slate-100 block">{formatSqFt(alloc.allocatedCapacity || 0)}</span>
                              <p className="text-slate-400 text-[11px]">Started {formatDate(alloc.startDate)}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ),
          },
          {
            id: "previous_storage",
            label: "Previous Storage Allocations",
            icon: <Clock className="h-4 w-4" />,
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Previous Storage Allocations & Location Release History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-slate-700 dark:text-slate-300">SAL-2025-0042</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                            RELEASED / COMPLETED
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          Location: Dubai Hub &gt; Floor 2 &gt; Zone C &gt; Rack 204 &gt; Slot C-04
                        </p>
                        <p className="text-slate-400 text-[11px]">MoveIt Main Logistics Hub — Dubai</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block">{formatSqFt(500)}</span>
                        <p className="text-slate-400 text-[11px]">Released on 2025-12-20</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ),
          },
          {
            id: "inventory",
            label: "Packing Lists & Inventory",
            icon: <Package className="h-4 w-4" />,
            badge: linkedPackages.length,
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Packing Lists & Stored Inventory Items</CardTitle>
                </CardHeader>
                <CardContent>
                  {linkedPackages.length === 0 ? (
                    <EmptyState
                      title="No Stored Packages"
                      description="No package items or packing lists currently recorded."
                    />
                  ) : (
                    <div className="space-y-3">
                      {linkedPackages.map((pkg) => (
                        <div
                          key={pkg.id}
                          onClick={() => router.push(`/inventory/${pkg.id}`)}
                          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs cursor-pointer transition-all shadow-2xs hover:shadow-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold font-mono text-blue-600 dark:text-blue-400">{pkg.packageId}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 uppercase">
                                {pkg.status.replace("_", " ")}
                              </span>
                            </div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{pkg.description}</p>
                            <p className="text-slate-400 text-[11px]">Stored at: {pkg.currentLocationPath || "—"}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {pkg.packageType} x{pkg.quantity}
                            </span>
                            <span className="text-[10px] text-slate-400 block">Logged: {formatDate(pkg.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ),
          },
          {
            id: "contracts",
            label: "Contracts",
            icon: <FileText className="h-4 w-4" />,
            badge: linkedContracts.length,
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Storage Leases & Contracts</CardTitle>
                </CardHeader>
                <CardContent>
                  {linkedContracts.length === 0 ? (
                    <EmptyState
                      title="No Storage Contracts"
                      description="No active storage contracts linked to this customer account."
                    />
                  ) : (
                    <div className="space-y-3">
                      {linkedContracts.map((cnt) => (
                        <div
                          key={cnt.id}
                          onClick={() => router.push(`/contracts/${cnt.id}`)}
                          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800 flex items-center justify-between text-xs cursor-pointer transition-all shadow-2xs hover:shadow-xs"
                        >
                          <div>
                            <span className="font-bold text-blue-600 dark:text-blue-400 font-mono hover:underline">
                              {cnt.contractCode || cnt.contractNumber}
                            </span>
                            <p className="text-slate-500 text-[11px]">
                              Type: {cnt.contractType.replace("_", " ")} • Rate: {formatCurrency(cnt.storageRate || cnt.monthlyRate, cnt.currency)} / {(cnt.rateUnit || "MONTH").toLowerCase()}
                            </p>
                          </div>
                          <div className="text-right space-y-0.5">
                            <StatusBadge status={cnt.status} size="sm" />
                            <p className="text-slate-400 text-[11px]">Ends {formatDate(cnt.endDate)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ),
          },
          {
            id: "documents",
            label: "Documents",
            icon: <FileCheck2 className="h-4 w-4" />,
            badge: linkedDocuments.length,
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  {linkedDocuments.length === 0 ? (
                    <EmptyState
                      title="No Documents Uploaded"
                      description="No passports, trade licenses, or insurance policies uploaded for this customer."
                    />
                  ) : (
                    <div className="space-y-3">
                      {linkedDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-slate-100">{doc.title}</span>
                              <StatusBadge status={doc.status} size="sm" />
                            </div>
                            <span className="text-slate-400 text-[11px]">Type: {doc.documentType}</span>
                          </div>
                          <span className="text-slate-500 font-medium">{doc.expiryDate ? `Expires: ${formatDate(doc.expiryDate)}` : "No Expiry"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ),
          },
          {
            id: "billing",
            label: "Billing & Invoices",
            icon: <Receipt className="h-4 w-4" />,
            badge: linkedInvoices.length,
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Invoice & Billing History</CardTitle>
                </CardHeader>
                <CardContent>
                  {linkedInvoices.length === 0 ? (
                    <EmptyState
                      title="No Invoices"
                      description="No billing invoices generated for this customer account yet."
                    />
                  ) : (
                    <div className="space-y-3">
                      {linkedInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          onClick={() => router.push(`/billing/${inv.id}`)}
                          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800 flex items-center justify-between text-xs cursor-pointer transition-all shadow-2xs hover:shadow-xs"
                        >
                          <div>
                            <span className="font-bold font-mono text-blue-600 dark:text-blue-400 hover:underline">
                              {inv.invoiceNumber}
                            </span>
                            <p className="text-slate-500 text-[11px]">Due Date: {formatDate(inv.dueDate)}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {formatCurrency(inv.totalAmount, inv.currency)}
                            </span>
                            <StatusBadge status={inv.status} size="sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ),
          },
          {
            id: "history_communication",
            label: "Communication & Release History",
            icon: <Clock className="h-4 w-4" />,
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Customer Communication Log & Operational History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-xs">
                    <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/60 dark:bg-blue-950/30 dark:border-blue-900/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-blue-600" />
                          Email Communication: Storage Requirements Confirmation
                        </span>
                        <span className="text-[10px] text-blue-700 dark:text-blue-300">2026-01-14 10:15 AM</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                        Customer confirmed required storage space of 1,200 SQ.FT climate-controlled rack capacity starting 2026-01-15 for 12 months.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/60 dark:bg-purple-950/30 dark:border-purple-900/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-purple-600" />
                          Phone Log: Delivery Schedule Coordination
                        </span>
                        <span className="text-[10px] text-purple-700 dark:text-purple-300">2026-01-15 09:00 AM</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                        Coordinated package intake and pallet rack loading schedule with site logistics manager Mohammed Al-Habtoor.
                      </p>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                      <div className="h-2 w-2 rounded-full bg-moveit-orange mt-1.5 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">Customer Profile Registered</p>
                        <p className="text-slate-500">Account registered in MoveIt Storage Operations Management System.</p>
                        <span className="text-[10px] text-slate-400">{formatDateTime(customer.createdAt)}</span>
                      </div>
                    </div>

                    {customer.updatedAt && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">Customer Operational Audit Event</p>
                          <p className="text-slate-500">Contact details, service notes, and storage requirements updated.</p>
                          <span className="text-[10px] text-slate-400">{formatDateTime(customer.updatedAt)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ),
          },
        ])}
      />

      {/* Edit Customer Modal */}
      <CustomerFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdate}
        initialData={customer}
        isLoading={isSubmitting}
      />
    </div>
  );
}
