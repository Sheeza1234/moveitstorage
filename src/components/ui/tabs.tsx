import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string | number;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export function Tabs({
  items,
  defaultValue,
  value,
  onValueChange,
  className,
}: TabsProps) {
  const initialValue = value || defaultValue || (items[0]?.id ?? "");

  return (
    <TabsPrimitive.Root
      value={value}
      defaultValue={initialValue}
      onValueChange={onValueChange}
      className={cn("w-full space-y-4", className)}
    >
      <TabsPrimitive.List className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        {items.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.id}
            value={tab.id}
            disabled={tab.disabled}
            className="inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs dark:text-slate-400 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-slate-100 cursor-pointer"
          >
            {tab.icon && <span className="h-3.5 w-3.5">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                {tab.badge}
              </span>
            )}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>

      {items.map((tab) => (
        <TabsPrimitive.Content
          key={tab.id}
          value={tab.id}
          className="focus-visible:outline-none"
        >
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
