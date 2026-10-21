export type UserRole = 
  | 'SUPER_ADMIN'
  | 'STORAGE_MANAGER'
  | 'STORAGE_OPERATOR'
  | 'BILLING_USER'
  | 'DOCUMENT_COMPLIANCE_USER'
  | 'HR_ADMIN'
  | 'READ_ONLY_USER';

export type Role = UserRole;

export type PermissionModule = 
  | 'CUSTOMERS'
  | 'WAREHOUSES'
  | 'CAPACITY'
  | 'ALLOCATIONS'
  | 'INVENTORY'
  | 'PACKING_LIST'
  | 'CREW_SHEET'
  | 'PACKING_MATERIAL'
  | 'BOX_COLLECTION'
  | 'WALKTHROUGH'
  | 'CONTRACTS'
  | 'DOCUMENTS'
  | 'BILLING'
  | 'EMPLOYEES'
  | 'REPORTS'
  | 'AUDIT'
  | 'SETTINGS';

export type PermissionAction = 
  | 'VIEW' 
  | 'CREATE' 
  | 'EDIT' 
  | 'APPROVE' 
  | 'REJECT' 
  | 'ASSIGN' 
  | 'RELEASE' 
  | 'CLOSE' 
  | 'EXPORT' 
  | 'UPLOAD' 
  | 'DELETE' 
  | 'SUBMIT' 
  | 'SIGN' 
  | 'RECONCILE';

export interface UserRoleDefinition {
  id: UserRole;
  name: string;
  description: string;
  badgeColor: string;
}

