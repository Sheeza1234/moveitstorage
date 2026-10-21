import * as mockDb from "@/services/mock/mock-db";
import { ServiceRegistryShape } from "@/services/registry-types";
import { openDatabase } from "./db";
import { Persistence, SeedMode } from "./persistence";
import { ServerServiceRegistry } from "./service-registry";
import type { MockUserService } from "@/services/mock/user-service";

/**
 * Process-wide backend: the real service instances plus their database. Cached on globalThis so every
 * route handler (and Next's dev reloads) shares one instance and one SQLite connection.
 */
interface Backend {
  services: ServiceRegistryShape;
  persistence: Persistence;
}

const KEY = "__moveitBackend";

function seedMode(): SeedMode {
  const v = process.env.MOVEIT_SEED;
  if (v === "none" || v === "sample") return v;
  return process.env.NODE_ENV === "production" ? "none" : "sample";
}

function create(): Backend {
  const services = new ServerServiceRegistry() as unknown as ServiceRegistryShape;
  const persistence = new Persistence(openDatabase());
  const shared: Record<string, unknown[]> = {};
  for (const [name, value] of Object.entries(mockDb)) if (Array.isArray(value)) shared[`db.${name}`] = value;
  persistence.collect(shared, services as unknown as Record<string, object>);
  persistence.init(seedMode());

  // make sure somebody can sign in on a brand-new database
  const users = services.userService as unknown as MockUserService;
  const boot = users.ensureBootstrap({ sample: seedMode() === "sample", production: process.env.NODE_ENV === "production" });
  if (boot) {
    persistence.persist();
    const where = `[moveit] First start: created the administrator account ${boot.email}`;
    const prod = process.env.NODE_ENV === "production";
    console.log(
      !boot.generated
        ? `${where} with the password from MOVEIT_ADMIN_PASSWORD.`
        : prod
          ? `${where}\n[moveit] Temporary password: ${boot.password}   (shown once: sign in and change it from Users & Access)`
          : `${where}\n[moveit] Development password: ${boot.password}   (set MOVEIT_ADMIN_PASSWORD to choose your own)`
    );
  }
  return { services, persistence };
}

function backend(): Backend {
  const g = globalThis as unknown as Record<string, Backend | undefined>;
  return (g[KEY] ??= create());
}

export const getServerServices = () => backend().services;
export const persistBackend = () => backend().persistence.persist();

/** Server-side `services` for scripts and tests (identical API to the browser client). */
export const services: ServiceRegistryShape = new Proxy({} as ServiceRegistryShape, {
  get: (_t, prop) => (getServerServices() as unknown as Record<string | symbol, unknown>)[prop],
});
