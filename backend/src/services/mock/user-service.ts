import crypto from "node:crypto";
import { IUserService } from "../interfaces/IUserService";
import {
  AppUser,
  CreateUserInput,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  PermissionSet,
  UpdateUserInput,
  USER_ROLES,
  UserRole,
  hasPermission,
  presetPermissions,
} from "@/types";
import { auditService } from "./audit-service";
import { getRequestUser } from "@/server/request-context";
import { PermissionError } from "@/server/errors";

interface StoredUser extends AppUser {
  passwordHash: string;
  salt: string;
  failedAttempts?: number;
  lockedUntil?: number;
}

interface StoredSession {
  id: string; // sha256 of the cookie token
  userId: string;
  createdAt: string;
  expiresAt: number;
}

const SESSION_HOURS = 12;
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 5;
const ROLE_IDS = new Set<string>(USER_ROLES.map((r) => r.id));

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");
const hashPassword = (password: string, salt: string) => crypto.scryptSync(password, salt, 64).toString("hex");
const normEmail = (e: string) => e.trim().toLowerCase();

function pub(u: StoredUser): AppUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, salt, failedAttempts, lockedUntil, ...rest } = u;
  return JSON.parse(JSON.stringify(rest)) as AppUser;
}

/** Keeps only known modules / actions so a crafted request cannot store junk permissions. */
function cleanPermissions(input: PermissionSet | undefined, fallbackRole: UserRole): PermissionSet {
  if (!input) return presetPermissions(fallbackRole);
  const out: PermissionSet = {};
  for (const m of PERMISSION_MODULES) {
    const actions = (input[m] ?? []).filter((a) => PERMISSION_ACTIONS.includes(a));
    if (actions.length) out[m] = [...new Set(actions)];
  }
  return out;
}

export class MockUserService implements IUserService {
  private users: StoredUser[] = [];
  private sessions: StoredSession[] = [];

  /* ------------------------------ administration (RPC) ------------------------------ */

  private require(action: "CREATE" | "EDIT" | "DELETE") {
    const actor = getRequestUser();
    if (!actor || !hasPermission(actor.role, "SETTINGS", action)) {
      throw new PermissionError("Only a Super Admin can manage users and their access.");
    }
    return actor;
  }

  private activeAdmins(excludeId?: string) {
    return this.users.filter((u) => u.id !== excludeId && u.status === "ACTIVE" && u.role === "SUPER_ADMIN" && (u.permissions.SETTINGS ?? []).includes("EDIT"));
  }

  async listUsers(): Promise<AppUser[]> {
    this.require("EDIT");
    return this.users.map(pub).sort((a, b) => a.name.localeCompare(b.name));
  }

