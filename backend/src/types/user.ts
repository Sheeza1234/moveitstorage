import { PermissionSet, UserRole } from "./role";

export type UserStatus = "ACTIVE" | "DISABLED";

/** A portal user as the browser sees it (never contains the password hash). */
export interface AppUser {
  id: string;
  name: string;
  email: string;
  /** base role: the starting preset and the label shown for the user */
  role: UserRole;
  /** what this user may actually do, per module (editable by a Super Admin) */
  permissions: PermissionSet;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  createdBy?: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  /** defaults to the role's preset */
  permissions?: PermissionSet;
  status?: UserStatus;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  permissions?: PermissionSet;
  status?: UserStatus;
}
