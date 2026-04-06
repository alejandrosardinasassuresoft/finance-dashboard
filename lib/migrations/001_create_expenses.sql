-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 001 · Create expenses table
-- ─────────────────────────────────────────────────────────────────────────────

-- Track applied migrations (bootstrapped before any migration runs)
CREATE TABLE IF NOT EXISTS _migrations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE,
  applied_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Core expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  amount      REAL    NOT NULL CHECK(amount > 0),
  category    TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  date        TEXT    NOT NULL,                         -- ISO-8601 date (YYYY-MM-DD)
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
