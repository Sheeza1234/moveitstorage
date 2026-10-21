import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Construction } from "lucide-react";

export interface PlaceholderPageProps {
  title: string;
  description: string;
  phaseLabel: string; // e.g. "Coming in Phase 2"
  breadcrumbs?: { label: string; href?: string; isCurrent?: boolean }[];
  plannedFeatures?: string[];
}

export function PlaceholderPage({
  title,
  description,
  phaseLabel,
  breadcrumbs,
  plannedFeatures = [],
}: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs || [{ label: title, isCurrent: true }]}
        badge={
          <Badge variant="warning" className="gap-1">
            <Clock className="h-3 w-3" />
            {phaseLabel}
          </Badge>
        }
      />

      <Card className="border-dashed bg-slate-50/50 dark:bg-slate-900/40">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 mb-4">
            <Construction className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {title} Module Scheduled
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md">
            This operational module is scheduled for implementation in <strong>{phaseLabel}</strong> per the MoveIt Storage Management System roadmap.
          </p>

          {plannedFeatures.length > 0 && (
            <div className="mt-6 w-full max-w-md text-left rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-wider">
                Planned Features in {phaseLabel}:
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                {plannedFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
