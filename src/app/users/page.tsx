"use client";

import * as React from "react";
import { KeyRound, Pencil, Plus, Trash2, UserCheck, UserX } from "lucide-react";
import { services } from "@/services";
import { AppUser, USER_ROLES } from "@/types";
import { useAuthStore } from "@/store/use-auth-store";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { UserFormDialog } from "@/components/modules/users/user-form-dialog";
import { formatDate } from "@/lib/utils";

const btn = "inline-flex items-center gap-1 rounded-lg border border-moveit-border bg-moveit-panel px-2 py-1 text-[11px] font-semibold text-moveit-text hover:bg-moveit-surface cursor-pointer";

export default function UsersPage() {
  const me = useAuthStore((s) => s.user);
  const [users, setUsers] = React.useState<AppUser[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [editing, setEditing] = React.useState<AppUser | null>(null);
  const [creating, setCreating] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      setUsers(await services.userService.listUsers());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users.");
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    services.userService
      .listUsers()
      .then((u) => active && setUsers(u))
      .catch((err) => active && setError(err instanceof Error ? err.message : "Could not load users."));
    return () => {
      active = false;
    };
  }, []);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      setNote({ kind: "ok", text: ok });
      await refresh();
    } catch (err) {
      setNote({ kind: "error", text: err instanceof Error ? err.message : "Request failed." });
    }
  };

  if (error) return <ErrorState title="Users unavailable" message={error} onRetry={refresh} className="my-12" />;
  if (!users) return <LoadingState message="Loading users…" className="py-24" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Access"
        description="Create accounts and decide exactly which screens and actions each person gets. Menus and pages follow these permissions."
        breadcrumbs={[{ label: "System", href: "/" }, { label: "Users & Access", isCurrent: true }]}
        actions={
          <button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-moveit-orange px-3 py-2 text-xs font-semibold text-white hover:bg-moveit-orange-dark cursor-pointer">
            <Plus className="h-3.5 w-3.5" /> Create user
          </button>
        }
      />

      {note && (
        <p role={note.kind === "error" ? "alert" : "status"} className={`rounded-lg border p-2.5 text-xs ${note.kind === "error" ? "border-moveit-danger/40 bg-moveit-danger/10" : "border-emerald-500/40 bg-emerald-500/10"}`}>
          {note.text}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-moveit-border bg-moveit-card">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead className="border-b border-moveit-border bg-moveit-surface text-[10px] uppercase tracking-wider text-moveit-muted">
            <tr>
              <th className="px-4 py-2.5">User</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Last sign-in</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const self = u.id === me?.id;
              return (
                <tr key={u.id} className="border-t border-moveit-border-soft">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-moveit-text">
                      {u.name} {self && <span className="ml-1 rounded bg-moveit-surface px-1.5 text-[10px] font-medium text-moveit-muted">you</span>}
                    </div>
                    <div className="text-[11px] text-moveit-muted">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">{USER_ROLES.find((r) => r.id === u.role)?.name ?? u.role}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${u.status === "ACTIVE" ? "border-emerald-500/40 bg-emerald-500/10" : "border-moveit-border bg-moveit-surface text-moveit-muted"}`}>
                      <span aria-hidden className={`h-2 w-2 rounded-full ${u.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {u.status === "ACTIVE" ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-moveit-muted">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button type="button" className={btn} onClick={() => setEditing(u)}>
                        <Pencil className="h-3 w-3" /> Edit access
                      </button>
                      <button
                        type="button"
                        className={btn}
                        onClick={() => {
                          const pw = prompt(`New password for ${u.name} (min 8 characters)`);
                          if (pw) void act(() => services.userService.resetPassword(u.id, pw), `Password reset for ${u.name}. They were signed out.`);
                        }}
                      >
                        <KeyRound className="h-3 w-3" /> Reset password
                      </button>
                      {!self && (
                        <button type="button" className={btn} onClick={() => act(() => services.userService.updateUser(u.id, { status: u.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }), u.status === "ACTIVE" ? `${u.name} was disabled.` : `${u.name} was enabled.`)}>
                          {u.status === "ACTIVE" ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />} {u.status === "ACTIVE" ? "Disable" : "Enable"}
                        </button>
                      )}
                      {!self && (
                        <button type="button" className={btn} aria-label={`Delete ${u.name}`} onClick={() => confirm(`Delete ${u.name}? This cannot be undone.`) && void act(() => services.userService.deleteUser(u.id), `${u.name} was deleted.`)}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {creating && (
        <UserFormDialog key="new" user={null} open isSelf={false} onClose={() => setCreating(false)} onSaved={(t) => { setNote({ kind: "ok", text: t }); void refresh(); }} />
      )}
      {editing && (
        <UserFormDialog key={editing.id} user={editing} open isSelf={editing.id === me?.id} onClose={() => setEditing(null)} onSaved={(t) => { setNote({ kind: "ok", text: t }); void refresh(); }} />
      )}
    </div>
  );
}
