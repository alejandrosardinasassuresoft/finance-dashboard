/**
 * POST /api/insights
 *
 * Reads all expenses from the database, computes spending statistics,
 * then calls OpenAI GPT-4o to generate personalized financial insights.
 * Falls back to rule-based insights when OPENAI_API_KEY is not set.
 *
 * Request body (all optional):
 *   {
 *     from?: string;   // YYYY-MM-DD — filter expenses by start date
 *     to?:   string;   // YYYY-MM-DD — filter expenses by end date
 *   }
 *
 * Response 200:
 *   {
 *     data: {
 *       summary:      string;
 *       insights:     Insight[];
 *       stats:        SpendingStats;
 *       model:        string;
 *       generated_at: string;
 *     }
 *   }
 */
import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { getDb } from '@/lib/db';
import { ok, serverError, invalidJson } from '@/lib/api/response';
import { computeStats, buildPrompt, buildFallbackInsights } from '@/lib/insights';
import type { Expense, InsightsResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MODEL    = 'gpt-4o-mini';

export async function POST(req: NextRequest) {
  // ── Parse optional date-range filter from body ──────────────────────────────
  let from: string | undefined;
  let to:   string | undefined;

  const text = await req.text();
  if (text.trim()) {
    try {
      const body = JSON.parse(text) as Record<string, unknown>;
      if (typeof body.from === 'string' && ISO_DATE.test(body.from)) from = body.from;
      if (typeof body.to   === 'string' && ISO_DATE.test(body.to))   to   = body.to;
    } catch {
      return invalidJson();
    }
  }

  try {
    // ── Fetch expenses ────────────────────────────────────────────────────────
    const db = getDb();

    const conditions: string[] = [];
    const bindings:   unknown[] = [];
    if (from) { conditions.push('date >= ?'); bindings.push(from); }
    if (to)   { conditions.push('date <= ?'); bindings.push(to);   }

    const where    = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const expenses = db
      .prepare(`SELECT * FROM expenses ${where} ORDER BY date DESC`)
      .all(...bindings) as Expense[];

    // ── Compute statistics ────────────────────────────────────────────────────
    const stats = computeStats(expenses);

    // ── No expenses yet ───────────────────────────────────────────────────────
    if (expenses.length === 0) {
      return ok<InsightsResponse>({
        summary:      'Add your first expense to unlock AI financial insights.',
        insights:     [],
        stats,
        model:        'none',
        generated_at: new Date().toISOString(),
      });
    }

    // ── No API key → rule-based fallback ─────────────────────────────────────
    if (!process.env.OPENAI_API_KEY) {
      return ok(buildFallbackInsights(expenses, stats));
    }

    // ── Call OpenAI ───────────────────────────────────────────────────────────
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = buildPrompt(expenses, stats);

    const completion = await client.chat.completions.create({
      model:           MODEL,
      max_tokens:      1024,
      temperature:     0.4,   // low temperature = consistent, factual tone
      response_format: { type: 'json_object' },
      messages: [
        {
          role:    'system',
          content: 'You are a concise personal finance advisor. Always respond with valid JSON only.',
        },
        {
          role:    'user',
          content: prompt,
        },
      ],
    });

    const raw  = completion.choices[0].message.content ?? '{}';
    const body = JSON.parse(raw) as { summary?: string; insights?: unknown[] };

    // ── Validate OpenAI output ────────────────────────────────────────────────
    const insights: InsightsResponse['insights'] = Array.isArray(body.insights)
      ? (body.insights.filter(isValidInsight) as InsightsResponse['insights']).slice(0, 6)
      : [];

    const response: InsightsResponse = {
      summary:      typeof body.summary === 'string' ? body.summary : stats.top_category + ' is your top spending category.',
      insights,
      stats,
      model:        MODEL,
      generated_at: new Date().toISOString(),
    };

    return ok(response);

  } catch (err) {
    // ── Graceful degradation: return rule-based insights rather than 500 ─────
    console.error('[POST /api/insights]', err);
    try {
      const db       = getDb();
      const expenses = db.prepare('SELECT * FROM expenses ORDER BY date DESC').all() as Expense[];
      const stats    = computeStats(expenses);
      return ok(buildFallbackInsights(expenses, stats));
    } catch (fallbackErr) {
      return serverError(fallbackErr);
    }
  }
}

// ─── Type guard ───────────────────────────────────────────────────────────────

const VALID_TYPES = new Set(['warning', 'tip', 'trend', 'success']);

function isValidInsight(x: unknown): x is {
  type: string; title: string; description: string; value?: string;
} {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.type        === 'string' && VALID_TYPES.has(o.type) &&
    typeof o.title       === 'string' && o.title.trim().length > 0 &&
    typeof o.description === 'string' && o.description.trim().length > 0
  );
}
