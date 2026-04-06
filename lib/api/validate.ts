/**
 * Field-level validator.
 *
 * Collects ALL errors in one pass (no fail-fast) so the client
 * receives every problem in a single response.
 *
 * Usage:
 *   const v = new Validator(body);
 *   v.required('amount').number('amount').positive('amount').maxValue('amount', 1_000_000);
 *   v.required('category').oneOf('category', CATEGORIES);
 *   v.required('date').isoDate('date');
 *   v.maxLength('description', 500);
 *
 *   if (v.fails()) return badRequest('Validation failed', v.errors());
 */

import { CATEGORIES } from '@/lib/types';

export type RawBody = Record<string, unknown>;

const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export class Validator {
  private _errors: Array<{ field: string; message: string }> = [];
  private _data:   RawBody;

  constructor(data: RawBody) {
    this._data = data;
  }

  // ── Presence ───────────────────────────────────────────────────────────────

  required(field: string): this {
    const val = this._data[field];
    if (val === undefined || val === null || val === '') {
      this._errors.push({ field, message: `${field} is required` });
    }
    return this;
  }

  // ── Type checks ────────────────────────────────────────────────────────────

  number(field: string): this {
    const val = this._data[field];
    if (val !== undefined && (typeof val !== 'number' || isNaN(val as number))) {
      this._errors.push({ field, message: `${field} must be a number` });
    }
    return this;
  }

  string(field: string): this {
    const val = this._data[field];
    if (val !== undefined && typeof val !== 'string') {
      this._errors.push({ field, message: `${field} must be a string` });
    }
    return this;
  }

  // ── Range / length ─────────────────────────────────────────────────────────

  positive(field: string): this {
    const val = this._data[field];
    if (typeof val === 'number' && val <= 0) {
      this._errors.push({ field, message: `${field} must be greater than 0` });
    }
    return this;
  }

  maxValue(field: string, max: number): this {
    const val = this._data[field];
    if (typeof val === 'number' && val > max) {
      this._errors.push({ field, message: `${field} must not exceed ${max}` });
    }
    return this;
  }

  maxDecimals(field: string, decimals: number): this {
    const val = this._data[field];
    if (typeof val === 'number') {
      const parts = val.toString().split('.');
      if (parts[1] && parts[1].length > decimals) {
        this._errors.push({
          field,
          message: `${field} must have at most ${decimals} decimal places`,
        });
      }
    }
    return this;
  }

  maxLength(field: string, max: number): this {
    const val = this._data[field];
    if (typeof val === 'string' && val.length > max) {
      this._errors.push({ field, message: `${field} must be at most ${max} characters` });
    }
    return this;
  }

  // ── Enum / format ──────────────────────────────────────────────────────────

  oneOf(field: string, allowed: readonly string[]): this {
    const val = this._data[field];
    if (val !== undefined && !allowed.includes(val as string)) {
      this._errors.push({
        field,
        message: `${field} must be one of: ${allowed.join(', ')}`,
      });
    }
    return this;
  }

  isoDate(field: string): this {
    const val = this._data[field];
    if (val !== undefined && !ISO_DATE.test(val as string)) {
      this._errors.push({
        field,
        message: `${field} must be a valid date in YYYY-MM-DD format`,
      });
    }
    return this;
  }

  // ── Result ─────────────────────────────────────────────────────────────────

  fails(): boolean {
    return this._errors.length > 0;
  }

  errors() {
    return this._errors;
  }
}

// ─── Convenience: validate a POST body (all fields required) ──────────────────

export function validateCreate(body: RawBody) {
  const v = new Validator(body);
  v.required('amount').number('amount').positive('amount')
   .maxValue('amount', 1_000_000).maxDecimals('amount', 2);
  v.required('category').string('category').oneOf('category', CATEGORIES);
  v.required('date').string('date').isoDate('date');
  v.string('description').maxLength('description', 500);
  return v;
}

// ─── Convenience: validate a PUT body (all fields optional) ──────────────────

export function validateUpdate(body: RawBody) {
  const v = new Validator(body);
  if (body.amount !== undefined) {
    v.number('amount').positive('amount').maxValue('amount', 1_000_000).maxDecimals('amount', 2);
  }
  if (body.category !== undefined) {
    v.string('category').oneOf('category', CATEGORIES);
  }
  if (body.date !== undefined) {
    v.string('date').isoDate('date');
  }
  if (body.description !== undefined) {
    v.string('description').maxLength('description', 500);
  }
  return v;
}

// ─── Parse & validate query params ───────────────────────────────────────────

const SORT_FIELDS  = ['date', 'amount', 'category', 'created_at'] as const;
const SORT_ORDERS  = ['asc', 'desc'] as const;

export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

export interface ListParams {
  category?: string;
  from?:     string;   // YYYY-MM-DD
  to?:       string;   // YYYY-MM-DD
  sort:      SortField;
  order:     SortOrder;
  page:      number;
  per_page:  number;
}

export interface ListParamsResult {
  params?: ListParams;
  errors?: Array<{ field: string; message: string }>;
}

export function parseListParams(url: URL): ListParamsResult {
  const q = url.searchParams;
  const errs: Array<{ field: string; message: string }> = [];

  const category = q.get('category') ?? undefined;
  if (category && !CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    errs.push({ field: 'category', message: `Must be one of: ${CATEGORIES.join(', ')}` });
  }

  const from = q.get('from') ?? undefined;
  if (from && !ISO_DATE.test(from)) {
    errs.push({ field: 'from', message: 'Must be a valid date: YYYY-MM-DD' });
  }

  const to = q.get('to') ?? undefined;
  if (to && !ISO_DATE.test(to)) {
    errs.push({ field: 'to', message: 'Must be a valid date: YYYY-MM-DD' });
  }

  if (from && to && from > to) {
    errs.push({ field: 'from', message: '`from` must not be after `to`' });
  }

  const rawSort  = (q.get('sort')  ?? 'date') as SortField;
  const rawOrder = (q.get('order') ?? 'desc') as SortOrder;

  if (!SORT_FIELDS.includes(rawSort)) {
    errs.push({ field: 'sort', message: `Must be one of: ${SORT_FIELDS.join(', ')}` });
  }
  if (!SORT_ORDERS.includes(rawOrder)) {
    errs.push({ field: 'order', message: 'Must be "asc" or "desc"' });
  }

  const page     = Math.max(1, parseInt(q.get('page')     ?? '1',  10) || 1);
  const per_page = Math.min(200, Math.max(1, parseInt(q.get('per_page') ?? '50', 10) || 50));

  if (errs.length > 0) return { errors: errs };

  return {
    params: { category, from, to, sort: rawSort, order: rawOrder, page, per_page },
  };
}
