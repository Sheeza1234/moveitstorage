import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

/**
 * SQLite database for the MoveIt backend.
 *  MOVEIT_DB_PATH = file path (default ./data/moveit.db) or ":memory:" (used by UAT scripts).
 */
export function openDatabase(): Database.Database {
  const target = process.env.MOVEIT_DB_PATH || path.join(process.cwd(), "data", "moveit.db");
  if (target !== ":memory:") fs.mkdirSync(path.dirname(target), { recursive: true });
  const db = new Database(target);
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
  return db;
}
