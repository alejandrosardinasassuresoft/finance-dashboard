/**
 * Versioned migration runner for better-sqlite3.
 *
 * How it works
 * ────────────
 * 1. Boots a `_migrations` table (part of migration 001).
 * 2. Reads every *.sql file from lib/migrations/ in lexicographic order
 *    so numeric prefixes (001_, 002_, …) define execution order.
 * 3. Skips migrations already recorded in `_migrations`.
 * 4. Runs each pending migration inside a single transaction — either
 *    the whole migration succeeds or none of it is applied.
 */

import fs   from 'fs';
import path from 'path';
import type Database from 'better-sqlite3';

const MIGRATIONS_DIR = path.join(process.cwd(), 'lib', 'migrations');

interface MigrationRow { name: string }

export function runMigrations(db: Database.Database): void {
  // Bootstrap the tracking table so we can always query it safely.
  // This exact statement is also in 001, but running it here first
  // means the runner works even if 001 hasn't been applied yet.
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      applied_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Collect migration filenames, sorted lexicographically (001 < 002 …)
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  // Which migrations have already been applied?
  const applied = new Set(
    (db.prepare('SELECT name FROM _migrations').all() as MigrationRow[]).map(
      (r) => r.name
    )
  );

  for (const file of files) {
    if (applied.has(file)) {
      continue; // already applied — skip
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

    // Run the entire migration + record it in one atomic transaction
    const applyMigration = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
    });

    try {
      applyMigration();
      console.log(`[migrate] ✓ applied ${file}`);
    } catch (err) {
      console.error(`[migrate] ✗ failed on ${file}:`, err);
      throw err; // halt — do not apply subsequent migrations
    }
  }
}
