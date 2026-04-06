/**
 * GET  /api/expenses   — list expenses (filterable, sortable, paginated)
 * POST /api/expenses   — create a new expense
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import type { Expense } from '@/lib/types';
import {
  ok, okList, created, badRequest, invalidJson, serverError,
} from '@/lib/api/response';
import {
  validateCreate, parseListParams,
} from '@/lib/api/validate';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/expenses
//
// Query params (all optional):
//   category  — filter by category name
//   from      — start date, YYYY-MM-DD (inclusive)
//   to        — end date,   YYYY-MM-DD (inclusive)
//   sort      — date | amount | category | created_at   (default: date)
//   order     — asc | desc                              (default: desc)
//   page      — page number, ≥ 1                        (default: 1)
//   per_page  — items per page, 1–200                   (default: 50)
//
// Response 200:
//   { data: Expense[], meta: { total, page, per_page, total_pages } }
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { params, errors } = parseListParams(new URL(req.url));
    if (errors) return badRequest('Invalid query parameters', errors);

    const { category, from, to, sort, order, page, per_page } = params!;

    // Build WHERE clause dynamically — only bind values that were provided
    const conditions: string[] = [];
    const bindings:   unknown[] = [];

    if (category) {
      conditions.push('category = ?');
      bindings.push(category);
    }
    if (from) {
      conditions.push('date >= ?');
      bindings.push(from);
    }
    if (to) {
      conditions.push('date <= ?');
      bindings.push(to);
    }

    const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * per_page;
    const db     = getDb();

    // Total count (for pagination meta)
    const { total } = db
      .prepare(`SELECT COUNT(*) AS total FROM expenses ${where}`)
      .get(...bindings) as { total: number };

    // Actual page
    const expenses = db
      .prepare(
        `SELECT * FROM expenses ${where}
         ORDER BY ${sort} ${order.toUpperCase()}, id ${order.toUpperCase()}
         LIMIT ? OFFSET ?`,
      )
      .all(...bindings, per_page, offset) as Expense[];

    return okList(expenses, {
      total,
      page,
      per_page,
      total_pages: Math.ceil(total / per_page),
    });
  } catch (err) {
    return serverError(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/expenses
//
// Body (application/json):
//   { amount: number, category: string, date: string, description?: string }
//
// Response 201:
//   { data: Expense }
//
// Response 400:
//   { error: { code: 'VALIDATION_ERROR', message, details: FieldError[] } }
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return invalidJson();
  }

  // Validate
  const v = validateCreate(body);
  if (v.fails()) return badRequest('Validation failed', v.errors());

  try {
    const { amount, category, date } = body as {
      amount: number; category: string; date: string;
    };
    const description = ((body.description as string | undefined) ?? '').trim();

    const db     = getDb();
    const result = db
      .prepare(
        'INSERT INTO expenses (amount, category, description, date) VALUES (?, ?, ?, ?)',
      )
      .run(amount, category, description, date);

    const expense = db
      .prepare('SELECT * FROM expenses WHERE id = ?')
      .get(result.lastInsertRowid) as Expense;

    return created(expense);
  } catch (err) {
    return serverError(err);
  }
}
