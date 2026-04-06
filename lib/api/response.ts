/**
 * Typed response builders.
 *
 * Every endpoint returns one of two shapes:
 *
 *   Success  →  { data: T, meta?: Meta }
 *   Error    →  { error: { code, message, details? } }
 *
 * Using these helpers guarantees the envelope is consistent across all routes.
 */
import { NextResponse } from 'next/server';

// ─── Success types ────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total:       number;
  page:        number;
  per_page:    number;
  total_pages: number;
}

export interface SuccessResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

// ─── Error types ──────────────────────────────────────────────────────────────

export type ErrorCode =
  | 'INVALID_JSON'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR';

export interface FieldError {
  field:   string;
  message: string;
}

export interface ErrorBody {
  code:     ErrorCode;
  message:  string;
  details?: FieldError[];
}

export interface ErrorResponse {
  error: ErrorBody;
}

// ─── Builders ────────────────────────────────────────────────────────────────

export function ok<T>(data: T, status = 200): NextResponse<SuccessResponse<T>> {
  return NextResponse.json({ data }, { status });
}

export function okList<T>(
  data:    T[],
  meta:    PaginationMeta,
): NextResponse<SuccessResponse<T[]>> {
  return NextResponse.json({ data, meta });
}

export function created<T>(data: T): NextResponse<SuccessResponse<T>> {
  return ok(data, 201);
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(
  message: string,
  details?: FieldError[],
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { error: { code: 'VALIDATION_ERROR', message, details } },
    { status: 400 },
  );
}

export function notFound(resource = 'Resource'): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { error: { code: 'NOT_FOUND', message: `${resource} not found` } },
    { status: 404 },
  );
}

export function invalidJson(): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
    { status: 400 },
  );
}

export function serverError(err: unknown): NextResponse<ErrorResponse> {
  console.error('[API]', err);
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
    { status: 500 },
  );
}
