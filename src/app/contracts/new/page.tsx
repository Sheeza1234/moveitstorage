"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contractFormSchema, ContractFormValues } from "@/lib/validators/contract";
import { services } from "@/services";
import { Customer, StorageAllocation, ContractType, RateUnit, BillingFrequency } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { ArrowLeft, Check, FileText, Building2, Layers, DollarSign, Calendar, Info } from "lucide-react";

const CONTRACT_TYPE_OPTIONS = [
  { value: "CORPORATE_STORAGE", label: "Corporate Storage Agreement" },
  { value: "LONG_TERM_STORAGE", label: "Long-Term Storage (12+ Months)" },
  { value: "SHORT_TERM_STORAGE", label: "Short-Term Storage (< 12 Months)" },
  { value: "STORAGE", label: "Standard Storage Agreement" },
];

const RATE_UNIT_OPTIONS = [
  { value: "MONTH", label: "per Month (Fixed)" },
  { value: "SQ_FT", label: "per SQ FT / Month" },
  { value: "CU_FT", label: "per CU FT / Month" },
  { value: "FLAT", label: "Flat Fee (Term)" },
];

const BILLING_FREQ_OPTIONS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUALLY", label: "Annually" },
  { value: "ONE_TIME", label: "One-Time Advance" },
];

