import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import postgres from "postgres";

/**
 * Storage for the MoveIt backend. Two interchangeable stores:
 *  - SQLite (default): synchronous. MOVEIT_DB_PATH = file path (default ./data/moveit.db) or ":memory:" (UAT scripts).
 *  - Postgres (Supabase, Neon, ...): asynchronous. Used when DATABASE_URL is set.
 * Both keep the same five tables; see persistence.ts for how they are used.
 */

export interface Snapshot {
  initialised: boolean;
  objects: { kind: string; id: string; data: string }[];
  arrayNames: string[];
  arrays: { name: string; kind: string; id: string }[];
  blobs: { name: string; data: string }[];
}

export interface ChangeSet {
  upserts: [kind: string, id: string, data: string][];
  removed: [kind: string, id: string][];
  arrayWrites: { name: string; refs: [kind: string, id: string][] }[];
  blobWrites: [name: string, data: string][];
}

export const isEmptyChange = (c: ChangeSet) => !c.upserts.length && !c.removed.length && !c.arrayWrites.length && !c.blobWrites.length;

export interface SqliteStore {
  kind: "sqlite";
  load(): Snapshot;
  write(c: ChangeSet): void;
  markInitialised(seed: string): void;
}

export interface PostgresStore {
  kind: "postgres";
  load(): Promise<Snapshot>;
  write(c: ChangeSet): Promise<void>;
  markInitialised(seed: string): Promise<void>;
}

export type Store = SqliteStore | PostgresStore;

export const usesPostgres = () => !!process.env.DATABASE_URL;

export function openStore(): Store {
  return usesPostgres() ? openPostgres(process.env.DATABASE_URL as string) : openSqlite();
}

// ---------------------------------------------------------------- SQLite

