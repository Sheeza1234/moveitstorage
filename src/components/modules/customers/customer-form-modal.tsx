"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { customerFormSchema, CustomerFormValues } from "@/lib/validators/customer";
import { Customer } from "@/types";
import { Building2, User } from "lucide-react";

export interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
  initialData?: Customer | null;
  isLoading?: boolean;
}

export function CustomerFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}: CustomerFormModalProps) {
  const isEditing = Boolean(initialData);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      type: "CORPORATE",
      companyName: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      alternatePhone: "",
      address: "",
      city: "Dubai",
      country: "UAE",
      status: "ACTIVE",
      notes: "",
      requiredSqFt: undefined,
      storageStartDate: "",
      storageDurationMonths: undefined,
    },
  });

  const customerType = useWatch({ control, name: "type" });

  React.useEffect(() => {
    if (initialData) {
      reset({
        type: initialData.type,
        companyName: initialData.companyName || "",
        firstName: initialData.firstName || "",
        lastName: initialData.lastName || "",
        email: initialData.email,
        phone: initialData.phone,
        alternatePhone: initialData.alternatePhone || "",
        address: initialData.address || "",
        city: initialData.city || "Dubai",
        country: initialData.country || "UAE",
        status: initialData.status,
        notes: initialData.notes || "",
        requiredSqFt: initialData.requiredSqFt,
        storageStartDate: initialData.storageStartDate || "",
        storageDurationMonths: initialData.storageDurationMonths,
      });
    } else {
      reset({
        type: "CORPORATE",
        companyName: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        alternatePhone: "",
        address: "",
        city: "Dubai",
        country: "UAE",
        status: "ACTIVE",
        notes: "",
        requiredSqFt: undefined,
        storageStartDate: "",
        storageDurationMonths: undefined,
      });
    }
  }, [initialData, reset, isOpen]);

  const onFormSubmit = async (values: CustomerFormValues) => {
    await onSubmit(values);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Customer — ${initialData?.code}` : "Register New Storage Customer"}
      description={
        isEditing
          ? "Update customer contact details, business entity information, or status."
          : "Create a centralized customer profile for MoveIt storage operations."
      }
      size="lg"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        {/* Customer Type Selector Pills */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Customer Entity Type *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setValue("type", "CORPORATE")}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                customerType === "CORPORATE"
                  ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 shadow-xs"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>Corporate / Business Entity</span>
            </button>
            <button
              type="button"
              onClick={() => setValue("type", "INDIVIDUAL")}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                customerType === "INDIVIDUAL"
                  ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 shadow-xs"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              <User className="h-4 w-4 text-purple-600" />
              <span>Individual / Personal Storage</span>
            </button>
          </div>
        </div>

        {/* Corporate Fields */}
        {customerType === "CORPORATE" && (
          <Input
            label="Company / Legal Entity Name *"
            placeholder="e.g. Al Habtoor Group LLC"
            error={errors.companyName?.message}
            {...register("companyName")}
          />
        )}

        {/* First & Last Name (Primary Contact for Corporate / Required for Individual) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={customerType === "CORPORATE" ? "Primary Contact First Name" : "First Name *"}
            placeholder="e.g. Mohammed"
            error={errors.firstName?.message}
            {...register("firstName")}
          />

          <Input
            label={customerType === "CORPORATE" ? "Primary Contact Last Name" : "Last Name *"}
            placeholder="e.g. Al-Habtoor"
            error={errors.lastName?.message}
            {...register("lastName")}
          />
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Email Address *"
            type="email"
            placeholder="logistics@company.ae"
            error={errors.email?.message}
            {...register("email")}
          />

          <Input
            label="Primary Phone Number *"
            placeholder="+971 4 394 1111"
            error={errors.phone?.message}
            {...register("phone")}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Alternate / Mobile Phone"
            placeholder="+971 50 112 3344"
            error={errors.alternatePhone?.message}
            {...register("alternatePhone")}
          />

          <Select
            label="Account Status *"
            error={errors.status?.message}
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
            {...register("status")}
          />
        </div>

        {/* Location Address */}
        <Input
          label="Street Address *"
          placeholder="e.g. Business Bay, Tower 4, Suite 120"
          error={errors.address?.message}
          {...register("address")}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="City *"
            placeholder="Dubai"
            error={errors.city?.message}
            {...register("city")}
          />

          <Input
            label="Country *"
            placeholder="UAE"
            error={errors.country?.message}
            {...register("country")}
          />
        </div>

        {/* Storage Requirements */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Storage Requirement Details
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Required Storage SQ.FT"
              type="number"
              placeholder="e.g. 1200"
              error={errors.requiredSqFt?.message}
              {...register("requiredSqFt", { valueAsNumber: true })}
            />

            <Input
              label="Storage Start Date"
              type="date"
              error={errors.storageStartDate?.message}
              {...register("storageStartDate")}
            />

            <Input
              label="Expected Duration (Months)"
              type="number"
              placeholder="e.g. 12"
              error={errors.storageDurationMonths?.message}
              {...register("storageDurationMonths", { valueAsNumber: true })}
            />
          </div>
        </div>

        {/* Internal Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Internal Operations Notes
          </label>
          <textarea
            rows={3}
            placeholder="Document customer preferences, special handling requirements, VIP status..."
            className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            {...register("notes")}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {isEditing ? "Save Customer Changes" : "Register Customer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
