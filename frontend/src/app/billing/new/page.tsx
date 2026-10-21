"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoiceFormSchema, InvoiceFormValues } from "@/lib/validators/billing";
import { services } from "@/services";
import { Customer, StorageContract } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { formatCurrency } from "@/lib/utils";
import { 
  ArrowLeft, 
  Receipt, 
  Building2, 
  Calendar, 
  DollarSign, 
  Plus, 
  Trash2
} from "lucide-react";

const UNIT_OPTIONS = [
  { value: "MONTH", label: "Month (Lease)" },
  { value: "SQ_FT", label: "SQ FT / Month" },
  { value: "CU_FT", label: "CU FT / Month" },
  { value: "UNIT", label: "Package Unit" },
  { value: "SERVICE", label: "Handling / Service Fee" },
  { value: "FLAT", label: "Flat Fee" },
];

export default function NewInvoicePage() {
  const router = useRouter();

  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [contracts, setContracts] = React.useState<StorageContract[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(invoiceFormSchema) as any,
    defaultValues: {
      customerId: "",
      contractId: "",
      billingPeriodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
      billingPeriodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0],
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      currency: "AED",
      taxRate: 0.05,
      lineItems: [
        {
          description: "Monthly Storage Base Lease",
          quantity: 1,
          unit: "MONTH",
          unitRate: 5000,
        },
      ],
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lineItems",
  });

  const selectedCustomerId = watch("customerId");
  const selectedContractId = watch("contractId");
  const watchedLineItems = watch("lineItems") || [];
  const taxRate = watch("taxRate") || 0.05;
  const currency = watch("currency") || "AED";

  React.useEffect(() => {
    let active = true;
    Promise.all([
      services.customerService.getCustomers(),
      services.contractService.getContracts(),
    ])
      .then(([custList, cntList]) => {
        if (!active) return;
        setCustomers(custList.filter((c) => c.status === "ACTIVE"));
        setContracts(cntList);

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

  // Filter contracts belonging to selected customer
  const customerContracts = React.useMemo(() => {
    if (!selectedCustomerId) return [];
    return contracts.filter(
      (c) => c.customerId === selectedCustomerId && c.status !== "CANCELLED"
    );
  }, [contracts, selectedCustomerId]);

  // Auto select customer's first active contract if available
  React.useEffect(() => {
    if (customerContracts.length > 0) {
      const activeContract = customerContracts.find((c) => c.id === selectedContractId) || customerContracts[0];
      setValue("contractId", activeContract.id, { shouldValidate: true });

      // Auto populate initial line item rate if contract available
      if (activeContract.storageRate) {
        setValue("lineItems.0.unitRate", activeContract.storageRate, { shouldValidate: true });
        setValue("lineItems.0.unit", activeContract.rateUnit || "MONTH", { shouldValidate: true });
      }
    } else {
      setValue("contractId", "", { shouldValidate: true });
    }
  }, [selectedCustomerId, customerContracts, setValue, selectedContractId]);

  // Real-time Subtotal and Tax Calculations
  const calculatedSubtotal = React.useMemo(() => {
    return watchedLineItems.reduce((sum, item) => {
      const q = Number(item.quantity) || 0;
      const r = Number(item.unitRate) || 0;
      return sum + q * r;
    }, 0);
  }, [watchedLineItems]);

  const calculatedTax = React.useMemo(() => {
    return Number((calculatedSubtotal * taxRate).toFixed(2));
  }, [calculatedSubtotal, taxRate]);

  const calculatedTotal = React.useMemo(() => {
    return Number((calculatedSubtotal + calculatedTax).toFixed(2));
  }, [calculatedSubtotal, calculatedTax]);

  const handleFormSubmit = async (values: InvoiceFormValues) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const created = await services.billingService.createInvoice(values);
      router.push(`/billing/${created.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to generate storage invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const customerOptions = React.useMemo(() => {
    const opts = [{ value: "", label: "Select Customer..." }];
    customers.forEach((c) => opts.push({ value: c.id, label: `${c.name} (${c.code})` }));
    return opts;
  }, [customers]);

  const contractOptions = React.useMemo(() => {
    const opts = [{ value: "", label: "Select Contract..." }];
    customerContracts.forEach((c) =>
      opts.push({ value: c.id, label: `${c.contractCode} (${c.contractType.replace("_", " ")})` })
    );
    return opts;
  }, [customerContracts]);

  if (isLoading) {
    return <LoadingState message="Loading billing directory resources..." className="py-24" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to Initialize Invoice Form"
        message={error}
        onRetry={() => router.refresh()}
        className="my-12"
      />
    );
  }

  return (
    <PermissionGuard module="BILLING" action="CREATE">
      <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Create New Storage Invoice"
        description="Generate an internal billing invoice ledger record with line items, tax, and terms."
        breadcrumbs={[
          { label: "Billing", href: "/billing" },
          { label: "New Invoice", isCurrent: true },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/billing")}
            className="gap-1.5 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Cancel</span>
          </Button>
        }
      />

      {submitError && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs">
          <p className="font-semibold text-sm">Billing System Validation Error</p>
          <p className="mt-0.5">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 text-xs">
        {/* Step 1: Customer & Contract Association */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-blue-600" />
              1. Customer & Governing Contract
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer */}
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

              {/* Contract */}
              <div className="space-y-1">
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Governing Storage Contract <span className="text-rose-500">*</span>
                </label>
                <Select
                  options={contractOptions}
                  value={selectedContractId}
                  onChange={(e) => setValue("contractId", e.target.value, { shouldValidate: true })}
                  error={errors.contractId?.message}
                />
                {customerContracts.length === 0 && selectedCustomerId && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    No active contract found for this customer.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Billing Period & Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-purple-600" />
              2. Billing Period & Due Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Period Start Date <span className="text-rose-500">*</span>
                </label>
                <Input type="date" {...register("billingPeriodStart")} />
                {errors.billingPeriodStart && (
                  <p className="text-[11px] text-rose-600">{errors.billingPeriodStart.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Period End Date <span className="text-rose-500">*</span>
                </label>
                <Input type="date" {...register("billingPeriodEnd")} />
                {errors.billingPeriodEnd && (
                  <p className="text-[11px] text-rose-600">{errors.billingPeriodEnd.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Issue Date <span className="text-rose-500">*</span>
                </label>
                <Input type="date" {...register("issueDate")} />
                {errors.issueDate && (
                  <p className="text-[11px] text-rose-600">{errors.issueDate.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Payment Due Date <span className="text-rose-500">*</span>
                </label>
                <Input type="date" {...register("dueDate")} />
                {errors.dueDate && (
                  <p className="text-[11px] text-rose-600">{errors.dueDate.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              3. Invoice Line Items & Charges
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ description: "", quantity: 1, unit: "MONTH", unitRate: 0 })}
              className="gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Line Item</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => {
              const qty = Number(watchedLineItems[index]?.quantity) || 0;
              const rate = Number(watchedLineItems[index]?.unitRate) || 0;
              const lineTotal = qty * rate;

              return (
                <div
                  key={field.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                    {/* Description */}
                    <div className="md:col-span-5 space-y-1">
                      <label className="block font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                        Item Description <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        {...register(`lineItems.${index}.description`)}
                        placeholder="e.g. Monthly Rack Storage Lease"
                      />
                      {errors.lineItems?.[index]?.description && (
                        <p className="text-[10px] text-rose-600">
                          {errors.lineItems[index]?.description?.message}
                        </p>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="block font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                        Qty <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="number"
                        step="1"
                        {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
                        placeholder="1"
                      />
                    </div>

                    {/* Unit */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="block font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                        Unit
                      </label>
                      <Select
                        options={UNIT_OPTIONS}
                        value={watchedLineItems[index]?.unit || "MONTH"}
                        onChange={(e) =>
                          setValue(`lineItems.${index}.unit`, e.target.value, { shouldValidate: true })
                        }
                      />
                    </div>

                    {/* Unit Rate */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="block font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                        Unit Rate <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`lineItems.${index}.unitRate`, { valueAsNumber: true })}
                        placeholder="0.00"
                      />
                    </div>

                    {/* Delete button */}
                    <div className="md:col-span-1 pt-6 text-right">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-rose-600 hover:bg-rose-50 p-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span>Line Total Calculation: {qty} × {rate}</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                      = {formatCurrency(lineTotal, currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Financial Summary & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Notes & Config */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Currency, Tax & Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Billing Currency
                  </label>
                  <Input {...register("currency")} placeholder="AED" />
                </div>

                <div className="space-y-1">
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    VAT Tax Rate (e.g. 0.05 = 5%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register("taxRate", { valueAsNumber: true })}
                    placeholder="0.05"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Invoice Notes & Terms
                </label>
                <textarea
                  {...register("notes")}
                  rows={3}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Payment instructions, bank wire info, payment terms..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Financial Totals Calculation Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Calculated Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Line Subtotal:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(calculatedSubtotal, currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>VAT ({taxRate * 100}%):</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(calculatedTax, currency)}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between font-bold text-sm text-blue-600 dark:text-blue-400">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(calculatedTotal, currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/billing")}
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
            <Receipt className="h-4 w-4" />
            <span>Generate Invoice Ledger</span>
          </Button>
        </div>
      </form>
    </div>
  </PermissionGuard>
  );
}