export const USER_ROLES: UserRoleDefinition[] = [
  {
    id: 'SUPER_ADMIN',
    name: 'Super Admin',
    description: 'Full system and security configuration access across all operational modules.',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300',
  },
  {
    id: 'STORAGE_MANAGER',
    name: 'Storage Manager',
    description: 'Manage customer profiles, allocations, warehouse capacity, inventory, contracts, and operational reports.',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300',
  },
  {
    id: 'STORAGE_OPERATOR',
    name: 'Storage Operator',
    description: 'Perform approved customer views, inventory intake, package movements, and physical release operations.',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300',
  },
  {
    id: 'BILLING_USER',
    name: 'Billing User',
    description: 'Manage billing invoices, payment records, rate reconciliations, and financial reporting.',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
  {
    id: 'DOCUMENT_COMPLIANCE_USER',
    name: 'Document / Compliance User',
    description: 'Manage legal compliance documents, trade licenses, expiration dates, and attention alerts.',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300',
  },
  {
    id: 'READ_ONLY_USER',
    name: 'Read-Only / Management User',
    description: 'View executive dashboards, reports, and operational records without write/modification permissions.',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
  },
];

export const PERMISSION_MATRIX: Record<UserRole, Record<PermissionModule, PermissionAction[]>> = {
  SUPER_ADMIN: {
    CUSTOMERS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE'],
    WAREHOUSES: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'CLOSE'],
    CAPACITY: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'CLOSE'],
    ALLOCATIONS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'RELEASE', 'CLOSE'],
    INVENTORY: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'RELEASE'],
    PACKING_LIST: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'SUBMIT'],
    CREW_SHEET: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'ASSIGN', 'SUBMIT', 'SIGN'],
    PACKING_MATERIAL: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'SUBMIT'],
    BOX_COLLECTION: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'SUBMIT'],
    WALKTHROUGH: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'SUBMIT', 'SIGN'],
    CONTRACTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'CLOSE'],
    DOCUMENTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'UPLOAD'],
    BILLING: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'RECONCILE', 'CLOSE'],
    EMPLOYEES: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN', 'APPROVE'],
    REPORTS: ['VIEW', 'EXPORT'],
    AUDIT: ['VIEW', 'EXPORT'],
    SETTINGS: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
  },
  STORAGE_MANAGER: {
    CUSTOMERS: ['VIEW', 'CREATE', 'EDIT', 'APPROVE'],
    WAREHOUSES: ['VIEW', 'CREATE', 'EDIT', 'CLOSE'],
    CAPACITY: ['VIEW', 'EDIT', 'CLOSE'],
    ALLOCATIONS: ['VIEW', 'CREATE', 'EDIT', 'APPROVE', 'RELEASE', 'CLOSE'],
    INVENTORY: ['VIEW', 'CREATE', 'EDIT', 'RELEASE'],
    PACKING_LIST: ['VIEW', 'CREATE', 'EDIT', 'APPROVE', 'SUBMIT'],
    CREW_SHEET: ['VIEW', 'CREATE', 'EDIT', 'APPROVE', 'ASSIGN', 'SUBMIT', 'SIGN'],
    PACKING_MATERIAL: ['VIEW', 'CREATE', 'EDIT', 'APPROVE', 'SUBMIT'],
    BOX_COLLECTION: ['VIEW', 'CREATE', 'EDIT', 'APPROVE', 'SUBMIT'],
    WALKTHROUGH: ['VIEW', 'CREATE', 'EDIT', 'APPROVE', 'SUBMIT', 'SIGN'],
    CONTRACTS: ['VIEW', 'CREATE', 'EDIT', 'APPROVE'],
    DOCUMENTS: ['VIEW', 'CREATE', 'EDIT', 'UPLOAD', 'APPROVE'],
    BILLING: ['VIEW'],
    EMPLOYEES: ['VIEW', 'CREATE', 'EDIT', 'ASSIGN'],
    REPORTS: ['VIEW', 'EXPORT'],
    AUDIT: ['VIEW'],
    SETTINGS: ['VIEW'],
  },
  STORAGE_OPERATOR: {
    CUSTOMERS: ['VIEW'],
    WAREHOUSES: ['VIEW'],
    CAPACITY: ['VIEW'],
    ALLOCATIONS: ['VIEW'],
    INVENTORY: ['VIEW', 'CREATE', 'EDIT'],
    PACKING_LIST: ['VIEW', 'SUBMIT'], // Submit extra items; CANNOT EDIT/APPROVE approved packing list
    CREW_SHEET: ['VIEW', 'SUBMIT', 'SIGN'], // Submit crew sheet, sign; CANNOT ASSIGN
    PACKING_MATERIAL: ['VIEW', 'SUBMIT'], // Submit material out/in; CANNOT APPROVE or edit master catalogue
    BOX_COLLECTION: ['VIEW', 'SUBMIT'],
    WALKTHROUGH: ['VIEW', 'SUBMIT', 'SIGN'], // Submit walkthrough & sign
    CONTRACTS: ['VIEW'],
    DOCUMENTS: ['VIEW'],
    BILLING: [],
    EMPLOYEES: ['VIEW'],
    REPORTS: ['VIEW'],
    AUDIT: ['VIEW'],
    SETTINGS: [],
  },
  BILLING_USER: {
    CUSTOMERS: ['VIEW'],
    WAREHOUSES: ['VIEW'],
    CAPACITY: ['VIEW'],
    ALLOCATIONS: ['VIEW'],
    INVENTORY: ['VIEW'],
    PACKING_LIST: ['VIEW'],
    CREW_SHEET: ['VIEW'],
    PACKING_MATERIAL: ['VIEW'],
    BOX_COLLECTION: ['VIEW'],
    WALKTHROUGH: ['VIEW'],
    CONTRACTS: ['VIEW'],
    DOCUMENTS: ['VIEW'],
    BILLING: ['VIEW', 'CREATE', 'EDIT', 'APPROVE', 'RECONCILE', 'CLOSE'],
    EMPLOYEES: ['VIEW'],
    REPORTS: ['VIEW', 'EXPORT'],
    AUDIT: ['VIEW'],
    SETTINGS: [],
  },
  DOCUMENT_COMPLIANCE_USER: {
    CUSTOMERS: ['VIEW'],
    WAREHOUSES: ['VIEW'],
    CAPACITY: ['VIEW'],
    ALLOCATIONS: ['VIEW'],
    INVENTORY: ['VIEW'],
    PACKING_LIST: ['VIEW'],
    CREW_SHEET: ['VIEW'],
    PACKING_MATERIAL: ['VIEW'],
    BOX_COLLECTION: ['VIEW'],
    WALKTHROUGH: ['VIEW'],
    CONTRACTS: ['VIEW', 'EDIT'],
    DOCUMENTS: ['VIEW', 'CREATE', 'EDIT', 'UPLOAD', 'APPROVE', 'DELETE'],
    BILLING: [],
    EMPLOYEES: ['VIEW', 'UPLOAD'],
    REPORTS: ['VIEW'],
    AUDIT: ['VIEW'],
    SETTINGS: [],
  },
  HR_ADMIN: {
    CUSTOMERS: ['VIEW'],
    WAREHOUSES: ['VIEW'],
    CAPACITY: ['VIEW'],
    ALLOCATIONS: ['VIEW'],
    INVENTORY: ['VIEW'],
    PACKING_LIST: ['VIEW'],
    CREW_SHEET: ['VIEW', 'ASSIGN'],
    PACKING_MATERIAL: ['VIEW'],
    BOX_COLLECTION: ['VIEW'],
    WALKTHROUGH: ['VIEW'],
    CONTRACTS: ['VIEW'],
    DOCUMENTS: ['VIEW', 'CREATE', 'EDIT', 'UPLOAD', 'APPROVE', 'DELETE'],
    BILLING: [],
    EMPLOYEES: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN', 'UPLOAD'],
    REPORTS: ['VIEW'],
    AUDIT: ['VIEW'],
    SETTINGS: [],
  },
  READ_ONLY_USER: {
    CUSTOMERS: ['VIEW'],
    WAREHOUSES: ['VIEW'],
    CAPACITY: ['VIEW'],
    ALLOCATIONS: ['VIEW'],
    INVENTORY: ['VIEW'],
    PACKING_LIST: ['VIEW'],
    CREW_SHEET: ['VIEW'],
    PACKING_MATERIAL: ['VIEW'],
    BOX_COLLECTION: ['VIEW'],
    WALKTHROUGH: ['VIEW'],
    CONTRACTS: ['VIEW'],
    DOCUMENTS: ['VIEW'],
    BILLING: ['VIEW'],
    EMPLOYEES: ['VIEW'],
    REPORTS: ['VIEW'],
    AUDIT: ['VIEW'],
    SETTINGS: ['VIEW'],
  },
};

