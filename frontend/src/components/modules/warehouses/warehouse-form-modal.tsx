"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { warehouseFormSchema, WarehouseFormValues } from "@/lib/validators/warehouse";
import { Warehouse } from "@/types";

export interface WarehouseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: WarehouseFormValues) => Promise<void>;
  initialData?: Warehouse | null;
  isLoading?: boolean;
}

export function WarehouseFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}: WarehouseFormModalProps) {
  const isEditing = Boolean(initialData);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: {
      name: "",
      code: "",
      address: "",
      city: "Dubai",
      country: "UAE",
      description: "",
      capacityUnit: "SQ_FT",
      totalCapacitySqFt: 5000,
      status: "ACTIVE",
    },
  });

  React.useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        code: initialData.code,
        address: initialData.address || initialData.location || "",
        city: initialData.city || "Dubai",
        country: initialData.country || "UAE",
        description: initialData.description || "",
        capacityUnit: initialData.capacityUnit || "SQ_FT",
        totalCapacitySqFt: initialData.totalCapacitySqFt,
        status: initialData.status,
      });
    } else {
      reset({
        name: "",
        code: "",
        address: "",
        city: "Dubai",
        country: "UAE",
        description: "",
        capacityUnit: "SQ_FT",
        totalCapacitySqFt: 5000,
        status: "ACTIVE",
      });
    }
  }, [initialData, reset, isOpen]);

  const onFormSubmit = async (values: WarehouseFormValues) => {
    await onSubmit(values);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Warehouse — ${initialData?.code}` : "Create New Storage Facility"}
      description={
        isEditing
          ? "Update facility details, capacity settings, or operational status."
          : "Define a new MoveIt physical warehouse facility and initial capacity footprint."
      }
      size="lg"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Warehouse Name *"
            placeholder="e.g. MoveIt Central Hub"
            error={errors.name?.message}
            {...register("name")}
          />

          <Input
            label="Warehouse Code *"
            placeholder="e.g. DXB-HUB-02"
            error={errors.code?.message}
            {...register("code")}
          />
        </div>

        <Input
          label="Street Address *"
          placeholder="e.g. Al Quoz Industrial Area 3, Street 18"
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Capacity Unit *"
            error={errors.capacityUnit?.message}
            options={[
              { value: "SQ_FT", label: "Square Feet (SQ.FT)" },
              { value: "CU_FT", label: "Cubic Feet (CU.FT)" },
            ]}
            {...register("capacityUnit")}
          />

          <Input
            label="Total Capacity *"
            type="number"
            placeholder="10000"
            error={errors.totalCapacitySqFt?.message}
            {...register("totalCapacitySqFt", { valueAsNumber: true })}
          />

          <Select
            label="Operational Status *"
            error={errors.status?.message}
            options={[
              { value: "ACTIVE", label: "Active (Operational)" },
              { value: "INACTIVE", label: "Inactive" },
              { value: "MAINTENANCE", label: "Maintenance" },
            ]}
            {...register("status")}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Description & Internal Operations Notes
          </label>
          <textarea
            rows={3}
            placeholder="Enter facility description, security features, climate control parameters..."
            className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            {...register("description")}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {isEditing ? "Save Warehouse Changes" : "Create Warehouse Facility"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