export default function NewContractPage() {
  const router = useRouter();

  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [allocations, setAllocations] = React.useState<StorageAllocation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContractFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(contractFormSchema) as any,
    defaultValues: {
      customerId: "",
      contractType: "CORPORATE_STORAGE",
      allocationIds: [],
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      storageRate: 5000,
      rateUnit: "MONTH",
      billingFrequency: "MONTHLY",
      currency: "AED",
      depositAmount: 10000,
      notes: "",
    },
  });

  const selectedCustomerId = watch("customerId");
  const selectedAllocationIds = watch("allocationIds") || [];

  React.useEffect(() => {
    let active = true;
    Promise.all([
      services.customerService.getCustomers(),
      services.allocationService.getAllocations().catch(() => []),
    ])
      .then(([custList, allocList]) => {
        if (!active) return;
        setCustomers(custList.filter((c) => c.status === "ACTIVE"));
        setAllocations(allocList);
        if (custList.length > 0) {
          setValue("customerId", custList[0].id);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load directory resources.");
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [setValue]);

  // Filter allocations belonging to selected customer
  const customerAllocations = React.useMemo(() => {
    if (!selectedCustomerId) return [];
    return allocations.filter((a) => a.customerId === selectedCustomerId && a.status === "ACTIVE");
  }, [allocations, selectedCustomerId]);

  // Auto select customer's first allocation if available
  React.useEffect(() => {
    if (customerAllocations.length > 0) {
      setValue("allocationIds", [customerAllocations[0].id], { shouldValidate: true });
    } else {
      setValue("allocationIds", [], { shouldValidate: true });
    }
  }, [selectedCustomerId, customerAllocations, setValue]);

  const handleToggleAllocation = (allocId: string) => {
    const current = selectedAllocationIds;
    if (current.includes(allocId)) {
      setValue(
        "allocationIds",
        current.filter((id) => id !== allocId),
        { shouldValidate: true }
      );
    } else {
      setValue("allocationIds", [...current, allocId], { shouldValidate: true });
    }
  };

  const handleFormSubmit = async (values: ContractFormValues) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const created = await services.contractService.createContract(values);
      router.push(`/contracts/${created.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create storage contract.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const customerOptions = React.useMemo(() => {
    const opts = [{ value: "", label: "Choose Customer..." }];
    customers.forEach((c) => opts.push({ value: c.id, label: `${c.name} (${c.code} — ${c.type})` }));
    return opts;
  }, [customers]);

  if (isLoading) {
    return <LoadingState message="Loading customers and storage allocations..." className="py-24" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to Initialize Contract Form"
        message={error}
        onRetry={() => router.refresh()}
        className="my-12"
      />
    );
  }

  return (
    <PermissionGuard module="CONTRACTS" action="CREATE">
      <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Create New Storage Contract"
        description="Register a new legal storage agreement, commercial pricing basis, terms, and linked storage allocations."
        breadcrumbs={[
          { label: "Contracts", href: "/contracts" },
          { label: "New Contract", isCurrent: true },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/contracts")}
            className="gap-1.5 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Cancel</span>
          </Button>
        }
      />

      {submitError && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs">
          <p className="font-semibold text-sm">Validation or Processing Error</p>
          <p className="mt-0.5">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 text-xs">
        {/* Step 1: Customer & Contract Classification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-blue-600" />
              1. Customer & Agreement Classification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Selection */}
              <div className="space-y-1">
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Select Customer <span className="text-rose-500">*</span>
                </label>
                <Select
                  options={customerOptions}
                  value={selectedCustomerId}
                  onChange={(e) => setValue("customerId", e.target.value, { shouldValidate: true })}
                  error={errors.customerId?.message}
                />
              </div>

              {/* Contract Type */}
              <div className="space-y-1">
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Contract Type <span className="text-rose-500">*</span>
                </label>
                <Select
                  options={CONTRACT_TYPE_OPTIONS}
                  value={watch("contractType")}
                  onChange={(e) =>
                    setValue("contractType", e.target.value as ContractType, { shouldValidate: true })
                  }
                  error={errors.contractType?.message}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Storage Allocations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-purple-600" />
              2. Linked Storage Allocations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-slate-600 dark:text-slate-400 text-xs">
              Select active storage allocations reserved for this customer that are governed under this contract.
            </p>

            {customerAllocations.length === 0 ? (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 text-xs flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  No active allocations found for this customer. You may proceed and link allocations later.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {customerAllocations.map((alloc) => {
                  const isChecked = selectedAllocationIds.includes(alloc.id);
                  return (
                    <div
                      key={alloc.id}
                      onClick={() => handleToggleAllocation(alloc.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                        isChecked
                          ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded border mt-0.5 flex items-center justify-center shrink-0 ${
                          isChecked
                            ? "bg-moveit-orange border-moveit-orange text-white"
                            : "border-slate-300 dark:border-slate-700"
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 font-mono text-xs">
                          {alloc.allocationCode}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {alloc.warehouseName} • {alloc.allocatedCapacity} SQ FT ({alloc.status})
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {errors.allocationIds && (
              <p className="text-[11px] text-rose-600">{errors.allocationIds.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Contract Term & Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-emerald-600" />
              3. Contract Term & Duration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <Input type="date" {...register("startDate")} />
                {errors.startDate && (
                  <p className="text-[11px] text-rose-600">{errors.startDate.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  End Date <span className="text-rose-500">*</span>
                </label>
                <Input type="date" {...register("endDate")} />
                {errors.endDate && (
                  <p className="text-[11px] text-rose-600">{errors.endDate.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 4: Commercial Terms & Pricing Basis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-amber-600" />
              4. Commercial Terms & Pricing Basis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Storage Rate */}
              <div className="space-y-1 sm:col-span-2">
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Storage Rate Amount <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  {...register("storageRate", { valueAsNumber: true })}
                  placeholder="5000"
                />
                {errors.storageRate && (
                  <p className="text-[11px] text-rose-600">{errors.storageRate.message}</p>
                )}
              </div>

              {/* Rate Unit */}
              <div className="space-y-1">
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Rate Unit <span className="text-rose-500">*</span>
                </label>
                <Select
                  options={RATE_UNIT_OPTIONS}
                  value={watch("rateUnit")}
                  onChange={(e) =>
                    setValue("rateUnit", e.target.value as RateUnit, { shouldValidate: true })
                  }
                  error={errors.rateUnit?.message}
                />
              </div>

              {/* Billing Frequency */}
              <div className="space-y-1">
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Billing Frequency <span className="text-rose-500">*</span>
                </label>
                <Select
                  options={BILLING_FREQ_OPTIONS}
                  value={watch("billingFrequency")}
                  onChange={(e) =>
                    setValue("billingFrequency", e.target.value as BillingFrequency, {
                      shouldValidate: true,
                    })
                  }
                  error={errors.billingFrequency?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Currency */}
              <div className="space-y-1">
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Currency <span className="text-rose-500">*</span>
                </label>
                <Input {...register("currency")} placeholder="AED" />
                {errors.currency && (
                  <p className="text-[11px] text-rose-600">{errors.currency.message}</p>
                )}
              </div>

              {/* Security Deposit */}
              <div className="space-y-1">
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Security Deposit Amount
                </label>
                <Input
                  type="number"
                  step="0.01"
                  {...register("depositAmount", { valueAsNumber: true })}
                  placeholder="10000"
                />
                {errors.depositAmount && (
                  <p className="text-[11px] text-rose-600">{errors.depositAmount.message}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="block font-medium text-slate-700 dark:text-slate-300">
                Special Clauses / Agreement Notes
              </label>
              <textarea
                {...register("notes")}
                rows={3}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Include special access terms, climate constraints, insurance conditions..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/contracts")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            className="gap-2 font-semibold px-6"
          >
            <FileText className="h-4 w-4" />
            <span>Generate Storage Contract</span>
          </Button>
        </div>
      </form>
    </div>
  </PermissionGuard>
  );
}
