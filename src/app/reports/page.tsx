"use client";

import * as React from "react";
import { services } from "@/services";
import { 
  Customer, 
  Warehouse, 
  StorageAllocation, 
  InventoryRecord, 
  MovementRecord, 
  CustomerDocument, 
  StorageContract, 
  StorageInvoice 
} from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatSqFt, formatCurrency, formatDate } from "@/lib/utils";
import { 
  Download, 
  Search, 
  Filter, 
  RefreshCw, 
  BarChart3, 
  Users, 
  Warehouse as WarehouseIcon, 
  Layers, 
  Package, 
  ArrowLeftRight, 
  FileCheck2, 
  Receipt,
  FileText
} from "lucide-react";

type ReportType = 
  | "CUSTOMERS" 
  | "WAREHOUSES" 
  | "ALLOCATIONS" 
  | "INVENTORY" 
  | "MOVEMENTS" 
  | "DOCUMENTS" 
  | "CONTRACTS" 
  | "BILLING";

function exportToCSV(filename: string, headers: string[], rows: (string | number | boolean | undefined | null)[][]) {
  const escapeCell = (cell: unknown) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function OperationalReportsPage() {
  const [activeTab, setActiveTab] = React.useState<ReportType>("CUSTOMERS");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Raw service data
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [allocations, setAllocations] = React.useState<StorageAllocation[]>([]);
  const [inventory, setInventory] = React.useState<InventoryRecord[]>([]);
  const [movements, setMovements] = React.useState<MovementRecord[]>([]);
  const [documents, setDocuments] = React.useState<CustomerDocument[]>([]);
  const [contracts, setContracts] = React.useState<StorageContract[]>([]);
  const [invoices, setInvoices] = React.useState<StorageInvoice[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = React.useState<string>("ALL");
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("ALL");

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        custData,
        whData,
        allocData,
        invData,
        movData,
        docData,
        cntData,
        invcData,
      ] = await Promise.all([
        services.customerService.getCustomers(),
        services.warehouseService.getWarehouses(),
        services.allocationService.getAllocations(),
        services.inventoryService.getInventoryRecords(),
        services.movementService.getMovements(),
        services.documentService.getDocuments(),
        services.contractService.getContracts(),
        services.billingService.getInvoices(),
      ]);

      setCustomers(custData);
      setWarehouses(whData);
      setAllocations(allocData);
      setInventory(invData);
      setMovements(movData);
      setDocuments(docData);
      setContracts(cntData);
      setInvoices(invcData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load operational reporting data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    Promise.all([
      services.customerService.getCustomers(),
      services.warehouseService.getWarehouses(),
      services.allocationService.getAllocations(),
      services.inventoryService.getInventoryRecords(),
      services.movementService.getMovements(),
      services.documentService.getDocuments(),
      services.contractService.getContracts(),
      services.billingService.getInvoices(),
    ]).then(([custData, whData, allocData, invData, movData, docData, cntData, invcData]) => {
      if (!active) return;
      setCustomers(custData);
      setWarehouses(whData);
      setAllocations(allocData);
      setInventory(invData);
      setMovements(movData);
      setDocuments(docData);
      setContracts(cntData);
      setInvoices(invcData);
      setIsLoading(false);
    }).catch((err) => {
      if (!active) return;
      setError(err instanceof Error ? err.message : "Failed to load operational reporting data.");
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  // CSV Export Handler
  const handleExportCSV = () => {
    const timestamp = new Date().toISOString().split("T")[0];
    const q = searchQuery.toLowerCase();

    if (activeTab === "CUSTOMERS") {
      let filtered = customers;
      if (selectedStatus !== "ALL") filtered = filtered.filter((c) => c.status === selectedStatus);
      if (q) filtered = filtered.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
      const headers = ["Customer Code", "Customer Name", "Type", "Status", "Allocated SqFt", "Duration Months", "Start Date"];
      const rows = filtered.map((c) => [c.code, c.name, c.type, c.status, c.requiredSqFt || 0, c.storageDurationMonths || 0, c.storageStartDate || "N/A"]);
      exportToCSV(`moveit_customers_report_${timestamp}.csv`, headers, rows);
    } else if (activeTab === "WAREHOUSES") {
      let filtered = warehouses;
      if (selectedWarehouseId !== "ALL") filtered = filtered.filter((w) => w.id === selectedWarehouseId);
      if (q) filtered = filtered.filter((w) => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q));
      const headers = ["Warehouse Code", "Facility Name", "City", "Total SqFt", "Occupied SqFt", "Reserved SqFt", "Available SqFt", "Occupancy %", "Status"];
      const rows = filtered.map((w) => [
        w.code, 
        w.name, 
        w.city, 
        w.totalCapacitySqFt, 
        w.occupiedSqFt, 
        w.reservedSqFt, 
        w.availableSqFt, 
        `${(((w.occupiedSqFt + w.reservedSqFt) / w.totalCapacitySqFt) * 100).toFixed(1)}%`,
        w.status
      ]);
      exportToCSV(`moveit_warehouses_capacity_report_${timestamp}.csv`, headers, rows);
    } else if (activeTab === "ALLOCATIONS") {
      let filtered = allocations;
      if (selectedWarehouseId !== "ALL") filtered = filtered.filter((a) => a.warehouseId === selectedWarehouseId);
      if (selectedCustomerId !== "ALL") filtered = filtered.filter((a) => a.customerId === selectedCustomerId);
      if (selectedStatus !== "ALL") filtered = filtered.filter((a) => a.status === selectedStatus);
      if (q) filtered = filtered.filter((a) => a.allocationCode.toLowerCase().includes(q) || a.customerName.toLowerCase().includes(q));
      const headers = ["Allocation Code", "Customer Name", "Warehouse", "Location Path", "Storage Type", "Capacity SqFt", "Status", "AI Recommended", "Start Date", "Expected End"];
      const rows = filtered.map((a) => [a.allocationCode, a.customerName, a.warehouseName, a.locationPath, a.storageType, a.allocatedCapacity, a.status, a.aiRecommended ? "YES" : "NO", a.startDate, a.expectedEndDate]);
      exportToCSV(`moveit_allocations_report_${timestamp}.csv`, headers, rows);
    } else if (activeTab === "INVENTORY") {
      let filtered = inventory;
      if (selectedWarehouseId !== "ALL") filtered = filtered.filter((i) => i.warehouseId === selectedWarehouseId);
      if (selectedCustomerId !== "ALL") filtered = filtered.filter((i) => i.customerId === selectedCustomerId);
      if (selectedStatus !== "ALL") filtered = filtered.filter((i) => i.status === selectedStatus);
      if (q) filtered = filtered.filter((i) => i.inventoryCode.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
      const headers = ["Inventory Code", "Package ID", "Customer Name", "Warehouse", "Location Path", "Package Type", "Item Count", "SqFt Footprint", "Status"];
      const rows = filtered.map((i) => [i.inventoryCode, i.packageId, i.customerName, i.warehouseName, i.locationPath, i.packageType, i.itemCount, i.capacityFootprintSqFt, i.status]);
      exportToCSV(`moveit_inventory_packages_report_${timestamp}.csv`, headers, rows);
    } else if (activeTab === "MOVEMENTS") {
      let filtered = movements;
      if (selectedWarehouseId !== "ALL") filtered = filtered.filter((m) => m.fromWarehouseId === selectedWarehouseId || m.toWarehouseId === selectedWarehouseId);
      if (selectedCustomerId !== "ALL") filtered = filtered.filter((m) => m.customerId === selectedCustomerId);
      if (selectedStatus !== "ALL") filtered = filtered.filter((m) => m.status === selectedStatus);
      if (q) filtered = filtered.filter((m) => m.movementCode.toLowerCase().includes(q) || m.packageCode.toLowerCase().includes(q) || m.reason.toLowerCase().includes(q));
      const headers = ["Movement Code", "Package Code", "Customer Name", "Movement Type", "Quantity", "From Location", "To Location", "Performed By", "Status", "Timestamp"];
      const rows = filtered.map((m) => [m.movementCode, m.packageCode, m.customerName, m.movementType, m.quantity, m.fromLocationPath || "N/A", m.toLocationPath || "N/A", m.performedBy, m.status, m.timestamp]);
      exportToCSV(`moveit_movements_report_${timestamp}.csv`, headers, rows);
    } else if (activeTab === "DOCUMENTS") {
      let filtered = documents;
      if (selectedCustomerId !== "ALL") filtered = filtered.filter((d) => d.customerId === selectedCustomerId);
      if (selectedStatus !== "ALL") filtered = filtered.filter((d) => d.status === selectedStatus);
      if (q) filtered = filtered.filter((d) => d.title.toLowerCase().includes(q) || d.customerName.toLowerCase().includes(q));
      const headers = ["Document Title", "Document Type", "Customer Name", "Expiry Date", "Days Remaining", "Status"];
      const rows = filtered.map((d) => [d.title, d.documentType, d.customerName, d.expiryDate || "N/A", d.daysUntilExpiry ?? "N/A", d.status]);
      exportToCSV(`moveit_compliance_documents_report_${timestamp}.csv`, headers, rows);
    } else if (activeTab === "CONTRACTS") {
      let filtered = contracts;
      if (selectedCustomerId !== "ALL") filtered = filtered.filter((c) => c.customerId === selectedCustomerId);
      if (selectedStatus !== "ALL") filtered = filtered.filter((c) => c.status === selectedStatus);
      if (q) filtered = filtered.filter((c) => c.contractCode.toLowerCase().includes(q) || c.customerName.toLowerCase().includes(q));
      const headers = ["Contract Code", "Customer Name", "Contract Type", "Monthly Rate (AED)", "Start Date", "End Date", "Days Remaining", "Status"];
      const rows = filtered.map((c) => [c.contractCode, c.customerName, c.contractType, c.monthlyRate, c.startDate, c.endDate, c.daysUntilExpiry ?? "N/A", c.status]);
      exportToCSV(`moveit_contracts_report_${timestamp}.csv`, headers, rows);
    } else if (activeTab === "BILLING") {
      let filtered = invoices;
      if (selectedCustomerId !== "ALL") filtered = filtered.filter((inv) => inv.customerId === selectedCustomerId);
      if (selectedStatus !== "ALL") filtered = filtered.filter((inv) => inv.status === selectedStatus);
      if (q) filtered = filtered.filter((inv) => inv.invoiceNumber.toLowerCase().includes(q) || inv.customerName.toLowerCase().includes(q));
      const headers = ["Invoice Number", "Customer Name", "Billing Period", "Total Amount (AED)", "Amount Paid (AED)", "Balance Due (AED)", "Status", "Portal Sync"];
      const rows = filtered.map((inv) => [inv.invoiceNumber, inv.customerName, `${inv.billingPeriodStart} to ${inv.billingPeriodEnd}`, inv.totalAmount, inv.amountPaid, inv.balanceDue, inv.status, inv.portalSyncStatus || "PENDING"]);
      exportToCSV(`moveit_billing_reconciliation_report_${timestamp}.csv`, headers, rows);
    }
  };

  if (isLoading) {
    return <LoadingState message="Fetching operational storage reports..." className="py-24" />;
  }

  if (error) {
    return <ErrorState title="Reporting Error" message={error} onRetry={loadData} className="my-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Operational Storage Reports"
        description="Comprehensive storage reporting across customer allocations, warehouse utilization, inventory movements, compliance, and billing reconciliation."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportCSV}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </Button>
          </div>
        }
      />

      {/* Report Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: "CUSTOMERS", label: "Customer Records", icon: Users, count: customers.length },
          { id: "WAREHOUSES", label: "Warehouse Capacity", icon: WarehouseIcon, count: warehouses.length },
          { id: "ALLOCATIONS", label: "Storage Allocations", icon: Layers, count: allocations.length },
          { id: "INVENTORY", label: "Inventory & Packages", icon: Package, count: inventory.length },
          { id: "MOVEMENTS", label: "Inventory Movements", icon: ArrowLeftRight, count: movements.length },
          { id: "DOCUMENTS", label: "Compliance Docs", icon: FileText, count: documents.length },
          { id: "CONTRACTS", label: "Contracts & Leases", icon: FileCheck2, count: contracts.length },
          { id: "BILLING", label: "Billing & Invoices", icon: Receipt, count: invoices.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as ReportType);
                setSelectedStatus("ALL");
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-moveit-orange text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                isActive ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter Controls Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        {/* Search Query */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search report records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        {/* Warehouse Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="w-full h-9 rounded-lg border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800 text-xs px-2.5 font-medium text-slate-900 dark:text-white"
          >
            <option value="ALL">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        {/* Customer Filter */}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full h-9 rounded-lg border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800 text-xs px-2.5 font-medium text-slate-900 dark:text-white"
          >
            <option value="ALL">All Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full h-9 rounded-lg border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800 text-xs px-2.5 font-medium text-slate-900 dark:text-white"
          >
            <option value="ALL">All Statuses</option>
            {activeTab === "CUSTOMERS" && (
              <>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </>
            )}
            {activeTab === "WAREHOUSES" && (
              <>
                <option value="ACTIVE">ACTIVE</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </>
            )}
            {activeTab === "ALLOCATIONS" && (
              <>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="RECOMMENDED">RECOMMENDED</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="RELEASED">RELEASED</option>
              </>
            )}
            {activeTab === "INVENTORY" && (
              <>
                <option value="STORED">STORED</option>
                <option value="RECEIVED">RECEIVED</option>
                <option value="MOVED">MOVED</option>
                <option value="RELEASED">RELEASED</option>
              </>
            )}
            {activeTab === "MOVEMENTS" && (
              <>
                <option value="COMPLETED">COMPLETED</option>
                <option value="PENDING">PENDING</option>
              </>
            )}
            {activeTab === "DOCUMENTS" && (
              <>
                <option value="ACTIVE">ACTIVE</option>
                <option value="EXPIRING_SOON">EXPIRING_SOON</option>
                <option value="EXPIRED">EXPIRED</option>
              </>
            )}
            {activeTab === "CONTRACTS" && (
              <>
                <option value="ACTIVE">ACTIVE</option>
                <option value="EXPIRING_SOON">EXPIRING_SOON</option>
                <option value="EXPIRED">EXPIRED</option>
              </>
            )}
            {activeTab === "BILLING" && (
              <>
                <option value="PAID">PAID</option>
                <option value="OVERDUE">OVERDUE</option>
                <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
                <option value="ISSUED">ISSUED</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* REPORT CONTENT TABLES */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-xs">
        {/* Tab 1: Customers */}
        {activeTab === "CUSTOMERS" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Customer Code</th>
                  <th className="px-4 py-3">Customer Name</th>
                  <th className="px-4 py-3">Customer Type</th>
                  <th className="px-4 py-3">Required SqFt</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Start Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customers
                  .filter((c) => (selectedStatus === "ALL" || c.status === selectedStatus))
                  .filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.code.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-mono font-semibold text-blue-600">{c.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{c.name}</td>
                      <td className="px-4 py-3 text-slate-500">{c.type}</td>
                      <td className="px-4 py-3 font-semibold">{formatSqFt(c.requiredSqFt || 0)}</td>
                      <td className="px-4 py-3">{c.storageDurationMonths ? `${c.storageDurationMonths} months` : "N/A"}</td>
                      <td className="px-4 py-3">{c.storageStartDate ? formatDate(c.storageStartDate) : "N/A"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={c.status === "ACTIVE" ? "success" : "secondary"}>
                          {c.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Warehouses */}
        {activeTab === "WAREHOUSES" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Warehouse Name</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Total Capacity</th>
                  <th className="px-4 py-3">Occupied</th>
                  <th className="px-4 py-3">Reserved</th>
                  <th className="px-4 py-3">Available</th>
                  <th className="px-4 py-3">Utilization</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {warehouses
                  .filter((w) => (selectedWarehouseId === "ALL" || w.id === selectedWarehouseId))
                  .filter((w) => !searchQuery || w.name.toLowerCase().includes(searchQuery.toLowerCase()) || w.code.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((w) => {
                    const util = (((w.occupiedSqFt + w.reservedSqFt) / w.totalCapacitySqFt) * 100).toFixed(1);
                    return (
                      <tr key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-mono font-semibold text-purple-600">{w.code}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{w.name}</td>
                        <td className="px-4 py-3 text-slate-500">{w.city}</td>
                        <td className="px-4 py-3 font-semibold">{formatSqFt(w.totalCapacitySqFt)}</td>
                        <td className="px-4 py-3 text-rose-600 font-semibold">{formatSqFt(w.occupiedSqFt)}</td>
                        <td className="px-4 py-3 text-blue-600 font-semibold">{formatSqFt(w.reservedSqFt)}</td>
                        <td className="px-4 py-3 text-emerald-600 font-semibold">{formatSqFt(w.availableSqFt)}</td>
                        <td className="px-4 py-3 font-bold">{util}%</td>
                        <td className="px-4 py-3">
                          <Badge variant={w.status === "ACTIVE" ? "success" : "warning"}>
                            {w.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Allocations */}
        {activeTab === "ALLOCATIONS" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Warehouse</th>
                  <th className="px-4 py-3">Location Path</th>
                  <th className="px-4 py-3">Storage Type</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3">AI Recom.</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allocations
                  .filter((a) => (selectedWarehouseId === "ALL" || a.warehouseId === selectedWarehouseId))
                  .filter((a) => (selectedCustomerId === "ALL" || a.customerId === selectedCustomerId))
                  .filter((a) => (selectedStatus === "ALL" || a.status === selectedStatus))
                  .filter((a) => !searchQuery || a.allocationCode.toLowerCase().includes(searchQuery.toLowerCase()) || a.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-mono font-semibold text-indigo-600">{a.allocationCode}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{a.customerName}</td>
                      <td className="px-4 py-3 text-slate-500">{a.warehouseName}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-[11px] truncate max-w-[200px]">{a.locationPath}</td>
                      <td className="px-4 py-3">{a.storageType}</td>
                      <td className="px-4 py-3 font-semibold">{formatSqFt(a.allocatedCapacity)}</td>
                      <td className="px-4 py-3">
                        {a.aiRecommended ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                            ✨ Yes ({a.recommendationScore}%)
                          </span>
                        ) : (
                          <span className="text-slate-400">Manual</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={a.status === "CONFIRMED" || a.status === "ACTIVE" ? "success" : a.status === "RECOMMENDED" ? "warning" : "secondary"}>
                          {a.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Inventory */}
        {activeTab === "INVENTORY" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Package ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Footprint</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {inventory
                  .filter((i) => (selectedWarehouseId === "ALL" || i.warehouseId === selectedWarehouseId))
                  .filter((i) => (selectedCustomerId === "ALL" || i.customerId === selectedCustomerId))
                  .filter((i) => (selectedStatus === "ALL" || i.status === selectedStatus))
                  .filter((i) => !searchQuery || i.inventoryCode.toLowerCase().includes(searchQuery.toLowerCase()) || i.description.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((i) => (
                    <tr key={i.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-mono font-semibold text-blue-600">{i.inventoryCode}</td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{i.packageId}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{i.customerName}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 truncate max-w-[200px]">{i.description}</td>
                      <td className="px-4 py-3">{i.packageType}</td>
                      <td className="px-4 py-3 font-semibold">{i.itemCount}</td>
                      <td className="px-4 py-3 font-semibold">{formatSqFt(i.capacityFootprintSqFt)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={i.status === "STORED" ? "success" : i.status === "MOVED" ? "info" : "secondary"}>
                          {i.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Movements */}
        {activeTab === "MOVEMENTS" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Movement Code</th>
                  <th className="px-4 py-3">Package Code</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">From Location</th>
                  <th className="px-4 py-3">To Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {movements
                  .filter((m) => (selectedWarehouseId === "ALL" || m.fromWarehouseId === selectedWarehouseId || m.toWarehouseId === selectedWarehouseId))
                  .filter((m) => (selectedCustomerId === "ALL" || m.customerId === selectedCustomerId))
                  .filter((m) => (selectedStatus === "ALL" || m.status === selectedStatus))
                  .filter((m) => !searchQuery || m.movementCode.toLowerCase().includes(searchQuery.toLowerCase()) || m.packageCode.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-mono font-semibold text-amber-600">{m.movementCode}</td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{m.packageCode}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{m.customerName}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{m.movementType}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold">{m.quantity}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px] truncate max-w-[150px]">{m.fromLocationPath || "N/A"}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px] truncate max-w-[150px]">{m.toLocationPath || "N/A"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={m.status === "COMPLETED" ? "success" : "warning"}>
                          {m.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(m.timestamp)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 6: Documents */}
        {activeTab === "DOCUMENTS" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Document Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3">Days Remaining</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {documents
                  .filter((d) => (selectedCustomerId === "ALL" || d.customerId === selectedCustomerId))
                  .filter((d) => (selectedStatus === "ALL" || d.status === selectedStatus))
                  .filter((d) => !searchQuery || d.title.toLowerCase().includes(searchQuery.toLowerCase()) || d.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{d.title}</td>
                      <td className="px-4 py-3 text-slate-500">{d.documentType}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{d.customerName}</td>
                      <td className="px-4 py-3">{d.expiryDate ? formatDate(d.expiryDate) : "N/A"}</td>
                      <td className="px-4 py-3 font-semibold">{d.daysUntilExpiry ?? "N/A"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={d.status === "APPROVED" || d.status === "UPLOADED" ? "success" : d.status === "EXPIRING_SOON" ? "warning" : "danger"}>
                          {d.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 7: Contracts */}
        {activeTab === "CONTRACTS" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Contract Code</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Contract Type</th>
                  <th className="px-4 py-3">Monthly Rate</th>
                  <th className="px-4 py-3">Start Date</th>
                  <th className="px-4 py-3">End Date</th>
                  <th className="px-4 py-3">Days Left</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {contracts
                  .filter((c) => (selectedCustomerId === "ALL" || c.customerId === selectedCustomerId))
                  .filter((c) => (selectedStatus === "ALL" || c.status === selectedStatus))
                  .filter((c) => !searchQuery || c.contractCode.toLowerCase().includes(searchQuery.toLowerCase()) || c.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-mono font-semibold text-blue-600">{c.contractCode}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{c.customerName}</td>
                      <td className="px-4 py-3 text-slate-500">{c.contractType}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(c.monthlyRate)}</td>
                      <td className="px-4 py-3">{formatDate(c.startDate)}</td>
                      <td className="px-4 py-3">{formatDate(c.endDate)}</td>
                      <td className="px-4 py-3 font-semibold">{c.daysUntilExpiry ?? "N/A"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={c.status === "ACTIVE" ? "success" : c.status === "EXPIRING_SOON" ? "warning" : "danger"}>
                          {c.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 8: Billing */}
        {activeTab === "BILLING" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Billing Period</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Amount Paid</th>
                  <th className="px-4 py-3">Balance Due</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Portal Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices
                  .filter((inv) => (selectedCustomerId === "ALL" || inv.customerId === selectedCustomerId))
                  .filter((inv) => (selectedStatus === "ALL" || inv.status === selectedStatus))
                  .filter((inv) => !searchQuery || inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-mono font-semibold text-emerald-600">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{inv.customerName}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(inv.billingPeriodStart)} - {formatDate(inv.billingPeriodEnd)}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(inv.totalAmount)}</td>
                      <td className="px-4 py-3 text-emerald-600">{formatCurrency(inv.amountPaid)}</td>
                      <td className="px-4 py-3 text-rose-600 font-bold">{formatCurrency(inv.balanceDue)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={inv.status === "PAID" ? "success" : inv.status === "OVERDUE" ? "danger" : "warning"}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={inv.portalSyncStatus === "SYNCED" ? "success" : "secondary"}>
                          {inv.portalSyncStatus || "PENDING"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