function openSqlite(): SqliteStore {
  // loaded lazily so a Postgres-only deployment never touches the native module
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SqliteDatabase = require("better-sqlite3") as typeof import("better-sqlite3");
  const target = process.env.MOVEIT_DB_PATH || path.join(process.cwd(), "data", "moveit.db");
  if (target !== ":memory:") fs.mkdirSync(path.dirname(target), { recursive: true });
  const db: Database.Database = new SqliteDatabase(target);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS objects (
      kind TEXT NOT NULL,
      id   TEXT NOT NULL,
      data TEXT NOT NULL,
      PRIMARY KEY (kind, id)
    );
    CREATE TABLE IF NOT EXISTS arrays (
      name TEXT NOT NULL,
      pos  INTEGER NOT NULL,
      kind TEXT NOT NULL,
      id   TEXT NOT NULL,
      PRIMARY KEY (name, pos)
    );
    CREATE TABLE IF NOT EXISTS array_names (name TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS blobs (name TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);

  return {
    kind: "sqlite",
    load() {
      const initialised = !!db.prepare("SELECT value FROM meta WHERE key='initialised'").get();
      return {
        initialised,
        objects: db.prepare("SELECT kind,id,data FROM objects").all() as Snapshot["objects"],
        arrayNames: (db.prepare("SELECT name FROM array_names").all() as { name: string }[]).map((r) => r.name),
        arrays: db.prepare("SELECT name,kind,id FROM arrays ORDER BY name,pos").all() as Snapshot["arrays"],
        blobs: db.prepare("SELECT name,data FROM blobs").all() as Snapshot["blobs"],
      };
    },
    write(c) {
      const upObj = db.prepare("INSERT INTO objects(kind,id,data) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data");
      const delObj = db.prepare("DELETE FROM objects WHERE kind=? AND id=?");
      const delArr = db.prepare("DELETE FROM arrays WHERE name=?");
      const insArr = db.prepare("INSERT INTO arrays(name,pos,kind,id) VALUES(?,?,?,?)");
      const insName = db.prepare("INSERT OR IGNORE INTO array_names(name) VALUES(?)");
      const upBlob = db.prepare("INSERT INTO blobs(name,data) VALUES(?,?) ON CONFLICT(name) DO UPDATE SET data=excluded.data");
      db.transaction(() => {
        for (const [k, id, data] of c.upserts) upObj.run(k, id, data);
        for (const [k, id] of c.removed) delObj.run(k, id);
        for (const w of c.arrayWrites) {
          delArr.run(w.name);
          w.refs.forEach(([k, id], pos) => insArr.run(w.name, pos, k, id));
          insName.run(w.name);
        }
        for (const [name, data] of c.blobWrites) upBlob.run(name, data);
      })();
    },
    markInitialised(seed) {
      const up = db.prepare("INSERT OR REPLACE INTO meta(key,value) VALUES(?, ?)");
      up.run("initialised", new Date().toISOString());
      up.run("seed", seed);
    },
  };
}

// ---------------------------------------------------------------- Postgres

const CHUNK = 1000;
function chunks<T>(rows: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(rows.slice(i, i + CHUNK));
  return out;
}

function openPostgres(url: string): PostgresStore {
  // prepare:false keeps this working through Supabase's pooled (pgbouncer, transaction mode) connection string
  const sql = postgres(url, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 15, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require", onnotice: () => {}, debug: process.env.MOVEIT_PG_DEBUG ? (_c, q) => console.log(`[moveit-pg ${new Date().toISOString().slice(11, 23)}]`, String(q).replace(/\s+/g, " ").slice(0, 90)) : undefined });
  let schema: Promise<void> | null = null;
  // one round trip: the database can be far from the server (e.g. Vercel -> Singapore), so every query counts
  const ensureSchema = () =>
    (schema ??= sql
      .unsafe(
        `CREATE TABLE IF NOT EXISTS objects (kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (kind, id));
         CREATE TABLE IF NOT EXISTS arrays (name TEXT NOT NULL, pos INTEGER NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, PRIMARY KEY (name, pos));
         CREATE TABLE IF NOT EXISTS array_names (name TEXT PRIMARY KEY);
         CREATE TABLE IF NOT EXISTS blobs (name TEXT PRIMARY KEY, data TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`
      )
      .then(() => undefined)
      .catch((e) => {
        schema = null;
        throw e;
      }));

  return {
    kind: "postgres",
    async load() {
      await ensureSchema();
      // One statement on one connection: parallel queries stall behind Supabase's transaction pooler.
      const [row] = await sql<{ initialised: boolean; objects: Snapshot["objects"]; names: string[]; arrays: Snapshot["arrays"]; blobs: Snapshot["blobs"] }[]>`
        SELECT
          EXISTS (SELECT 1 FROM meta WHERE key = 'initialised') AS initialised,
          (SELECT COALESCE(json_agg(json_build_object('kind', kind, 'id', id, 'data', data)), '[]'::json) FROM objects) AS objects,
          (SELECT COALESCE(json_agg(name), '[]'::json) FROM array_names) AS names,
          (SELECT COALESCE(json_agg(json_build_object('name', name, 'kind', kind, 'id', id) ORDER BY name, pos), '[]'::json) FROM arrays) AS arrays,
          (SELECT COALESCE(json_agg(json_build_object('name', name, 'data', data)), '[]'::json) FROM blobs) AS blobs`;
      return { initialised: row.initialised, objects: row.objects, arrayNames: row.names, arrays: row.arrays, blobs: row.blobs };
    },
    async write(c) {
      await ensureSchema();
      // A fixed, small number of statements per write (never one per row or per array).
      await sql.begin(async (tx) => {
        for (const part of chunks(c.upserts.map(([kind, id, data]) => ({ kind, id, data })))) {
          await tx`INSERT INTO objects ${tx(part, "kind", "id", "data")} ON CONFLICT (kind, id) DO UPDATE SET data = EXCLUDED.data`;
        }
        if (c.removed.length) {
          const kinds = c.removed.map(([k]) => k);
          const ids = c.removed.map(([, id]) => id);
          await tx`DELETE FROM objects o USING unnest(${kinds}::text[], ${ids}::text[]) AS r(kind, id) WHERE o.kind = r.kind AND o.id = r.id`;
        }
        if (c.arrayWrites.length) {
          const names = c.arrayWrites.map((w) => w.name);
          await tx`DELETE FROM arrays WHERE name = ANY(${names}::text[])`;
          const rows = c.arrayWrites.flatMap((w) => w.refs.map(([kind, id], pos) => ({ name: w.name, pos, kind, id })));
          for (const part of chunks(rows)) await tx`INSERT INTO arrays ${tx(part, "name", "pos", "kind", "id")}`;
          await tx`INSERT INTO array_names ${tx(names.map((name) => ({ name })), "name")} ON CONFLICT DO NOTHING`;
        }
        if (c.blobWrites.length) {
          await tx`INSERT INTO blobs ${tx(c.blobWrites.map(([name, data]) => ({ name, data })), "name", "data")} ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data`;
        }
      });
    },
    async markInitialised(seed) {
      await ensureSchema();
      const now = new Date().toISOString();
      await sql`INSERT INTO meta (key, value) VALUES ('initialised', ${now}), ('seed', ${seed}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
    },
  };
}
