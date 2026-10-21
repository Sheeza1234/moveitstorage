"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paymentFormSchema, PaymentFormValues } from "@/lib/validators/billing";
import { StorageInvoice, PaymentMethod } from "@/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, ShieldAlert } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: PaymentFormValues) => Promise<void>;
  invoice: StorageInvoice;
}

const PAYMENT_METHODS = [
  { value: "BANK_TRANSFER", label: "Bank Transfer / Wire" },
  { value: "CREDIT_CARD", label: "Credit / Debit Card" },
  { value: "CASH", label: "Cash Payment" },
  { value: "CHEQUE", label: "Company Cheque" },
  { value: "OTHER", label: "Other Method" },
];

export function PaymentModal({
  isOpen,
  onClose,
  onSubmit,
  invoice,
}: PaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(paymentFormSchema) as any,
    defaultValues: {
      invoiceId: invoice.id,
      amount: invoice.balanceDue,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "BANK_TRANSFER",
      referenceNumber: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({
        invoiceId: invoice.id,
        amount: invoice.balanceDue,
        paymentDate: new Date().toISOString().split("T")[0],
        paymentMethod: "BANK_TRANSFER",
        referenceNumber: "",
        notes: "",
      });
      setErrorMsg(null);
    }
  }, [isOpen, invoice, reset]);

  const enteredAmount = watch("amount") || 0;

  const handleFormSubmit = async (data: PaymentFormValues) => {
    setErrorMsg(null);
    if (data.amount > invoice.balanceDue) {
      setErrorMsg(
        `Payment amount (${formatCurrency(data.amount, invoice.currency)}) cannot exceed outstanding balance (${formatCurrency(invoice.balanceDue, invoice.currency)}). Overpayment is not permitted.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to record payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Payment for ${invoice.invoiceNumber}`}
      description="Record an internal payment transaction against this storage invoice."
      size="md"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 text-xs">
        {/* Invoice Balance Banner */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 grid grid-cols-3 gap-2 text-center">
          <div>
            <span className="text-slate-400 block text-[11px]">Invoice Total</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
              {formatCurrency(invoice.totalAmount, invoice.currency)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Amount Paid</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
              {formatCurrency(invoice.amountPaid, invoice.currency)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Balance Due</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 text-xs">
              {formatCurrency(invoice.balanceDue, invoice.currency)}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 text-xs flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Payment Amount */}
          <div className="space-y-1">
            <label className="block font-medium text-slate-700 dark:text-slate-300">
              Payment Amount ({invoice.currency}) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              {...register("amount", { valueAsNumber: true })}
              placeholder="0.00"
            />
            {errors.amount && <p className="text-[11px] text-rose-600">{errors.amount.message}</p>}
            {enteredAmount > invoice.balanceDue && (
              <p className="text-[11px] text-rose-600 font-semibold">Exceeds balance due!</p>
            )}
          </div>

          {/* Payment Date */}
          <div className="space-y-1">
            <label className="block font-medium text-slate-700 dark:text-slate-300">
              Payment Date <span className="text-rose-500">*</span>
            </label>
            <Input type="date" {...register("paymentDate")} />
            {errors.paymentDate && (
              <p className="text-[11px] text-rose-600">{errors.paymentDate.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Payment Method */}
          <div className="space-y-1">
            <label className="block font-medium text-slate-700 dark:text-slate-300">
              Payment Method <span className="text-rose-500">*</span>
            </label>
            <Select
              options={PAYMENT_METHODS}
              value={watch("paymentMethod")}
              onChange={(e) =>
                setValue("paymentMethod", e.target.value as PaymentMethod, { shouldValidate: true })
              }
              error={errors.paymentMethod?.message}
            />
          </div>

          {/* Reference Number */}
          <div className="space-y-1">
            <label className="block font-medium text-slate-700 dark:text-slate-300">
              Reference / Transaction ID
            </label>
            <Input {...register("referenceNumber")} placeholder="e.g. FT2625890124" />
            {errors.referenceNumber && (
              <p className="text-[11px] text-rose-600">{errors.referenceNumber.message}</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="block font-medium text-slate-700 dark:text-slate-300">Payment Notes</label>
          <textarea
            {...register("notes")}
            rows={2}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Include bank details, receipt reference, teller name..."
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting} className="gap-1.5 font-semibold">
            <DollarSign className="h-4 w-4" />
            <span>Record Payment</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
