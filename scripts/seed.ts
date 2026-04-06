/**
 * Seed the SQLite database with sample expense data.
 * Applies all pending migrations first, then inserts rows.
 *
 * Run with:  npm run db:seed
 */
import Database from 'better-sqlite3';
import path     from 'path';
import { runMigrations } from '../lib/migrate';

const db = new Database(path.join(process.cwd(), 'finance.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

runMigrations(db);

const insert = db.prepare(
  'INSERT INTO expenses (amount, category, description, date) VALUES (?, ?, ?, ?)'
);

const now = new Date();
const daysAgo = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

// [amount, category, description, date]
const rows: [number, string, string, string][] = [
  [142.50, 'Food & Dining',   'Whole Foods weekly grocery run',          daysAgo(1)],
  [15.99,  'Entertainment',   'Netflix monthly subscription',            daysAgo(2)],
  [38.75,  'Transportation',  'Uber to airport — flight trip',           daysAgo(3)],
  [89.00,  'Utilities',       'Electricity bill — July',                 daysAgo(5)],
  [56.40,  'Shopping',        'Amazon — kitchen items',                  daysAgo(7)],
  [120.00, 'Healthcare',      'Dentist checkup co-pay',                  daysAgo(10)],
  [6.75,   'Food & Dining',   'Starbucks morning latte',                 daysAgo(11)],
  [45.00,  'Healthcare',      'Gym membership',                          daysAgo(14)],
  [29.99,  'Education',       'Udemy — TypeScript course',               daysAgo(18)],
  [1450.00,'Housing',         'July rent',                               daysAgo(20)],
  [9.99,   'Entertainment',   'Spotify premium subscription',            daysAgo(22)],
  [68.00,  'Food & Dining',   'Sushi dinner — date night',               daysAgo(25)],
  [52.30,  'Transportation',  'Gas fill-up',                             daysAgo(28)],
  [34.12,  'Shopping',        'Walmart — household items',               daysAgo(32)],
  [95.00,  'Healthcare',      'Annual doctor visit',                     daysAgo(35)],
  [78.00,  'Utilities',       'Electricity bill — June',                 daysAgo(38)],
  [87.45,  'Shopping',        'Target shopping run',                     daysAgo(42)],
  [22.50,  'Food & Dining',   'Pizza delivery',                          daysAgo(45)],
  [1450.00,'Housing',         'June rent',                               daysAgo(50)],
  [340.00, 'Travel',          'Round-trip flight tickets — summer trip', daysAgo(55)],
];

const insertMany = db.transaction((data: typeof rows) => {
  for (const row of data) insert.run(...row);
});

insertMany(rows);
console.log(`✅  Seeded ${rows.length} expenses into finance.db`);
db.close();
