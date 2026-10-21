"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Dices, X } from "lucide-react";
import { services } from "@/services";
import { AppUser, PermissionSet, USER_ROLES, UserRole, UserStatus, presetPermissions } from "@/types";
import { PermissionGrid, visibleScreens } from "./permission-grid";

const field =
  "mt-1 w-full rounded-lg border border-moveit-border bg-moveit-surface px-2.5 py-2 text-xs font-semibold text-moveit-text placeholder:text-moveit-dim focus:outline-none focus:ring-2 focus:ring-moveit-orange";

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%";
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export interface UserFormDialogProps {
  /** null = create a new user */
  user: AppUser | null;
  open: boolean;
  isSelf: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function UserFormDialog({ user, open, isSelf, onClose, onSaved }: UserFormDialogProps) {
  const [name, setName] = React.useState(user?.name ?? "");
  const [email, setEmail] = React.useState(user?.email ?? "");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<UserRole>(user?.role ?? "STORAGE_OPERATOR");
  const [status, setStatus] = React.useState<UserStatus>(user?.status ?? "ACTIVE");
  const [perms, setPerms] = React.useState<PermissionSet>(user?.permissions ?? presetPermissions("STORAGE_OPERATOR"));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [shown, setShown] = React.useState(false);

  const screens = React.useMemo(() => visibleScreens(perms), [perms]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (user) {
        await services.userService.updateUser(user.id, { name, role, status, permissions: perms });
        onSaved(`${name} was updated.`);
      } else {
        await services.userService.createUser({ name, email, password, role, status, permissions: perms });
        onSaved(`${name} was created. Share the password with them securely.`);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the user.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100vw-2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-moveit-border bg-moveit-panel text-moveit-text shadow-2xl">
          <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-start justify-between border-b border-moveit-border-soft p-4">
              <div>
                <Dialog.Title className="text-sm font-bold">{user ? `Edit ${user.name}` : "Create user"}</Dialog.Title>
                <Dialog.Description className="mt-1 text-[11px] text-moveit-muted">
                  Pick a role to start from its preset, then tick exactly what this person may do. The menu they see follows these permissions.
                </Dialog.Description>
              </div>
              <Dialog.Close type="button" className="rounded-lg p-1.5 text-moveit-muted hover:bg-moveit-surface cursor-pointer" aria-label="Close">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-[10px] font-semibold text-moveit-muted">
                  Full name
                  <input className={field} value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Sara Khan" />
                </label>
                <label className="text-[10px] font-semibold text-moveit-muted">
                  Email (used to sign in)
                  <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={Boolean(user)} placeholder="sara@company.com" />
                </label>
                {!user && (
                  <div className="text-[10px] font-semibold text-moveit-muted">
                    Temporary password (min 8 characters)
                    <div className="mt-1 flex gap-2">
                      <input className={`${field} mt-0 font-mono`} type={shown ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
                      <button type="button" className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-moveit-border px-2 text-[11px] hover:bg-moveit-surface cursor-pointer" onClick={() => { setPassword(randomPassword()); setShown(true); }}>
                        <Dices className="h-3.5 w-3.5" /> Generate
                      </button>
                    </div>
                  </div>
                )}
                <label className="text-[10px] font-semibold text-moveit-muted">
                  Role (starting preset)
                  <select
                    className={field}
                    value={role}
                    onChange={(e) => {
                      const r = e.target.value as UserRole;
                      setRole(r);
                      setPerms(presetPermissions(r));
                    }}
                  >
                    {USER_ROLES.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <span className="mt-1 block font-normal text-moveit-muted">{USER_ROLES.find((r) => r.id === role)?.description}</span>
                </label>
                <label className="text-[10px] font-semibold text-moveit-muted">
                  Account status
                  <select className={field} value={status} onChange={(e) => setStatus(e.target.value as UserStatus)} disabled={isSelf}>
                    <option value="ACTIVE">Active: can sign in</option>
                    <option value="DISABLED">Disabled: cannot sign in</option>
                  </select>
                </label>
              </div>

              <div>
                <h4 className="mb-1.5 text-xs font-bold">Permissions</h4>
                <PermissionGrid value={perms} onChange={setPerms} />
              </div>

              <div>
                <h4 className="mb-1.5 text-xs font-bold">Menu this user will see</h4>
                <div className="flex flex-wrap gap-1.5" aria-live="polite">
                  <span className="rounded-full border border-moveit-border bg-moveit-surface px-2 py-0.5 text-[11px]">Dashboard</span>
                  <span className="rounded-full border border-moveit-border bg-moveit-surface px-2 py-0.5 text-[11px]">Notifications</span>
                  {screens.map((t) => (
                    <span key={t} className="rounded-full border border-moveit-orange/40 bg-moveit-orange/10 px-2 py-0.5 text-[11px] font-semibold">{t}</span>
                  ))}
                </div>
              </div>

              {error && <p role="alert" className="rounded-lg border border-moveit-danger/40 bg-moveit-danger/10 p-2 text-[11px]">{error}</p>}
            </div>

            <div className="flex justify-end gap-2 border-t border-moveit-border-soft p-3">
              <button type="button" onClick={onClose} className="rounded-lg border border-moveit-border px-3 py-1.5 text-xs font-semibold hover:bg-moveit-surface cursor-pointer">Cancel</button>
              <button type="submit" disabled={busy} className="rounded-lg bg-moveit-orange px-4 py-1.5 text-xs font-semibold text-white hover:bg-moveit-orange-dark disabled:opacity-60 cursor-pointer">
                {busy ? "Saving…" : user ? "Save changes" : "Create user"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
