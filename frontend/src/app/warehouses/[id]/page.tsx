"use client";

import { useCan } from "@/lib/use-can";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { services } from "@/services";
import { Warehouse } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { VisualWarehouseExplorer } from "@/components/modules/warehouses/visual-warehouse-explorer";
import { Warehouse3DExplorer } from "@/components/modules/warehouses/warehouse-3d-explorer";
import { WarehouseStructureManager } from "@/components/modules/warehouses/warehouse-structure-manager";
import { WarehouseFormModal } from "@/components/modules/warehouses/warehouse-form-modal";
import { WarehouseFormValues } from "@/lib/validators/warehouse";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { formatDate } from "@/lib/utils";
import { Edit3, MapPin, ArrowLeft, Layers } from "lucide-react";
import { useUIStore } from "@/store/use-ui-store";
import { hasPermission } from "@/types";

export default function WarehouseDetailPage() {
  const can = useCan();
  const params = useParams();
  const router = useRouter();
  const warehouseId = params.id as string;

  const [warehouse, setWarehouse] = React.useState<Warehouse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [structureOpen, setStructureOpen] = React.useState(false);
  const role = useUIStore((st) => st.currentRole);
  const canManageStructure = (["CREATE", "EDIT", "DELETE"] as const).some((a) => hasPermission(role, "WAREHOUSES", a));

  const fetchWarehouse = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await services.warehouseService.getWarehouseById(warehouseId);
      if (!data) {
        setError("Warehouse facility not found.");
      } else {
        setWarehouse(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load facility details.");
    } finally {
      setIsLoading(false);
    }
  }, [warehouseId]);

  React.useEffect(() => {
    let active = true;
    services.warehouseService
      .getWarehouseById(warehouseId)
      .then((data) => {
        if (!active) return;
        if (!data) {
          setError("Warehouse facility not found.");
        } else {
          setWarehouse(data);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load facility details.");
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [warehouseId]);

  const handleUpdate = async (values: WarehouseFormValues) => {
    setIsSubmitting(true);
    try {
      await services.warehouseService.updateWarehouse(warehouseId, values);
      await fetchWarehouse();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update warehouse.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Fetching MoveIt warehouse hierarchy and spatial map..." className="py-24" />;
  }

  if (error || !warehouse) {
    return (
      <ErrorState
        title="Facility Not Found"
        message={error || "The requested warehouse does not exist."}
        onRetry={() => router.push("/warehouses")}
        className="my-12"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={warehouse.name}
        description={`Warehouse Code: ${warehouse.code} • Location: ${warehouse.city}, ${warehouse.country}`}
        breadcrumbs={[
          { label: "Warehouses", href: "/warehouses" },
          { label: warehouse.code, isCurrent: true },
        ]}
        badge={
          <StatusBadge
            status={
              warehouse.status === "ACTIVE"
                ? "AVAILABLE"
                : warehouse.status === "MAINTENANCE"
                ? "BLOCKED"
                : "EXPIRED"
            }
          />
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/warehouses")}
              className="gap-1 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Directory</span>
            </Button>
            {canManageStructure && (
              <Button variant="outline" size="sm" onClick={() => setStructureOpen(true)} className="gap-1.5 text-xs">
                <Layers className="h-3.5 w-3.5" />
                <span>Manage Structure</span>
              </Button>
            )}
            {can("WAREHOUSES", "EDIT") && (
<Button
              variant="primary"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="gap-1.5 text-xs"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Facility</span>
            </Button>
)}
          </div>
        }
      />

      {/* 3D Storage Capacity Explorer (Replaces static horizontal capacity bar) */}
      <Warehouse3DExplorer key={warehouse.id} warehouse={warehouse} />

      {/* Facility Details Card & Meta Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Facility Details & Specifications</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-moveit-muted uppercase">Street Address</span>
            <p className="font-semibold text-moveit-text flex items-start gap-1.5">
              <MapPin className="h-4 w-4 text-moveit-orange shrink-0 mt-0.5" />
              <span>{warehouse.address || warehouse.location}</span>
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-moveit-muted uppercase">Capacity Measurement Unit</span>
            <p className="font-bold text-moveit-text">{warehouse.capacityUnit}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-moveit-muted uppercase">Active Storage Allocations</span>
            <p className="font-bold text-moveit-orange">{warehouse.activeAllocationsCount} Allocations</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-moveit-muted uppercase">Operational Description</span>
            <p className="text-moveit-muted leading-snug">
              {warehouse.description || "No specific operational notes documented for this facility."}
            </p>
          </div>

          <div className="md:col-span-4 pt-3 border-t border-moveit-border-soft flex items-center justify-between text-[11px] text-moveit-dim">
            <span>Registered: {formatDate(warehouse.createdAt)}</span>
            <span>Last Modified: {formatDate(warehouse.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Visual Warehouse Hierarchy Explorer */}
      <VisualWarehouseExplorer warehouse={warehouse} />

      <WarehouseStructureManager
        warehouse={warehouse}
        open={structureOpen}
        onClose={() => setStructureOpen(false)}
        onChanged={(updated) => setWarehouse(updated)}
      />

      {/* Edit Warehouse Modal */}
      <WarehouseFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdate}
        initialData={warehouse}
        isLoading={isSubmitting}
      />
    </div>
  );
}
