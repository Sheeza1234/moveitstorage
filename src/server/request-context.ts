import { AsyncLocalStorage } from "node:async_hooks";
import { PermissionContext, PermissionSet, UserRole, setPermissionContextProvider } from "@/types/role";

/**
 * The authenticated user of the current RPC request.
 *
 * Everything lives on globalThis because the route handler and the (cached) services can be loaded from different
 * module instances (Next dev reloads); separate stores would silently lose the caller. Outside a request the role is
 * READ_ONLY_USER (fail closed). Only scripts that explicitly opt in through `script-registry` run as SUPER_ADMIN.
 */
export interface RequestUser {
  id: string;
  name: string;
  role: UserRole;
  permissions: PermissionSet;
}

interface Globals {
  __moveitUserStore?: AsyncLocalStorage<RequestUser>;
  __moveitTrustedScript?: boolean;
}
const g = globalThis as unknown as Globals;
const storage = (g.__moveitUserStore ??= new AsyncLocalStorage<RequestUser>());

// permission checks (hasPermission / PermissionGuard) read the signed-in user's own permission set through this hook
setPermissionContextProvider((): PermissionContext | undefined => {
  const u = storage.getStore();
  return u ? { role: u.role, permissions: u.permissions } : undefined;
});

export function runAsUser<T>(user: RequestUser, fn: () => Promise<T>): Promise<T> {
  return storage.run(user, fn);
}

export function getRequestUser(): RequestUser | undefined {
  return storage.getStore();
}

export function getRequestRole(): UserRole {
  const u = storage.getStore();
  if (u) return u.role;
  return g.__moveitTrustedScript ? "SUPER_ADMIN" : "READ_ONLY_USER";
}

export function trustScriptContext() {
  g.__moveitTrustedScript = true;
}
