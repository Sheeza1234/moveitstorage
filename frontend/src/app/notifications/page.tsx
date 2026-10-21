"use client";

import * as React from "react";
import Link from "next/link";
import { services } from "@/services";
import { OperationalNotification, NotificationSummary } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils";
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  CheckCheck, 
  Filter,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
  Building2,
  FileText,
  Receipt,
  Package,
  Layers
} from "lucide-react";

const SEVERITY_OPTIONS = [
  { value: "ALL", label: "All Severities" },
  { value: "CRITICAL", label: "Critical" },
  { value: "WARNING", label: "Warning" },
  { value: "INFO", label: "Informational" },
  { value: "SUCCESS", label: "Success" },
];

const READ_STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "UNREAD", label: "Unread Only" },
  { value: "READ", label: "Read Only" },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState<OperationalNotification[]>([]);
  const [summary, setSummary] = React.useState<NotificationSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedSeverity, setSelectedSeverity] = React.useState("ALL");
  const [selectedReadStatus, setSelectedReadStatus] = React.useState("ALL");

  const loadData = React.useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const [list, sum] = await Promise.all([
        services.notificationService.getNotifications({
          severity: selectedSeverity !== "ALL" ? selectedSeverity : undefined,
          readStatus: selectedReadStatus as "ALL" | "UNREAD" | "READ",
          search: searchQuery || undefined,
        }),
        services.notificationService.getNotificationSummary(),
      ]);

      setNotifications(list);
      setSummary(sum);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load operational notifications.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedSeverity, selectedReadStatus, searchQuery]);

  React.useEffect(() => {
    let active = true;
    Promise.all([
      services.notificationService.getNotifications({
        severity: selectedSeverity !== "ALL" ? selectedSeverity : undefined,
        readStatus: selectedReadStatus as "ALL" | "UNREAD" | "READ",
        search: searchQuery || undefined,
      }),
      services.notificationService.getNotificationSummary(),
    ])
      .then(([list, sum]) => {
        if (!active) return;
        setNotifications(list);
        setSummary(sum);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load operational notifications.");
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedSeverity, selectedReadStatus, searchQuery]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await services.notificationService.markAsRead(id);
      loadData(true);
    } catch {
      // Ignore error
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await services.notificationService.markAllAsRead();
      loadData(true);
    } catch {
      // Ignore error
    }
  };

  const getSeverityBadge = (severity: OperationalNotification["severity"]) => {
    switch (severity) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900">
            <AlertCircle className="h-3 w-3" /> Critical
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900">
            <AlertTriangle className="h-3 w-3" /> Warning
          </span>
        );
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900">
            <CheckCircle2 className="h-3 w-3" /> Success
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900">
            <Info className="h-3 w-3" /> Info
          </span>
        );
    }
  };

  const getEntityIcon = (entityType: OperationalNotification["entityType"]) => {
    switch (entityType) {
      case "CONTRACT":
        return <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "DOCUMENT":
        return <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "INVOICE":
        return <Receipt className="h-4 w-4 text-violet-600 dark:text-violet-400" />;
      case "WAREHOUSE":
        return <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case "ALLOCATION":
        return <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case "INVENTORY":
        return <Package className="h-4 w-4 text-sky-600 dark:text-sky-400" />;
      default:
        return <Bell className="h-4 w-4 text-slate-500" />;
    }
  };

  if (isLoading && !notifications.length) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Notifications & Operational Alerts"
          description="Review operational alerts, expiry warnings, and action-required events across MoveIt Storage."
          breadcrumbs={[{ label: "Notifications", isCurrent: true }]}
        />
        <LoadingState message="Evaluating operational alert conditions..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Notifications & Operational Alerts"
          description="Review operational alerts, expiry warnings, and action-required events across MoveIt Storage."
          breadcrumbs={[{ label: "Notifications", isCurrent: true }]}
        />
        <ErrorState message={error} onRetry={() => loadData()} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Notifications & Operational Alerts"
        description="Review operational alerts, expiry warnings, and action-required events across MoveIt Storage."
        breadcrumbs={[{ label: "Notifications", isCurrent: true }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh Alerts
            </Button>
            {summary && summary.unread > 0 && (
              <Button size="sm" onClick={handleMarkAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-1.5" />
                Mark All as Read
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard
            title="All Alerts"
            value={summary.total.toString()}
            subtitle="Total evaluated alerts"
            icon={<Bell className="h-5 w-5 text-slate-600" />}
          />
          <MetricCard
            title="Unread Alerts"
            value={summary.unread.toString()}
            subtitle="Action required"
            icon={<AlertCircle className="h-5 w-5 text-rose-600" />}
          />
          <MetricCard
            title="Critical"
            value={summary.critical.toString()}
            subtitle="High severity alerts"
            icon={<ShieldAlert className="h-5 w-5 text-rose-600" />}
          />
          <MetricCard
            title="Warnings"
            value={summary.warnings.toString()}
            subtitle="Impending expirations"
            icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
          />
          <MetricCard
            title="Informational"
            value={summary.info.toString()}
            subtitle="System notifications"
            icon={<Info className="h-5 w-5 text-blue-600" />}
          />
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-1 items-center gap-3">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notification title, message, or ID..."
            className="w-full sm:w-80"
          />
          <div className="hidden md:flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-3">
            <Filter className="h-4 w-4 text-slate-400" />
            <Select
              options={SEVERITY_OPTIONS}
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-40"
            />
            <Select
              options={READ_STATUS_OPTIONS}
              value={selectedReadStatus}
              onChange={(e) => setSelectedReadStatus(e.target.value)}
              className="w-36"
            />
          </div>
        </div>

        <div className="flex md:hidden items-center gap-2">
          <Select
            options={SEVERITY_OPTIONS}
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="w-1/2"
          />
          <Select
            options={READ_STATUS_OPTIONS}
            value={selectedReadStatus}
            onChange={(e) => setSelectedReadStatus(e.target.value)}
            className="w-1/2"
          />
        </div>
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <EmptyState
          title="No operational alerts match filters"
          description="All systems are operating normally. No pending action-required alerts found."
          icon={<CheckCircle2 className="h-10 w-10 text-emerald-500" />}
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 sm:p-5 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                !n.read ? "bg-slate-50/80 dark:bg-slate-800/40 font-medium" : ""
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                  {getEntityIcon(n.entityType)}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getSeverityBadge(n.severity)}
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {n.title}
                    </span>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                    {n.message}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                    <span>{formatDateTime(n.createdAt)}</span>
                    <span>•</span>
                    <span>Entity: {n.entityType} ({n.entityId})</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {!n.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAsRead(n.id)}
                    className="text-xs text-slate-500 hover:text-slate-900"
                  >
                    Mark Read
                  </Button>
                )}

                {n.actionUrl && (
                  <Link
                    href={n.actionUrl}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span>Resolve</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
