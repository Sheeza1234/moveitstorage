import { UserRole, PermissionModule, PermissionAction, PERMISSION_MATRIX, currentPermissionContext } from "@/types/role";
import { auditService } from "./mock/audit-service";

export class PermissionDeniedError extends Error {
  public role: UserRole;
  public module: PermissionModule;
  public action: PermissionAction;
  public field?: string;

  constructor(role: UserRole, module: PermissionModule, action: PermissionAction, reason: string, field?: string) {
    super(`[PERMISSION DENIED] Role '${role}' cannot perform '${action}' on '${module}'${field ? ` (field: '${field}')` : ""}: ${reason}`);
    this.name = "PermissionDeniedError";
    this.role = role;
    this.module = module;
    this.action = action;
    this.field = field;
  }
}

export interface CheckPermissionOptions {
  field?: string;
  previousState?: unknown;
  attemptedState?: unknown;
  entityId?: string;
  statusContext?: string; // e.g. "APPROVED"
}

export class PermissionGuard {
  /**
   * Check if a given role is allowed to perform an action on a module/field
   */
  public static checkPermission(
    role: UserRole,
    module: PermissionModule,
    action: PermissionAction,
    options?: CheckPermissionOptions
  ): { allowed: boolean; reason?: string } {
    // A signed-in user's own permission set (and base role) always wins over the role argument a caller passes in.
    const ctx = currentPermissionContext();
    if (ctx) role = ctx.role;
    const modulePerms = (ctx ? ctx.permissions[module] : PERMISSION_MATRIX[role]?.[module]) || [];
    
    // 1. Module & Action check
    if (!modulePerms.includes(action)) {
      return {
        allowed: false,
        reason: `Role '${role}' lacks action permission '${action}' for module '${module}'.`
      };
    }

    // 2. Field-level & Business Rule Locking
    if (role === "STORAGE_OPERATOR") { // Team Leader / Operator
      // Cannot modify approved Packing List
      if (module === "PACKING_LIST" && (action === "EDIT" || action === "APPROVE")) {
        if (options?.statusContext === "APPROVED") {
          return {
            allowed: false,
            reason: "Team Leader cannot modify or re-approve an APPROVED Packing List."
          };
        }
      }

      // Cannot modify approved Packing Material List
      if (module === "PACKING_MATERIAL" && (action === "EDIT" || action === "APPROVE")) {
        return {
          allowed: false,
          reason: "Team Leader cannot modify master Packing Material inventory catalogue or approve material allocations."
        };
      }

      // Cannot change storage allocation, warehouse capacity, quotation, close storage, or alter billing
      if (module === "ALLOCATIONS" && (action === "EDIT" || action === "CREATE" || action === "RELEASE" || action === "CLOSE")) {
        return { allowed: false, reason: "Team Leader cannot alter or close storage allocations." };
      }
      if (module === "CAPACITY" && (action === "EDIT" || action === "CREATE" || action === "CLOSE")) {
        return { allowed: false, reason: "Team Leader cannot modify warehouse capacity." };
      }
      if (module === "BILLING" && action !== "VIEW") {
        return { allowed: false, reason: "Team Leader cannot view rates or alter billing." };
      }
      if (module === "CONTRACTS" && (action === "EDIT" || action === "CLOSE")) {
        return { allowed: false, reason: "Team Leader cannot modify storage contracts or close storage." };
      }
    }

    if (role === "BILLING_USER") {
      // Billing cannot modify warehouse capacity or storage allocations
      if (module === "CAPACITY" && action !== "VIEW") {
        return { allowed: false, reason: "Billing user cannot modify warehouse capacity." };
      }
      if (module === "ALLOCATIONS" && action !== "VIEW") {
        return { allowed: false, reason: "Billing user cannot modify storage allocations." };
      }
    }

    if (role === "DOCUMENT_COMPLIANCE_USER") {
      // Compliance user cannot change storage allocation or edit packing list
      if (module === "ALLOCATIONS" && action !== "VIEW") {
        return { allowed: false, reason: "Compliance user cannot modify storage allocations." };
      }
      if (module === "PACKING_LIST" && action !== "VIEW") {
        return { allowed: false, reason: "Compliance user cannot modify packing lists." };
      }
    }

    if (role === "READ_ONLY_USER") {
      // Read-only user cannot perform mutation actions
      if (action !== "VIEW") {
        return { allowed: false, reason: "Read-only management user cannot perform mutation or execution actions." };
      }
    }

    return { allowed: true };
  }

  /**
   * Enforce permission check. If rejected, records an audit event and throws PermissionDeniedError.
   */
  public static async enforce(
    role: UserRole,
    module: PermissionModule,
    action: PermissionAction,
    options?: CheckPermissionOptions,
    performedBy: string = "User"
  ): Promise<void> {
    const res = this.checkPermission(role, module, action, options);

    if (!res.allowed) {
      const reason = res.reason || "Action restricted by operational security policy.";
      
      // Record rejected audit event
      await auditService.recordEvent({
        entityType: "SECURITY",
        entityId: options?.entityId || `${module.toLowerCase()}-sec`,
        action: "ACTION_REJECTED_PERMISSION_DENIED",
        description: `SECURITY DENIAL: Role '${role}' attempted prohibited action '${action}' on '${module}'${options?.field ? ` (field: ${options.field})` : ""}. Reason: ${reason}`,
        performedBy,
        metadata: {
          actorRole: role,
          module,
          action,
          field: options?.field,
          previousState: options?.previousState,
          attemptedState: options?.attemptedState,
          statusContext: options?.statusContext,
          result: "REJECTED_PERMISSION_DENIED",
          timestamp: new Date().toISOString()
        }
      });

      throw new PermissionDeniedError(role, module, action, reason, options?.field);
    }
  }
}