  async createUser(input: CreateUserInput): Promise<AppUser> {
    const actor = this.require("CREATE");
    const name = (input.name ?? "").trim();
    const email = normEmail(input.email ?? "");
    if (!name) throw new Error("Name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    if ((input.password ?? "").length < 8) throw new Error("The password must be at least 8 characters.");
    if (!ROLE_IDS.has(input.role)) throw new Error("Choose a valid role.");
    if (this.users.some((u) => u.email === email)) throw new Error(`A user with the email '${email}' already exists.`);

    const salt = crypto.randomBytes(16).toString("hex");
    const now = new Date().toISOString();
    const user: StoredUser = {
      id: `usr-${crypto.randomBytes(6).toString("hex")}`,
      name,
      email,
      role: input.role,
      permissions: cleanPermissions(input.permissions, input.role),
      status: input.status ?? "ACTIVE",
      createdAt: now,
      updatedAt: now,
      createdBy: actor.name,
      salt,
      passwordHash: hashPassword(input.password, salt),
    };
    this.users.push(user);
    await auditService.recordEvent({
      entityType: "SECURITY",
      entityId: user.id,
      action: "USER_CREATED",
      description: `User '${user.name}' (${user.email}) created with role ${user.role}.`,
      performedBy: actor.name,
      metadata: { role: user.role },
    });
    return pub(user);
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<AppUser> {
    const actor = this.require("EDIT");
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new Error("User not found.");

    const nextRole = input.role ?? user.role;
    const nextStatus = input.status ?? user.status;
    const nextPerms = input.permissions ? cleanPermissions(input.permissions, nextRole) : input.role && input.role !== user.role ? presetPermissions(nextRole) : user.permissions;
    if (input.role && !ROLE_IDS.has(input.role)) throw new Error("Choose a valid role.");

    // the system must always keep someone who can manage users
    const staysAdmin = nextStatus === "ACTIVE" && nextRole === "SUPER_ADMIN" && (nextPerms.SETTINGS ?? []).includes("EDIT");
    if (!staysAdmin && this.activeAdmins(user.id).length === 0 && this.activeAdmins().some((a) => a.id === user.id)) {
      throw new Error("This is the last active Super Admin. Create another one before changing this account.");
    }
    if (user.id === actor.id && nextStatus === "DISABLED") throw new Error("You cannot disable your own account.");

    if (input.name !== undefined) {
      if (!input.name.trim()) throw new Error("Name is required.");
      user.name = input.name.trim();
    }
    user.role = nextRole;
    user.permissions = nextPerms;
    user.status = nextStatus;
    user.updatedAt = new Date().toISOString();
    if (nextStatus === "DISABLED") { const kept = this.sessions.filter((s) => s.userId !== user.id); this.sessions.splice(0, this.sessions.length, ...kept); }
    await auditService.recordEvent({
      entityType: "SECURITY",
      entityId: user.id,
      action: "USER_UPDATED",
      description: `User '${user.name}' updated (role ${user.role}, ${user.status}).`,
      performedBy: actor.name,
      metadata: { role: user.role, status: user.status },
    });
    return pub(user);
  }

  async resetPassword(id: string, newPassword: string): Promise<AppUser> {
    const actor = this.require("EDIT");
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new Error("User not found.");
    if ((newPassword ?? "").length < 8) throw new Error("The password must be at least 8 characters.");
    user.salt = crypto.randomBytes(16).toString("hex");
    user.passwordHash = hashPassword(newPassword, user.salt);
    user.failedAttempts = 0;
    user.lockedUntil = undefined;
    user.updatedAt = new Date().toISOString();
    { const kept = this.sessions.filter((s) => s.userId !== user.id); this.sessions.splice(0, this.sessions.length, ...kept); } // sign the user out everywhere
    await auditService.recordEvent({
      entityType: "SECURITY",
      entityId: user.id,
      action: "USER_PASSWORD_RESET",
      description: `Password reset for '${user.name}'.`,
      performedBy: actor.name,
    });
    return pub(user);
  }

  async deleteUser(id: string): Promise<void> {
    const actor = this.require("DELETE");
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new Error("User not found.");
    if (user.id === actor.id) throw new Error("You cannot delete your own account.");
    if (this.activeAdmins(user.id).length === 0 && this.activeAdmins().some((a) => a.id === user.id)) {
      throw new Error("This is the last active Super Admin and cannot be deleted.");
    }
    { const kept = this.users.filter((u) => u.id !== id); this.users.splice(0, this.users.length, ...kept); }
    { const kept = this.sessions.filter((s) => s.userId !== id); this.sessions.splice(0, this.sessions.length, ...kept); }
    await auditService.recordEvent({
      entityType: "SECURITY",
      entityId: id,
      action: "USER_DELETED",
      description: `User '${user.name}' (${user.email}) deleted.`,
      performedBy: actor.name,
    });
  }

  /* ------------- authentication (NOT on the RPC interface: used by /api/auth only) ------------- */

  async authenticate(emailRaw: string, password: string): Promise<AppUser | null> {
    const email = normEmail(emailRaw ?? "");
    const user = this.users.find((u) => u.email === email);
    const now = Date.now();
    if (user?.lockedUntil && user.lockedUntil > now) {
      throw new Error(`Too many failed attempts. Try again in ${Math.ceil((user.lockedUntil - now) / 60000)} minute(s).`);
    }
    // hash even for unknown emails so response time does not reveal which accounts exist
    const salt = user?.salt ?? "0".repeat(32);
    const candidate = hashPassword(password ?? "", salt);
    const ok = Boolean(user) && crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(user!.passwordHash, "hex"));
    if (!user || !ok || user.status !== "ACTIVE") {
      if (user && !ok) {
        user.failedAttempts = (user.failedAttempts ?? 0) + 1;
        if (user.failedAttempts >= MAX_ATTEMPTS) {
          user.lockedUntil = now + LOCK_MINUTES * 60000;
          user.failedAttempts = 0;
        }
        await auditService.recordEvent({ entityType: "SECURITY", entityId: user.id, action: "USER_LOGIN_FAILED", description: `Failed sign-in for '${user.email}'.`, performedBy: user.email });
      }
      return null;
    }
    user.failedAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date().toISOString();
    await auditService.recordEvent({ entityType: "SECURITY", entityId: user.id, action: "USER_LOGIN", description: `'${user.name}' signed in.`, performedBy: user.name });
    return pub(user);
  }

  createSession(userId: string): { token: string; maxAgeSeconds: number } {
    { const kept = this.sessions.filter((s) => s.expiresAt > Date.now()); this.sessions.splice(0, this.sessions.length, ...kept); }
    const token = crypto.randomBytes(32).toString("hex");
    this.sessions.push({ id: sha256(token), userId, createdAt: new Date().toISOString(), expiresAt: Date.now() + SESSION_HOURS * 3600_000 });
    return { token, maxAgeSeconds: SESSION_HOURS * 3600 };
  }

  resolveSession(token: string | undefined): AppUser | null {
    if (!token) return null;
    const id = sha256(token);
    const session = this.sessions.find((s) => s.id === id);
    if (!session || session.expiresAt < Date.now()) return null;
    const user = this.users.find((u) => u.id === session.userId);
    return user && user.status === "ACTIVE" ? pub(user) : null;
  }

  destroySession(token: string | undefined) {
    if (token) { const kept = this.sessions.filter((s) => s.id !== sha256(token)); this.sessions.splice(0, this.sessions.length, ...kept); }
  }

  /** First start: make sure somebody can sign in. Returns a generated password when one had to be invented. */
  ensureBootstrap(opts: { sample: boolean; production: boolean }): { email: string; password: string; generated: boolean } | null {
    if (this.users.length > 0) return null;
    const email = normEmail(process.env.MOVEIT_ADMIN_EMAIL || "admin@moveit.local");
    const given = process.env.MOVEIT_ADMIN_PASSWORD;
    const password = given || (opts.production ? crypto.randomBytes(9).toString("base64url") : "Admin@12345");
    const mk = (name: string, mail: string, role: UserRole, pw: string): StoredUser => {
      const salt = crypto.randomBytes(16).toString("hex");
      const now = new Date().toISOString();
      return { id: `usr-${crypto.randomBytes(6).toString("hex")}`, name, email: mail, role, permissions: presetPermissions(role), status: "ACTIVE", createdAt: now, updatedAt: now, createdBy: "system", salt, passwordHash: hashPassword(pw, salt) };
    };
    this.users.push(mk("System Administrator", email, "SUPER_ADMIN", password));
    if (opts.sample && !opts.production) {
      // development convenience: one account per built-in role so each menu can be tried
      for (const r of USER_ROLES.filter((x) => x.id !== "SUPER_ADMIN")) {
        this.users.push(mk(r.name, `${r.id.toLowerCase().replace(/_/g, ".")}@moveit.local`, r.id, "Moveit@12345"));
      }
    }
    return { email, password, generated: !given };
  }
}
