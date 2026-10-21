import * as React from "react";
import { Breadcrumb, BreadcrumbItem } from "./breadcrumb";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  badge,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-2 pb-5 border-b border-slate-200 dark:border-slate-800", className)}>
      {breadcrumbs && <Breadcrumb items={breadcrumbs} className="mb-2" />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
