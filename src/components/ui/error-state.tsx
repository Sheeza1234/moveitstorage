import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Failed to load information",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20",
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400 mb-2">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">{title}</h3>
      <p className="mt-1 text-xs text-rose-700 dark:text-rose-300 max-w-sm">{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry} className="mt-4">
          Try Again
        </Button>
      )}
    </div>
  );
}
