import * as React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400", className)}>
      <Link
        href="/"
        className="flex items-center hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only">Home</span>
      </Link>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
          {item.href && !item.isCurrent ? (
            <Link
              href={item.href}
              className="hover:text-slate-900 dark:hover:text-slate-100 font-medium transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
