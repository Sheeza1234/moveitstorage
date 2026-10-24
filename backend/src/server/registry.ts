import * as mockDb from "@/services/mock/mock-db";
import { ServiceRegistryShape } from "@/services/registry-types";
import { openStore, usesPostgres } from "./db";
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

function build(): Backend {
  const services = new ServerServiceRegistry() as unknown as ServiceRegistryShape;
  const persistence = new Persistence(openStore());
  const shared: Record<string, unknown[]> = {};
  for (const [name, value] of Object.entries(mockDb)) if (Array.isArray(value)) shared[`db.${name}`] = value;
  persistence.collect(shared, services as unknown as Record<string, object>);
  return { services, persistence };
}

/** Makes sure somebody can sign in on a brand-new database. Returns true when state changed. */
function ensureAdmin(services: ServiceRegistryShape): boolean {
  const users = services.userService as unknown as MockUserService;
  const boot = users.ensureBootstrap({ sample: seedMode() === "sample", production: process.env.NODE_ENV === "production" });
  if (!boot) return false;
  const where = `[moveit] First start: created the administrator account ${boot.email}`;
  const prod = process.env.NODE_ENV === "production";
  console.log(
    !boot.generated
      ? `${where} with the password from MOVEIT_ADMIN_PASSWORD.`
      : prod
        ? `${where}\n[moveit] Temporary password: ${boot.password}   (shown once: sign in and change it from Users & Access)`
        : `${where}\n[moveit] Development password: ${boot.password}   (set MOVEIT_ADMIN_PASSWORD to choose your own)`
  );
  return true;
}

/** SQLite: synchronous, so scripts and handlers can use the services immediately. */
function create(): Backend {
  const b = build();
  b.persistence.init(seedMode());
  if (ensureAdmin(b.services)) b.persistence.persist();
  return b;
}

/** Postgres: the connection is asynchronous, so startup is too. */
async function createAsync(): Promise<Backend> {
  const b = build();
  await b.persistence.initAsync(seedMode());
  if (ensureAdmin(b.services)) await b.persistence.persist();
  return b;
}

const READY = "__moveitBackendReady";

function backend(): Backend {
  const g = globalThis as unknown as Record<string, Backend | undefined>;
  if (usesPostgres() && !g[KEY]) throw new Error("Backend is not ready yet (Postgres): wrap the call in withBackend().");
  return (g[KEY] ??= create());
}

let lock: Promise<unknown> = Promise.resolve();

/**
 * Runs one request against the backend.
 *  - SQLite: just runs it (the state lives in this process and is the only copy).
 *  - Postgres: the database is shared by every server instance (e.g. Vercel functions), so requests run one at a time per
 *    instance, and memory is refreshed from the database first so another instance's changes are not overwritten.
 */
export async function withBackend<T>(fn: () => Promise<T> | T): Promise<T> {
  if (!usesPostgres()) return fn();
  const run = async () => {
    const g = globalThis as unknown as Record<string, Backend | Promise<Backend> | undefined>;
    if (!g[KEY]) {
      g[READY] ??= createAsync().then((b) => (g[KEY] = b)).catch((e) => { g[READY] = undefined; throw e; });
      await g[READY];
    } else {
      await (g[KEY] as Backend).persistence.reload();
    }
    return fn();
  };
  const result = lock.then(run, run);
  lock = result.catch(() => undefined);
  return result;
}

export const getServerServices = () => backend().services;
export const persistBackend = () => backend().persistence.persist();  // await it: a Promise with Postgres

/** Server-side `services` for scripts and tests (identical API to the browser client). */
export const services: ServiceRegistryShape = new Proxy({} as ServiceRegistryShape, {
  get: (_t, prop) => (getServerServices() as unknown as Record<string | symbol, unknown>)[prop],
});
