/**
 * GET    /api/expenses/:id  — fetch one expense
 * PUT    /api/expenses/:id  — partial update (only supplied fields change)
 * DELETE /api/expenses/:id  — remove an expense
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import type { Expense } from '@/lib/types';
import {
  ok, noContent, badRequest, notFound, invalidJson, serverError,
} from '@/lib/api/response';
import { validateUpdate } from '@/lib/api/validate';

export const dynamic = 'force-dynamic';

// ─── Shared: parse & validate the :id segment ────────────────────────────────

function parseId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/expenses/:id
//
// Response 200:  { data: Expense }
// Response 404:  { error: { code: 'NOT_FOUND', message } }
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = parseId(params.id);
  if (!id) return badRequest('id must be a positive integer', [{ field: 'id', message: 'Must be a positive integer' }]);

  try {
    const db      = getDb();
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as Expense | undefined;
    if (!expense) return notFound('Expense');
    return ok(expense);
  } catch (err) {
    return serverError(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/expenses/:id
//
// Partial update — include only the fields you want to change.
// Fields omitted from the body are left unchanged.
//
// Body (application/json):
//   {
//     amount?:      number,   // > 0, ≤ 1 000 000, max 2 decimal places
//     category?:    string,   // must be a valid category
//     date?:        string,   // YYYY-MM-DD
//     description?: string,   // max 500 chars
//   }
//
// Response 200:  { data: Expense }   ← full updated record
// Response 400:  { error: { code: 'VALIDATION_ERROR', message, details } }
// Response 404:  { error: { code: 'NOT_FOUND', message } }
// ─────────────────────────────────────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = parseId(params.id);
  if (!id) return badRequest('id must be a positive integer', [{ field: 'id', message: 'Must be a positive integer' }]);

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return invalidJson();
  }

  // Reject empty payloads
  if (Object.keys(body).length === 0) {
    return badRequest('Request body must contain at least one field to update');
  }

  // Validate supplied fields
  const v = validateUpdate(body);
  if (v.fails()) return badRequest('Validation failed', v.errors());

  try {
    const db = getDb();

    const existing = db
      .prepare('SELECT * FROM expenses WHERE id = ?')
      .get(id) as Expense | undefined;
    if (!existing) return notFound('Expense');

    // Build SET clause from supplied fields only
    const updates: string[] = [];
    const bindings: unknown[] = [];

    if (body.amount !== undefined) {
      updates.push('amount = ?');
      bindings.push(body.amount);
    }
    if (body.category !== undefined) {
      updates.push('category = ?');
      bindings.push(body.category);
    }
    if (body.date !== undefined) {
      updates.push('date = ?');
      bindings.push(body.date);
    }
    if (body.description !== undefined) {
      updates.push('description = ?');
      bindings.push((body.description as string).trim());
    }

    db.prepare(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`)
      .run(...bindings, id);

    const updated = db
      .prepare('SELECT * FROM expenses WHERE id = ?')
      .get(id) as Expense;

    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/expenses/:id
//
// Response 204:  (no body)
// Response 404:  { error: { code: 'NOT_FOUND', message } }
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = parseId(params.id);
  if (!id) return badRequest('id must be a positive integer', [{ field: 'id', message: 'Must be a positive integer' }]);

  try {
    const db     = getDb();
    const result = db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    if (result.changes === 0) return notFound('Expense');
    return noContent();
  } catch (err) {
    return serverError(err);
  }
}