/** A user's own permission set (set by a Super Admin). Missing modules mean "no access". */
export type PermissionSet = Partial<Record<PermissionModule, PermissionAction[]>>;

export interface PermissionContext {
  /** the signed-in user's base role (drives the role-specific business rules) */
  role: UserRole;
  /** the signed-in user's effective permissions */
  permissions: PermissionSet;
}

/**
 * Who is acting right now. On the server this is the authenticated request's user, in the browser it is the
 * signed-in user. Outside both (UAT scripts) it is undefined and the `role` argument decides.
 * Kept on globalThis so every module instance sees the same provider.
 */
export function currentPermissionContext(): PermissionContext | undefined {
  return (globalThis as { __moveitPermCtx?: () => PermissionContext | undefined }).__moveitPermCtx?.();
}

export function setPermissionContextProvider(fn: () => PermissionContext | undefined) {
  (globalThis as { __moveitPermCtx?: () => PermissionContext | undefined }).__moveitPermCtx = fn;
}

/** The preset permission set of a built-in role (copied, so callers may edit it). */
export function presetPermissions(role: UserRole): PermissionSet {
  const out: PermissionSet = {};
  for (const [module, actions] of Object.entries(PERMISSION_MATRIX[role] ?? {})) out[module as PermissionModule] = [...(actions as PermissionAction[])];
  return out;
}

export const PERMISSION_MODULES: PermissionModule[] = [
  'CUSTOMERS', 'WAREHOUSES', 'CAPACITY', 'ALLOCATIONS', 'INVENTORY', 'PACKING_LIST', 'CREW_SHEET', 'PACKING_MATERIAL',
  'BOX_COLLECTION', 'WALKTHROUGH', 'CONTRACTS', 'DOCUMENTS', 'BILLING', 'EMPLOYEES', 'REPORTS', 'AUDIT', 'SETTINGS',
];

export const PERMISSION_ACTIONS: PermissionAction[] = [
  'VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'REJECT', 'ASSIGN', 'RELEASE', 'CLOSE', 'EXPORT', 'UPLOAD', 'SUBMIT', 'SIGN', 'RECONCILE',
];

export function hasPermission(role: UserRole, module: PermissionModule, action: PermissionAction): boolean {
  const ctx = currentPermissionContext();
  if (ctx) return (ctx.permissions[module] ?? []).includes(action);
  const modulePerms = PERMISSION_MATRIX[role]?.[module];
  if (!modulePerms) return false;
  return modulePerms.includes(action);
}
