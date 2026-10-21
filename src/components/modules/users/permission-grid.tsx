"use client";

import * as React from "react";
import { PERMISSION_ACTIONS, PERMISSION_MODULES, PermissionAction, PermissionModule, PermissionSet } from "@/types";
import { ROUTE_RULES, ruleAllows } from "@/lib/access";

const MODULE_LABEL: Record<PermissionModule, string> = {
  CUSTOMERS: "Customers",
  WAREHOUSES: "Warehouses & structure",
  CAPACITY: "Capacity",
  ALLOCATIONS: "Storage allocations",
  INVENTORY: "Inventory & movements",
  PACKING_LIST: "Packing lists",
  CREW_SHEET: "Crew sheets",
  PACKING_MATERIAL: "Packing materials",
  BOX_COLLECTION: "Box collections",
  WALKTHROUGH: "Walkthrough disclaimers",
  CONTRACTS: "Contracts",
  DOCUMENTS: "Documents",
  BILLING: "Billing",
  EMPLOYEES: "Employees & crew",
  REPORTS: "Reports",
  AUDIT: "Audit trail",
  SETTINGS: "Settings & user admin",
};

const ACTION_LABEL: Record<PermissionAction, string> = {
  VIEW: "View", CREATE: "Create", EDIT: "Edit", DELETE: "Delete", APPROVE: "Approve", REJECT: "Reject", ASSIGN: "Assign",
  RELEASE: "Release", CLOSE: "Close", EXPORT: "Export", UPLOAD: "Upload", SUBMIT: "Submit", SIGN: "Sign", RECONCILE: "Reconcile",
};

/** Menu entries this permission set would show (same rule the sidebar and route guard use). */
export function visibleScreens(perms: PermissionSet): string[] {
  return ROUTE_RULES.filter((r) => r.menu !== false && ruleAllows(r, (m, a) => (perms[m] ?? []).includes(a))).map((r) => r.title);
}

export function PermissionGrid({ value, onChange }: { value: PermissionSet; onChange: (next: PermissionSet) => void }) {
  const toggle = (m: PermissionModule, a: PermissionAction) => {
    const cur = new Set(value[m] ?? []);
    if (cur.has(a)) cur.delete(a);
    else cur.add(a);
    // "View" is the door: removing it removes the module's other actions; adding any action adds View
    let next = [...cur];
    if (a === "VIEW" && !cur.has("VIEW")) next = [];
    if (a !== "VIEW" && cur.has(a) && !cur.has("VIEW")) next = [...cur, "VIEW"];
    onChange({ ...value, [m]: next });
  };
  const setRow = (m: PermissionModule, all: boolean) => onChange({ ...value, [m]: all ? [...PERMISSION_ACTIONS] : [] });

  return (
    <div className="overflow-x-auto rounded-lg border border-moveit-border">
      <table className="w-full min-w-[820px] text-left text-[11px]">
        <thead className="bg-moveit-surface text-[10px] uppercase tracking-wider text-moveit-muted">
          <tr>
            <th className="px-3 py-2">Module</th>
            {PERMISSION_ACTIONS.map((a) => (
              <th key={a} className="px-1.5 py-2 text-center font-semibold">{ACTION_LABEL[a]}</th>
            ))}
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {PERMISSION_MODULES.map((m) => (
            <tr key={m} className="border-t border-moveit-border-soft">
              <th scope="row" className="px-3 py-1.5 font-semibold text-moveit-text">{MODULE_LABEL[m]}</th>
              {PERMISSION_ACTIONS.map((a) => (
                <td key={a} className="px-1.5 py-1.5 text-center">
                  <input
                    type="checkbox"
                    aria-label={`${MODULE_LABEL[m]}: ${ACTION_LABEL[a]}`}
                    checked={(value[m] ?? []).includes(a)}
                    onChange={() => toggle(m, a)}
                    className="h-3.5 w-3.5 cursor-pointer accent-[#e96d09]"
                  />
                </td>
              ))}
              <td className="whitespace-nowrap px-2 py-1.5 text-right">
                <button type="button" onClick={() => setRow(m, true)} className="mr-2 text-moveit-orange hover:underline cursor-pointer">All</button>
                <button type="button" onClick={() => setRow(m, false)} className="text-moveit-muted hover:underline cursor-pointer">None</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
