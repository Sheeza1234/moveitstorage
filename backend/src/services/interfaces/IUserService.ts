import { AppUser, CreateUserInput, UpdateUserInput } from "@/types";

/**
 * User administration. Every method is authorized on the server with the caller's own permissions:
 * list / update / reset need SETTINGS:EDIT, create needs SETTINGS:CREATE, delete needs SETTINGS:DELETE
 * (in the default presets only a Super Admin has these).
 */
export interface IUserService {
  listUsers(): Promise<AppUser[]>;
  createUser(input: CreateUserInput): Promise<AppUser>;
  updateUser(id: string, input: UpdateUserInput): Promise<AppUser>;
  resetPassword(id: string, newPassword: string): Promise<AppUser>;
  deleteUser(id: string): Promise<void>;
}
