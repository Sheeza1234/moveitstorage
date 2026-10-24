import { isEmptyChange, type ChangeSet, type Snapshot, type Store } from "./db";

/**
 * Durable state for the service layer.
 *
 * The service classes keep their state in plain arrays, and several of those arrays SHARE the same
 * objects (e.g. the warehouse service holds a copy of the warehouse list while the inventory service
 * mutates the same warehouse objects). To keep that behaviour intact across restarts this layer:
 *  - discovers every array reachable from the service instances (and the shared seed arrays),
 *  - stores each distinct object once (table `objects`, keyed by kind + id),
 *  - stores each array as an ordered list of references (table `arrays`),
 *  - on boot restores objects IN PLACE so shared references stay shared.
 * Arrays whose elements have no id are stored as a JSON blob.
 */

type Json = unknown;
interface Tracked {
  name: string;
  arr: Json[];
}

const SEP = "\u0000";
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const hasId = (v: unknown): v is Record<string, unknown> & { id: string | number } =>
  isObj(v) && (typeof v.id === "string" || typeof v.id === "number");

function replaceInPlace(target: Record<string, unknown>, src: Record<string, unknown>) {
  for (const k of Object.keys(target)) if (!(k in src)) delete target[k];
  Object.assign(target, src);
}

export type SeedMode = "sample" | "none";

export class Persistence {
  private tracked: Tracked[] = [];
  private kindOf = new WeakMap<object, string>();
  private byKey = new Map<string, Record<string, unknown>>();
  private objSig = new Map<string, string>();
  private arrSig = new Map<string, string>();
  private blobSig = new Map<string, string>();
  private liveKeys = new Set<string>();

  constructor(private store: Store) {}

  /** Register every array reachable from the given roots. `named` arrays (shared seeds) take precedence. */
  collect(named: Record<string, Json[]>, roots: Record<string, object>) {
    const seen = new Set<object>();
    const add = (name: string, arr: Json[]) => {
      if (seen.has(arr)) return;
      seen.add(arr);
      this.tracked.push({ name, arr });
    };
    for (const [name, arr] of Object.entries(named)) add(name, arr);

    const visit = (obj: object, path: string, depth: number) => {
      if (depth > 3 || seen.has(obj)) return;
      seen.add(obj);
      for (const prop of Object.getOwnPropertyNames(obj)) {
        let value: unknown;
        try {
          value = (obj as Record<string, unknown>)[prop];
        } catch {
          continue;
        }
        if (Array.isArray(value)) add(`${path}.${prop}`, value);
        else if (value && typeof value === "object" && !(value instanceof Date) && !(value instanceof Map) && !(value instanceof Set)) {
          const proto = Object.getPrototypeOf(value);
          if (proto && proto !== Object.prototype) visit(value, `${path}.${prop}`, depth + 1);
        }
      }
    };
    for (const [name, root] of Object.entries(roots)) visit(root, name, 0);

    // identity bookkeeping: first array that holds an object owns its "kind"
    for (const t of this.tracked) {
      for (const el of t.arr) {
        if (hasId(el) && !this.kindOf.has(el)) {
          this.kindOf.set(el, t.name);
          this.byKey.set(`${t.name}${SEP}${el.id}`, el);
        }
      }
    }
  }

  private isIdArray(arr: Json[]) {
    return arr.every(hasId);
  }

  /**
   * Brings memory in line with the database (or initialises the database on first run).
   * `init` is for SQLite (synchronous); `initAsync` / `reload` are for Postgres.
   */
  init(seed: SeedMode) {
    if (this.store.kind !== "sqlite") throw new Error("init() needs the SQLite store; use initAsync() for Postgres.");
    const snap = this.store.load();
    if (!snap.initialised) {
      this.seedFresh(seed);
      this.store.write(this.diff(true));
      this.store.markInitialised(seed);
    } else {
      this.apply(snap);
      this.store.write(this.diff(true));
    }
  }

  async initAsync(seed: SeedMode) {
    if (this.store.kind !== "postgres") throw new Error("initAsync() needs the Postgres store.");
    const snap = await this.store.load();
    if (!snap.initialised) {
      this.seedFresh(seed);
      await this.store.write(this.diff(true));
      await this.store.markInitialised(seed);
    } else {
      this.apply(snap);
      await this.store.write(this.diff(true));
    }
  }

