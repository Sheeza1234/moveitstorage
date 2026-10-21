"use client";

import * as React from "react";
import { useUIStore } from "@/store/use-ui-store";
import { PermissionModule, PermissionAction, USER_ROLES } from "@/types";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface PermissionGuardProps {
  module: PermissionModule;
  action: PermissionAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ module, action, children, fallback }: PermissionGuardProps) {
  const router = useRouter();
  const { currentRole, checkPermission } = useUIStore();
  const isAllowed = checkPermission(module, action);

  if (isAllowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const roleDef = USER_ROLES.find((r) => r.id === currentRole);

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center dark:border-rose-900/60 dark:bg-rose-950/20 my-8 shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300 mb-4">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white">
        Permission Denied — Access Restricted
      </h3>
      <p className="mt-1 max-w-md text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        Your current active role <span className="font-semibold text-rose-700 dark:text-rose-300">({roleDef?.name || currentRole})</span> does not have authorization to perform <span className="font-mono font-semibold">{action}</span> operations on the <span className="font-mono font-semibold">{module}</span> module.
      </p>
      <div className="mt-5 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-1.5 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Go Back</span>
        </Button>
      </div>
    </div>
  );
}
