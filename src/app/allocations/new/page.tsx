"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { services } from "@/services";
import { 
  Customer, 
  Warehouse, 
  AllocationCandidateLocation, 
  StorageAllocation 
} from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { CapacityProgress } from "@/components/ui/capacity-progress";
import { allocationFormSchema, AllocationFormValues } from "@/lib/validators/allocation";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { formatSqFt } from "@/lib/utils";
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  Building2, 
  ShieldAlert, 
  Check 
} from "lucide-react";

import { PermissionGuard } from "@/components/ui/permission-guard";

export default function NewAllocationWizardPage() {
  const router = useRouter();

  // Wizard Step (1 to 5)
  const [step, setStep] = React.useState<number>(1);

  // Data Sources
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Candidates & Recommendation State
  const [candidates, setCandidates] = React.useState<AllocationCandidateLocation[]>([]);
  const [selectedCandidate, setSelectedCandidate] = React.useState<AllocationCandidateLocation | null>(null);
  const [createdDraftAllocation, setCreatedDraftAllocation] = React.useState<StorageAllocation | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AllocationFormValues>({
    resolver: zodResolver(allocationFormSchema),
    defaultValues: {
      customerId: "",
      storageType: "RACK",
      requiredCapacity: 300,
      capacityUnit: "SQ_FT",
      startDate: new Date().toISOString().split("T")[0],
      expectedEndDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      preferredWarehouseId: "wh-001",
      notes: "",
    },
  });

  const formValues = watch();

  React.useEffect(() => {
    let active = true;
    Promise.all([
      services.customerService.getCustomers(),
      services.warehouseService.getWarehouses(),
    ])
      .then(([custList, whList]) => {
        if (!active) return;
        setCustomers(custList);
        setWarehouses(whList);
        if (custList.length > 0) {
          // Pre-select first active customer if available
          const activeCust = custList.find((c) => c.status === "ACTIVE") || custList[0];
          register("customerId", { value: activeCust.id });
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setErrorMessage(err instanceof Error ? err.message : "Failed to initialize wizard.");
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [register]);

  // Handle Step 2 -> 3 (Search locations & compute AI recommendations)
  const handleSearchLocations = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const locations = await services.allocationService.findAvailableLocations(formValues);
      setCandidates(locations);
      if (locations.length > 0) {
        setSelectedCandidate(locations[0]); // Auto-highlight top recommendation for review
      } else {
        setSelectedCandidate(null);
      }
      setStep(3);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error searching available locations.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Step 4 -> Create Draft & Admin Review
  const handleReviewDraft = async () => {
    if (!selectedCandidate) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const draft = await services.allocationService.createAllocationRequirement(formValues);
      setCreatedDraftAllocation(draft);
      setStep(5);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to generate allocation requirement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Final Confirmation with Race Condition Capacity Re-check
  const handleFinalConfirmation = async () => {
    if (!createdDraftAllocation || !selectedCandidate) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      // Re-checks capacity and updates reservation in service layer
      const confirmed = await services.allocationService.confirmAllocation(
        createdDraftAllocation.id,
        selectedCandidate.locationId
      );
      router.push(`/allocations/${confirmed.id}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Confirmation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Initializing Storage Allocation Wizard..." className="py-24" />;
  }

  return (
    <PermissionGuard module="ALLOCATIONS" action="CREATE">
      <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Storage Allocation & AI Recommendation Wizard"
        description="Multi-step guided workflow for capacity validation, AI location recommendation, and explicit admin confirmation."
        breadcrumbs={[
          { label: "Storage Allocations", href: "/allocations" },
          { label: "New Allocation Wizard", isCurrent: true },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push("/allocations")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Cancel Wizard
          </Button>
        }
      />

      {/* Stepper Progress Bar */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        {[
          { num: 1, label: "Customer & Need" },
          { num: 2, label: "Preferences" },
          { num: 3, label: "AI Recommendations" },
          { num: 4, label: "Admin Review" },
          { num: 5, label: "Confirmation" },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                step === s.num
                  ? "bg-moveit-orange text-white shadow-xs"
                  : step > s.num
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {step > s.num ? <Check className="h-4 w-4" /> : s.num}
            </div>
            <span
              className={`hidden md:inline-block text-xs font-semibold ${
                step === s.num
                  ? "text-slate-900 dark:text-slate-100"
                  : "text-slate-400"
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {errorMessage && (
        <ErrorState message={errorMessage} onRetry={() => setErrorMessage(null)} />
      )}

      {/* STEP 1: CUSTOMER & REQUIREMENT */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              Step 1: Customer & Storage Requirement
            </CardTitle>
            <CardDescription>
              Select the customer account and define their square footage / cubic space requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Select Customer Account *"
              error={errors.customerId?.message}
              options={customers.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.code} • ${c.type})`,
              }))}
              {...register("customerId")}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Storage Model Type *"
                error={errors.storageType?.message}
                options={[
                  { value: "RACK", label: "Rack Storage" },
                  { value: "SHELF", label: "Shelf Storage" },
                  { value: "FLOOR", label: "Open Floor Bay" },
                  { value: "SLOT", label: "Individual Vault Slot" },
                  { value: "CUSTOM", label: "Custom / Mixed Storage" },
                ]}
                {...register("storageType")}
              />

              <Input
                label="Required Capacity *"
                type="number"
                placeholder="300"
                error={errors.requiredCapacity?.message}
                {...register("requiredCapacity", { valueAsNumber: true })}
              />

              <Select
                label="Capacity Unit *"
                error={errors.capacityUnit?.message}
                options={[
                  { value: "SQ_FT", label: "Square Feet (SQ.FT)" },
                  { value: "CU_FT", label: "Cubic Feet (CU.FT)" },
                ]}
                {...register("capacityUnit")}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Storage Start Date *"
                type="date"
                error={errors.startDate?.message}
                {...register("startDate")}
              />

              <Input
                label="Expected End Date *"
                type="date"
                error={errors.expectedEndDate?.message}
                {...register("expectedEndDate")}
              />
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="primary"
                onClick={handleSubmit(() => setStep(2))}
                className="gap-2"
              >
                <span>Continue to Preferences</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: PREFERENCES */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Step 2: Facility Preferences & Notes
            </CardTitle>
            <CardDescription>
              Specify preferred MoveIt storage centers or handling conditions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Preferred Warehouse Facility"
              options={[
                { value: "", label: "No Preference (Search All Warehouses)" },
                ...warehouses.map((w) => ({ value: w.id, label: w.name })),
              ]}
              {...register("preferredWarehouseId")}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Special Handling Requirements / Notes
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Requires climate control, ground floor access, high-vault security..."
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                {...register("specialRequirements")}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleSearchLocations}
                isLoading={isSubmitting}
                className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Sparkles className="h-4 w-4" />
                <span>Search Available Locations & Run AI Matcher</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: AI RECOMMENDATIONS & AVAILABLE LOCATIONS */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                  <Sparkles className="h-5 w-5" />
                  Step 3: AI Storage Location Recommendations
                </CardTitle>
                <CardDescription>
                  Evaluated candidate locations matching requested {formatSqFt(formValues.requiredCapacity)} requirement
                </CardDescription>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-bold text-xs">
                {candidates.length} Locations Eligible
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {candidates.length === 0 ? (
              <ErrorState
                title="Insufficient Warehouse Capacity"
                message={`No active warehouse locations currently have ${formatSqFt(formValues.requiredCapacity)} available capacity matching criteria.`}
                onRetry={() => setStep(1)}
              />
            ) : (
              <div className="space-y-3">
                {candidates.map((candidate, idx) => {
                  const isTop = idx === 0;
                  const isSelected = selectedCandidate?.locationId === candidate.locationId;

                  return (
                    <div
                      key={candidate.locationId}
                      onClick={() => setSelectedCandidate(candidate)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                        isSelected
                          ? "border-moveit-orange bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30 ring-2 ring-blue-500/20 shadow-md"
                          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 font-bold text-xs">
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {candidate.locationName}
                              </h4>
                              {isTop && (
                                <span className="px-2 py-0.5 rounded-full bg-moveit-orange text-white font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  Top Recommendation
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">
                              {candidate.locationPath}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              Score: {candidate.compatibilityScore}%
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Available: {formatSqFt(candidate.availableCapacity)}
                            </span>
                          </div>
                          <StatusBadge status={candidate.status} size="sm" />
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                        <strong className="text-purple-700 dark:text-purple-400">AI Match Reasoning: </strong>
                        {candidate.recommendationReason}
                      </div>

                      <CapacityProgress
                        totalSqFt={candidate.totalCapacity}
                        occupiedSqFt={candidate.occupiedCapacity}
                        reservedSqFt={candidate.reservedCapacity}
                        availableSqFt={candidate.availableCapacity}
                        size="sm"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to Preferences
              </Button>

              <Button
                variant="primary"
                disabled={!selectedCandidate}
                onClick={() => setStep(4)}
                className="gap-2"
              >
                <span>Review Selected Location</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: ADMIN REVIEW */}
      {step === 4 && selectedCandidate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Step 4: Administrator Review & Selection
            </CardTitle>
            <CardDescription>
              Review AI recommendation candidate and verify administrator oversight prior to drafting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Safety Indicator Banner */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Human Administrator Oversight Required:</strong> MoveIt policy strictly forbids automated storage allocation. Please review the chosen location candidate below before proceeding.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Target Location</span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedCandidate.locationName}</h4>
                <p className="text-xs text-slate-500 font-mono">{selectedCandidate.locationPath}</p>
                <div className="pt-2 border-t border-slate-100 text-xs">
                  <span>Available Space: <strong>{formatSqFt(selectedCandidate.availableCapacity)}</strong></span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Impact After Allocation</span>
                <h4 className="text-sm font-bold text-emerald-600">{formatSqFt(selectedCandidate.remainingAfterAllocation)} Remaining</h4>
                <p className="text-xs text-slate-500">Requested footprint: {formatSqFt(formValues.requiredCapacity)}</p>
                <div className="pt-2 border-t border-slate-100 text-xs">
                  <span>Compatibility Match: <strong>{selectedCandidate.compatibilityScore}%</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to Candidates
              </Button>

              <Button
                variant="primary"
                onClick={handleReviewDraft}
                isLoading={isSubmitting}
                className="gap-2 bg-moveit-orange hover:bg-moveit-orange-dark text-white"
              >
                <span>Generate Allocation Draft</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 5: FINAL CONFIRMATION (With Live Race Condition Re-Check) */}
      {step === 5 && createdDraftAllocation && selectedCandidate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              Step 5: Final Allocation Confirmation
            </CardTitle>
            <CardDescription>
              Confirm storage allocation. Clicking confirm will trigger a live capacity re-check and reserve the footprint.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Draft Allocation ID</span>
                  <p className="text-base font-mono font-bold text-blue-600">{createdDraftAllocation.allocationCode}</p>
                </div>
                <StatusBadge status="PENDING_REVIEW" size="md" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400">Customer Name:</span>
                  <p className="font-bold text-slate-900 dark:text-slate-100">{createdDraftAllocation.customerName}</p>
                </div>
                <div>
                  <span className="text-slate-400">Required Footprint:</span>
                  <p className="font-bold text-slate-900 dark:text-slate-100">{formatSqFt(createdDraftAllocation.requiredCapacity)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Target Warehouse:</span>
                  <p className="font-bold text-slate-900 dark:text-slate-100">{selectedCandidate.warehouseName}</p>
                </div>
                <div>
                  <span className="text-slate-400">Target Location Path:</span>
                  <p className="font-bold text-slate-900 dark:text-slate-100">{selectedCandidate.locationPath}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" onClick={() => setStep(4)} disabled={isSubmitting}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to Review
              </Button>

              <Button
                variant="success"
                size="lg"
                onClick={handleFinalConfirmation}
                isLoading={isSubmitting}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <Check className="h-5 w-5" />
                <span>Confirm & Reserve Storage Footprint</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </PermissionGuard>
  );
}
