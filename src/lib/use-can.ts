import { useAuthStore } from "@/store/use-auth-store";
import { PermissionAction, PermissionModule } from "@/types/role";

/**
 * `can("BILLING", "CREATE")` for the signed-in user's own permission set. Use it to show only the buttons a user may
 * actually use; the server enforces the same rule per operation, so this is about a clean screen, not security.
 */
export function useCan() {
  const user = useAuthStore((s) => s.user);
  return (module: PermissionModule, action: PermissionAction = "VIEW") => Boolean(user && (user.permissions[module] ?? []).includes(action));
}