  /** Postgres is shared by every server instance: refresh memory from it before handling a request. */
  async reload() {
    if (this.store.kind !== "postgres") return;
    const snap = await this.store.load();
    if (!snap.initialised) return;
    this.apply(snap);
    this.diff(true); // memory now equals the database: just record that, nothing to write
  }

  private seedFresh(seed: SeedMode) {
    if (seed === "none") for (const t of this.tracked) t.arr.length = 0;
  }

  private apply(snap: Snapshot) {
    const stored = new Map<string, Record<string, unknown>>();
    for (const row of snap.objects) {
      const key = `${row.kind}${SEP}${row.id}`;
      const parsed = JSON.parse(row.data) as Record<string, unknown>;
      const existing = this.byKey.get(key);
      if (existing) {
        replaceInPlace(existing, parsed);
        stored.set(key, existing);
      } else {
        this.byKey.set(key, parsed);
        stored.set(key, parsed);
      }
    }
    // objects created at runtime must also be known by identity
    for (const [key, obj] of stored) if (!this.kindOf.has(obj)) this.kindOf.set(obj, key.split(SEP)[0]);

    const names = new Set(snap.arrayNames);
    const grouped = new Map<string, { kind: string; id: string }[]>();
    for (const r of snap.arrays) grouped.set(r.name, [...(grouped.get(r.name) ?? []), r]);
    const blobs = new Map(snap.blobs.map((b) => [b.name, b.data]));

    for (const t of this.tracked) {
      if (blobs.has(t.name)) {
        t.arr.splice(0, t.arr.length, ...(JSON.parse(blobs.get(t.name) as string) as Json[]));
      } else if (names.has(t.name)) {
        const refs = grouped.get(t.name) ?? [];
        const next = refs.map((r) => stored.get(`${r.kind}${SEP}${r.id}`)).filter(Boolean) as Json[];
        t.arr.splice(0, t.arr.length, ...next);
      }
      // arrays unknown to the database keep their in-code defaults and are persisted on the next write
    }
  }

  /** Writes every change since the last call (row-level for objects, order-level for arrays). */
  persist(force = false): void | Promise<void> {
    const changes = this.diff(force);
    if (isEmptyChange(changes)) return;
    return this.store.write(changes);
  }

  /** Works out what changed since the last call and remembers the new state. Does not touch the database. */
  private diff(force: boolean): ChangeSet {
    const live = new Set<string>();
    const upserts: ChangeSet["upserts"] = [];
    const arrayWrites: ChangeSet["arrayWrites"] = [];
    const blobWrites: ChangeSet["blobWrites"] = [];

    for (const t of this.tracked) {
      if (this.isIdArray(t.arr)) {
        const refs: [string, string][] = [];
        for (const el of t.arr as Record<string, unknown>[]) {
          let kind = this.kindOf.get(el);
          if (!kind) {
            kind = t.name;
            this.kindOf.set(el, kind);
            this.byKey.set(`${kind}${SEP}${el.id}`, el);
          }
          const key = `${kind}${SEP}${el.id}`;
          live.add(key);
          refs.push([kind, String(el.id)]);
          {
            const json = JSON.stringify(el);
            if (this.objSig.get(key) !== json) {
              this.objSig.set(key, json);
              upserts.push([kind, String(el.id), json]);
            }
          }
        }
        const sig = refs.map((r) => r.join(SEP)).join("|");
        if (force || this.arrSig.get(t.name) !== sig) {
          this.arrSig.set(t.name, sig);
          arrayWrites.push({ name: t.name, refs });
        }
      } else {
        const json = JSON.stringify(t.arr);
        if (force || this.blobSig.get(t.name) !== json) {
          this.blobSig.set(t.name, json);
          blobWrites.push([t.name, json]);
        }
      }
    }

    const removedKeys = [...this.liveKeys].filter((k) => !live.has(k));
    this.liveKeys = live;
    for (const key of removedKeys) this.objSig.delete(key);
    const removed = removedKeys.map((k) => k.split(SEP) as [string, string]);
    return { upserts, removed, arrayWrites, blobWrites };
  }
}
