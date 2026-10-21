"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { OperationalAlert } from "@/types";
import { AlertCircle, Clock, FileWarning, Receipt, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AttentionAlertsSectionProps {
  alerts: OperationalAlert[];
}

export function AttentionAlertsSection({ alerts }: AttentionAlertsSectionProps) {
  const router = useRouter();

  const getAlertIcon = (type: OperationalAlert["type"]) => {
    switch (type) {
      case "DOCUMENT_EXPIRY":
        return <FileWarning className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "INVOICE_OVERDUE":
        return <Receipt className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case "CONTRACT_EXPIRY":
        return <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case "CAPACITY_WARNING":
        return <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-moveit-orange" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-moveit-danger">
              <AlertCircle className="h-5 w-5" />
              Action Required & Operational Radar
            </CardTitle>
            <CardDescription>
              High-priority alerts requiring administrator review or document compliance updates
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/notifications")}
            className="text-xs gap-1 text-moveit-orange hover:text-moveit-orange-dark"
          >
            <span>View All ({alerts.length})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            onClick={() => alert.actionUrl && router.push(alert.actionUrl)}
            className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-moveit-border bg-moveit-surface hover:bg-moveit-surface-raised transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-moveit-panel shadow-xs mt-0.5">
                {getAlertIcon(alert.type)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-moveit-text group-hover:text-moveit-orange transition-colors">
                    {alert.title}
                  </h4>
                  {alert.severity === "HIGH" && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-moveit-danger/15 text-moveit-danger">
                      High Priority
                    </span>
                  )}
                </div>
                <p className="text-xs text-moveit-muted">
                  {alert.message}
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-moveit-dim group-hover:text-moveit-orange group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
