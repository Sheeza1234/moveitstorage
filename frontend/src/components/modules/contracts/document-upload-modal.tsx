"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { documentFormSchema, DocumentFormValues } from "@/lib/validators/document";
import { DocumentType, Customer, StorageContract } from "@/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FileUp, Info } from "lucide-react";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: DocumentFormValues) => Promise<void>;
  customers: Customer[];
  contracts: StorageContract[];
  defaultCustomerId?: string;
  defaultContractId?: string;
  defaultDocumentType?: DocumentType;
}

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "SIGNED_CONTRACT", label: "Signed Storage Agreement" },
  { value: "CUSTOMER_ID", label: "Customer Passport / Photo ID" },
  { value: "EMIRATES_ID", label: "Emirates ID Copy" },
  { value: "TRADE_LICENSE", label: "Commercial Trade License" },
  { value: "INSURANCE", label: "Insurance Policy Certificate" },
  { value: "INVENTORY_LIST", label: "Packing List / Inventory Schedule" },
  { value: "INSPECTION_REPORT", label: "Storage Inspection Report" },
  { value: "SUPPORTING", label: "Supporting Documentation" },
  { value: "OTHER", label: "Other Document" },
];

export function DocumentUploadModal({
  isOpen,
  onClose,
  onSubmit,
  customers,
  contracts,
  defaultCustomerId,
  defaultContractId,
  defaultDocumentType,
}: DocumentUploadModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DocumentFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(documentFormSchema) as any,
    defaultValues: {
      customerId: defaultCustomerId || "",
      contractId: defaultContractId || "",
      documentType: defaultDocumentType || "SIGNED_CONTRACT",
      title: "",
      fileName: "",
      fileType: "application/pdf",
      fileSize: 1500000,
      issueDate: new Date().toISOString().split("T")[0],
      expiryDate: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({
        customerId: defaultCustomerId || (customers.length > 0 ? customers[0].id : ""),
        contractId: defaultContractId || "",
        documentType: defaultDocumentType || "SIGNED_CONTRACT",
        title: "",
        fileName: "",
        fileType: "application/pdf",
        fileSize: 1500000,
        issueDate: new Date().toISOString().split("T")[0],
        expiryDate: "",
        notes: "",
      });
    }
  }, [isOpen, defaultCustomerId, defaultContractId, defaultDocumentType, customers, reset]);

  const selectedCustomerId = watch("customerId");
  const selectedDocType = watch("documentType");

  // Auto-generate suggested document title when customer or type changes
  React.useEffect(() => {
    if (selectedCustomerId && selectedDocType) {
      const cust = customers.find((c) => c.id === selectedCustomerId);
      const docTypeObj = DOCUMENT_TYPES.find((t) => t.value === selectedDocType);
      if (cust && docTypeObj) {
        setValue("title", `${docTypeObj.label} — ${cust.name}`, { shouldValidate: true });
        if (!watch("fileName")) {
          const sanitizedCust = cust.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
          const sanitizedType = selectedDocType.toLowerCase();
          setValue("fileName", `${sanitizedType}_${sanitizedCust}.pdf`, { shouldValidate: true });
        }
      }
    }
  }, [selectedCustomerId, selectedDocType, customers, setValue, watch]);

  const handleFormSubmit = async (data: DocumentFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredContracts = contracts.filter(
    (c) => !selectedCustomerId || c.customerId === selectedCustomerId
  );

  const customerOptions = React.useMemo(() => {
    const opts = [{ value: "", label: "Select Customer..." }];
    customers.forEach((c) => opts.push({ value: c.id, label: `${c.name} (${c.code})` }));
    return opts;
  }, [customers]);

  const contractOptions = React.useMemo(() => {
    const opts = [{ value: "", label: "General Customer Document (No Specific Contract)" }];
    filteredContracts.forEach((c) =>
      opts.push({ value: c.id, label: `${c.contractCode} (${c.contractType.replace("_", " ")})` })
    );
    return opts;
  }, [filteredContracts]);

  const fileTypeOptions = [
    { value: "application/pdf", label: "PDF Document (.pdf)" },
    { value: "image/jpeg", label: "JPEG Image (.jpg)" },
    { value: "image/png", label: "PNG Image (.png)" },
    { value: "application/msword", label: "Word Document (.doc/.docx)" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Compliance Document Metadata"
      description="Store metadata reference and document compliance details in MoveIt internal storage registry."
      size="lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 text-xs">
        {/* Mock storage info alert */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
          <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-xs">Mock Document Storage Abstraction</p>
            <p className="text-[11px] text-amber-800 dark:text-amber-400">
              Files are stored as system storage references (e.g. <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded font-mono">/mock-storage/contracts/...</code>). No physical files are uploaded to cloud servers in mock mode.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Customer Selection */}
          <div className="space-y-1">
            <label className="block font-medium text-slate-700 dark:text-slate-300">
              Customer <span className="text-rose-500">*</span>
            </label>
            <Select
              options={customerOptions}
              value={watch("customerId")}
              onChange={(e) => setValue("customerId", e.target.value, { shouldValidate: true })}
              error={errors.customerId?.message}
            />
          </div>

          {/* Contract Selection */}
          <div className="space-y-1">
            <label className="block font-medium text-slate-700 dark:text-slate-300">
              Linked Contract <span className="text-slate-400">(Optional)</span>
            </label>
            <Select
              options={contractOptions}
              value={watch("contractId") || ""}
              onChange={(e) => setValue("contractId", e.target.value, { shouldValidate: true })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Document Type */}
          <div className="space-y-1">
            <label className="block font-medium text-slate-700 dark:text-slate-300">
              Document Type <span className="text-rose-500">*</span>
            </label>
            <Select
              options={DOCUMENT_TYPES}
              value={watch("documentType")}
              onChange={(e) => setValue("documentType", e.target.value as DocumentType, { shouldValidate: true })}
              error={errors.documentType?.message}
            />
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="block font-medium text-slate-700 dark:text-slate-300">
              Document Title <span className="text-rose-500">*</span>
            </label>
            <Input {...register("title")} placeholder="e.g. Trade License 2026" />
            {errors.title && <p className="text-[11px] text-rose-600">{errors.title.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* File Name */}
          <div className="space-y-1">
            <label className="block font-medium text-slate-700 dark:text-slate-300">
              File Name <span className="text-rose-500">*</span>
            </label>
            <Input {...register("fileName")} placeholder="e.g. document.pdf" />
            {errors.fileName && <p className="text-[11px] text-rose-600">{errors.fileName.message}</p>}
          </div>

          {/* File Type */}
          <div className="space-y-1">
            <label className="block font-medium text-slate-700 dark:text-slate-300">File Type</label>
            <Select
              options={fileTypeOptions}
              value={watch("fileType")}
              onChange={(e) => setValue("fileType", e.target.value)}
            />
          </div>

          {/* File Size */}
          <div className="space-y-1">
            <label className="block font-medium text-slate-700 dark:text-slate-300">
              Simulated Size (Bytes)
            </label>
            <Input
              type="number"
              {...register("fileSize", { valueAsNumber: true })}
              placeholder="1500000"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Issue Date */}
          <div className="space-y-1">
            <label className="block font-medium text-slate-700 dark:text-slate-300">
              Issue Date <span className="text-rose-500">*</span>
            </label>
            <Input type="date" {...register("issueDate")} />
            {errors.issueDate && <p className="text-[11px] text-rose-600">{errors.issueDate.message}</p>}
          </div>

          {/* Expiry Date */}
          <div className="space-y-1">
            <label className="block font-medium text-slate-700 dark:text-slate-300">
              Expiry Date <span className="text-slate-400">(Leave blank if non-expiring)</span>
            </label>
            <Input type="date" {...register("expiryDate")} />
            {errors.expiryDate && <p className="text-[11px] text-rose-600">{errors.expiryDate.message}</p>}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="block font-medium text-slate-700 dark:text-slate-300">Notes / Remarks</label>
          <textarea
            {...register("notes")}
            rows={2}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Add optional notes, document serial numbers, issuing authority..."
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting} className="gap-1.5">
            <FileUp className="h-3.5 w-3.5" />
            <span>Store Document Metadata</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
