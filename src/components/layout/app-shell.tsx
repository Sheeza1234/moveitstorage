"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useUIStore } from "@/store/use-ui-store";
import { useAuthStore } from "@/store/use-auth-store";
import { ruleAllows, ruleForPath } from "@/lib/access";
import { hasPermission } from "@/types";
import { AccessDenied } from "@/components/ui/access-denied";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { setTheme } = useUIStore();
  const pathname = usePathname();
  const router = useRouter();
  const { status, user, load } = useAuthStore();
  const onLogin = pathname === "/login";

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("moveit_theme") as "dark" | "light" | null;
    setTheme(savedTheme || "light");
    useUIStore.getState().setSidebarCollapsed(localStorage.getItem("moveit_storage_sidebar") === "collapsed");
  }, [setTheme]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (status === "anon" && !onLogin) router.replace(`/login${pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`}`);
    if (status === "authed" && onLogin) router.replace("/");
  }, [status, onLogin, pathname, router]);

  if (onLogin) return <>{children}</>;

  if (status !== "authed" || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-moveit-bg text-moveit-muted">
        <Loader2 className="h-6 w-6 animate-spin text-moveit-orange" aria-label="Loading" />
      </div>
    );
  }

  const rule = ruleForPath(pathname);
  const allowed = ruleAllows(rule, (m, a) => hasPermission(user.role, m, a));

  return (
    <div className="flex h-screen w-full overflow-hidden bg-moveit-bg text-moveit-text antialiased transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 min-w-0 w-full overflow-y-auto p-4 sm:p-6 lg:p-8">{allowed ? children : <AccessDenied what={rule?.modules[0].replace(/_/g, " ").toLowerCase()} />}</main>
      </div>
    </div>
  );
}
