import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Loading data...", className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-12 text-center text-slate-500 dark:text-slate-400",
        className
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-moveit-orange mb-2" />
      <p className="text-xs font-medium">{message}</p>
    </div>
  );
}
