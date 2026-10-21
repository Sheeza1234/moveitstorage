import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  side?: "right" | "left";
  size?: "md" | "lg" | "xl";
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  side = "right",
  size = "lg",
}: DrawerProps) {
  const sizes = {
    md: "max-w-md",
    lg: "max-w-xl",
    xl: "max-w-3xl",
  };

  const sides = {
    right: "right-0 top-0 bottom-0 animate-in slide-in-from-right",
    left: "left-0 top-0 bottom-0 animate-in slide-in-from-left",
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 flex h-full w-full flex-col border-l border-slate-200 bg-white p-6 shadow-2xl transition-transform dark:border-slate-800 dark:bg-slate-900",
            sides[side],
            sizes[size]
          )}
        >
          <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              {title && (
                <DialogPrimitive.Title className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {title}
                </DialogPrimitive.Title>
              )}
              {description && (
                <DialogPrimitive.Description className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto pt-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
