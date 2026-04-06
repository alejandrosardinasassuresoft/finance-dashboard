/**
 * Database connection (better-sqlite3 singleton).
 *
 * Calling getDb() always returns the same open connection and guarantees
 * that all pending migrations have been applied before the first query.
 *
 * Path resolution priority
 * ────────────────────────
 * 1. DATABASE_PATH env variable  (explicit override)
 * 2. /tmp/finance.db             (Vercel / production — ephemeral!)
 * 3. <cwd>/finance.db            (local development)
 *
 * ⚠  SQLite on Vercel uses /tmp which resets between cold starts.
 *    For persistent production storage swap to Turso (libSQL) or
 *    another cloud-hosted database.
 */

import Database from 'better-sqlite3';
import path     from 'path';
import { runMigrations } from './migrate';

let db: Database.Database | null = null;

function resolveDbPath(): string {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return '/tmp/finance.db';
  }
  return path.join(process.cwd(), 'finance.db');
}

export function getDb(): Database.Database {
  if (db) return db;

  db = new Database(resolveDbPath());

  // SQLite performance & safety settings
  db.pragma('journal_mode = WAL');   // concurrent readers while writing
  db.pragma('synchronous   = NORMAL'); // safe with WAL, faster than FULL
  db.pragma('foreign_keys  = ON');   // enforce FK constraints

  // Apply any pending migrations before the first query
  runMigrations(db);

  return db;
}
