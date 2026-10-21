"use client";

import { useCan } from "@/lib/use-can";
import * as React from "react";
import { useRouter } from "next/navigation";
import { services } from "@/services";
import { Customer } from "@/types";
import { CustomerSummary } from "@/services/interfaces/ICustomerService";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { CustomerFormModal } from "@/components/modules/customers/customer-form-modal";
import { CustomerFormValues } from "@/lib/validators/customer";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { Plus, Users, Building2, User, CheckCircle2, Layers, Eye, Edit3 } from "lucide-react";

export default function CustomersPage() {
  const can = useCan();
  const router = useRouter();

  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [summary, setSummary] = React.useState<CustomerSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [cityFilter, setCityFilter] = React.useState<string>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [list, summaryData] = await Promise.all([
        services.customerService.getCustomers(),
        services.customerService.getCustomerSummary(),
      ]);
      setCustomers(list);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customer directory.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    Promise.all([
      services.customerService.getCustomers(),
      services.customerService.getCustomerSummary(),
    ])
      .then(([list, summaryData]) => {
        if (!active) return;
        setCustomers(list);
        setSummary(summaryData);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load customer directory.");
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Unique cities list for filter
  const uniqueCities = React.useMemo(() => {
    const cities = Array.from(new Set(customers.map((c) => c.city).filter(Boolean)));
    return cities.sort();
  }, [customers]);

  // Filtered customers
  const filteredCustomers = React.useMemo(() => {
    return customers.filter((c) => {
      const matchesType = typeFilter === "ALL" || c.type === typeFilter;
      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      const matchesCity = cityFilter === "ALL" || c.city === cityFilter;
      return matchesType && matchesStatus && matchesCity;
    });
  }, [customers, typeFilter, statusFilter, cityFilter]);

  const handleCreateOrUpdate = async (values: CustomerFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        await services.customerService.updateCustomer(editingCustomer.id, values);
      } else {
        await services.customerService.createCustomer(values);
      }
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Operation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<Customer>[] = [
    {
      key: "code",
      header: "Customer Code",
      sortable: true,
      cell: (c) => (
        <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
          {c.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Customer / Company Name",
      sortable: true,
      cell: (c) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-bold shrink-0">
            {c.type === "CORPORATE" ? (
              <Building2 className="h-4 w-4 text-blue-600" />
            ) : (
              <User className="h-4 w-4 text-purple-600" />
            )}
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 transition-colors">
              {c.name}
            </div>
            {c.companyName && c.companyName !== c.name && (
              <span className="text-[11px] text-slate-400">{c.companyName}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Entity Type",
      sortable: true,
      cell: (c) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            c.type === "CORPORATE"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
              : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
          }`}
        >
          {c.type}
        </span>
      ),
    },
    {
      key: "email",
      header: "Contact Info",
      sortable: true,
      cell: (c) => (
        <div className="text-xs">
          <div className="font-medium text-slate-800 dark:text-slate-200">{c.email}</div>
          <span className="text-slate-400 text-[11px]">{c.phone}</span>
        </div>
      ),
    },
    {
      key: "city",
      header: "City",
      sortable: true,
      cell: (c) => <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{c.city}</span>,
    },
    {
      key: "activeAllocationsCount",
      header: "Active Storage",
      sortable: true,
      cell: (c) => (
        <div className="text-xs font-semibold">
          {c.activeAllocationsCount > 0 ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" />
              {c.activeAllocationsCount} Allocations ({c.totalOccupiedSqFt} SQ.FT)
            </span>
          ) : (
            <span className="text-slate-400 font-normal">No active storage</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (c) => (
        <StatusBadge
          status={c.status === "ACTIVE" ? "VALID" : "EXPIRED"}
        />
      ),
    },
    {
      key: "createdAt",
      header: "Joined Date",
      sortable: true,
      cell: (c) => <span className="text-xs text-slate-500">{formatDate(c.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (c) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/customers/${c.id}`);
            }}
            className="h-8 px-2 text-blue-600 hover:text-blue-700"
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setEditingCustomer(c);
              setIsModalOpen(true);
            }}
            className="h-8 px-2 text-slate-600 hover:text-slate-900"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <LoadingState message="Loading MoveIt storage customer directory..." className="py-24" />;
  }

  if (error || !summary) {
    return <ErrorState message={error || "Failed to load customers."} onRetry={loadData} className="my-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Customer Directory"
        description="Manage MoveIt storage customers, corporate entities, and linked operational records."
        breadcrumbs={[{ label: "Customers", isCurrent: true }]}
        actions={
          can("CUSTOMERS", "CREATE") && (
<Button
            variant="primary"
            size="md"
            onClick={() => {
              setEditingCustomer(null);
              setIsModalOpen(true);
            }}
            className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Plus className="h-4 w-4" />
            <span>Add Customer</span>
          </Button>
)
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Customers"
          value={summary.totalCustomers}
          subtitle="Registered accounts"
          icon={<Users className="h-5 w-5 text-blue-600" />}
        />
        <MetricCard
          title="Active Accounts"
          value={summary.activeCustomers}
          subtitle="In good standing"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          badgeText="Active"
          badgeVariant="success"
        />
        <MetricCard
          title="Corporate Entities"
          value={summary.corporateCustomers}
          subtitle="Business contracts"
          icon={<Building2 className="h-5 w-5 text-purple-600" />}
        />
        <MetricCard
          title="Individual Accounts"
          value={summary.individualCustomers}
          subtitle="Personal storage"
          icon={<User className="h-5 w-5 text-amber-600" />}
        />
        <MetricCard
          title="Active Storage"
          value={summary.customersWithActiveStorage}
          subtitle="Occupying space"
          icon={<Layers className="h-5 w-5 text-emerald-600" />}
          badgeText="Stored"
          badgeVariant="info"
        />
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-44">
            <Select
              label="Entity Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Types" },
                { value: "CORPORATE", label: "Corporate" },
                { value: "INDIVIDUAL", label: "Individual" },
              ]}
            />
          </div>

          <div className="w-full sm:w-44">
            <Select
              label="Account Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Statuses" },
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
              ]}
            />
          </div>

          <div className="w-full sm:w-44">
            <Select
              label="City"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Cities" },
                ...uniqueCities.map((c) => ({ value: c, label: c })),
              ]}
            />
          </div>
        </div>

        <span className="text-xs font-semibold text-slate-500">
          Showing {filteredCustomers.length} of {customers.length} records
        </span>
      </div>

      {/* Customer DataTable */}
      <DataTable
        data={filteredCustomers}
        columns={columns}
        keyExtractor={(c) => c.id}
        searchPlaceholder="Search customer code, name, company, email, or phone..."
        searchableKey={(c) => `${c.code} ${c.name} ${c.companyName || ""} ${c.email} ${c.phone}`}
        onRowClick={(c) => router.push(`/customers/${c.id}`)}
      />

      {/* Create / Edit Customer Modal */}
      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateOrUpdate}
        initialData={editingCustomer}
        isLoading={isSubmitting}
      />
    </div>
  );
}
