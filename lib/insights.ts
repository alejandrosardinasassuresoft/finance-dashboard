/**
 * Pure analytics helpers.
 * Compute all spending statistics from raw expense rows so the API route
 * stays thin and these functions are unit-testable in isolation.
 */

import type { Expense, SpendingStats, InsightsResponse, Insight } from './types';

// ─── Aggregation ──────────────────────────────────────────────────────────────

export function computeStats(expenses: Expense[]): SpendingStats {
  const now   = new Date();
  const curM  = now.toISOString().slice(0, 7);                           // YYYY-MM
  const prevM = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString().slice(0, 7);

  const thisMonthExp  = expenses.filter(e => e.date.startsWith(curM));
  const lastMonthExp  = expenses.filter(e => e.date.startsWith(prevM));

  const total      = expenses.reduce((s, e) => s + e.amount, 0);
  const thisMonth  = thisMonthExp.reduce((s, e) => s + e.amount, 0);
  const lastMonth  = lastMonthExp.reduce((s, e) => s + e.amount, 0);

  const momPct = lastMonth > 0
    ? parseFloat((((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1))
    : null;

  // By category
  const byCat = expenses.reduce<Record<string, number>>((a, e) => {
    a[e.category] = (a[e.category] ?? 0) + e.amount;
    return a;
  }, {});
  const [topCat, topCatAmt] = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])[0] ?? ['—', 0];

  // Daily average (based on span of recorded dates)
  const dates    = expenses.map(e => e.date).sort();
  const spanDays = dates.length >= 2
    ? Math.max(1, Math.round(
        (new Date(dates.at(-1)!).getTime() - new Date(dates[0]).getTime())
        / 86_400_000
      ) + 1)
    : 1;

  return {
    total_spend:       parseFloat(total.toFixed(2)),
    this_month:        parseFloat(thisMonth.toFixed(2)),
    last_month:        parseFloat(lastMonth.toFixed(2)),
    mom_change_pct:    momPct,
    top_category:      topCat,
    top_category_pct:  total > 0 ? parseFloat(((topCatAmt / total) * 100).toFixed(1)) : 0,
    avg_daily:         parseFloat((total / spanDays).toFixed(2)),
    transaction_count: expenses.length,
  };
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

export function buildPrompt(expenses: Expense[], stats: SpendingStats): string {
  const byCategory = expenses.reduce<Record<string, number>>((a, e) => {
    a[e.category] = (a[e.category] ?? 0) + e.amount;
    return a;
  }, {});

  const byMonth = expenses.reduce<Record<string, number>>((a, e) => {
    const m = e.date.slice(0, 7);
    a[m] = (a[m] ?? 0) + e.amount;
    return a;
  }, {});

  const catBreakdown = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) =>
      `  • ${cat}: $${amt.toFixed(2)} (${((amt / stats.total_spend) * 100).toFixed(1)}%)`
    ).join('\n');

  const monthBreakdown = Object.entries(byMonth)
    .sort()
    .map(([m, amt]) => `  • ${m}: $${amt.toFixed(2)}`)
    .join('\n');

  const recentTx = expenses
    .slice(0, 12)
    .map(e => `  • ${e.date} | ${e.category} | $${e.amount.toFixed(2)}${e.description ? ` | ${e.description}` : ''}`)
    .join('\n');

  return `You are a personal finance advisor analyzing a user's real expense data.

## Key Metrics
- Total recorded spend : $${stats.total_spend.toFixed(2)} across ${stats.transaction_count} transactions
- This month           : $${stats.this_month.toFixed(2)}
- Last month           : $${stats.last_month.toFixed(2)}
- Month-over-month     : ${stats.mom_change_pct !== null ? `${stats.mom_change_pct > 0 ? '+' : ''}${stats.mom_change_pct}%` : 'N/A (no previous month data)'}
- Daily average        : $${stats.avg_daily.toFixed(2)}
- Top category         : ${stats.top_category} (${stats.top_category_pct}% of spend)

## Spending by Category
${catBreakdown}

## Monthly Totals
${monthBreakdown}

## 12 Most Recent Transactions
${recentTx}

## Your Task
Generate exactly 5 financial insights. Each must be:
- Specific to the data above (reference real numbers and categories)
- Actionable (tell the user what to do, not just what happened)
- Concise (title ≤ 7 words, description 1–2 sentences)

Use these insight types:
- "warning"  → overspending, concerning trends
- "tip"      → actionable saving opportunity
- "trend"    → neutral observation about a pattern
- "success"  → something the user is doing well

Respond with ONLY valid JSON — no markdown, no prose, no code fences:
{
  "summary": "One sentence (≤ 20 words) overall financial health assessment.",
  "insights": [
    {
      "type": "warning" | "tip" | "trend" | "success",
      "title": "Short title",
      "description": "Specific, actionable description referencing real numbers.",
      "value": "Highlighted metric string, e.g. '+35%' or '$1,450' or 'Housing'"
    }
  ]
}`;
}

// ─── Rule-based fallback (no API key) ────────────────────────────────────────

export function buildFallbackInsights(
  expenses: Expense[],
  stats:    SpendingStats,
): InsightsResponse {
  if (expenses.length === 0) {
    return {
      summary:      'Add your first expense to unlock financial insights.',
      insights:     [],
      stats,
      model:        'rule-based',
      generated_at: new Date().toISOString(),
    };
  }

  const insights: Insight[] = [];
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  // Month-over-month comparison
  if (stats.mom_change_pct !== null) {
    if (stats.mom_change_pct > 20) {
      insights.push({
        type:        'warning',
        title:       'Spending Spike This Month',
        description: `You spent ${fmt(stats.this_month)} this month — ${stats.mom_change_pct}% more than last month's ${fmt(stats.last_month)}. Review recent transactions for unexpected charges.`,
        value:       `+${stats.mom_change_pct}%`,
      });
    } else if (stats.mom_change_pct < -10) {
      insights.push({
        type:        'success',
        title:       'Spending Down This Month',
        description: `Great job — you spent ${Math.abs(stats.mom_change_pct)}% less than last month, saving ${fmt(stats.last_month - stats.this_month)}.`,
        value:       `${stats.mom_change_pct}%`,
      });
    } else {
      insights.push({
        type:        'trend',
        title:       'Consistent Monthly Spending',
        description: `This month (${fmt(stats.this_month)}) is close to last month (${fmt(stats.last_month)}). Your spending is stable.`,
        value:       `${stats.mom_change_pct > 0 ? '+' : ''}${stats.mom_change_pct}%`,
      });
    }
  }

  // Top category
  insights.push({
    type:        stats.top_category_pct > 40 ? 'warning' : 'trend',
    title:       `Top Spend: ${stats.top_category}`,
    description: `${stats.top_category} makes up ${stats.top_category_pct}% of your total spending. ${stats.top_category_pct > 40 ? 'Consider whether this category can be reduced.' : 'This looks balanced across your budget.'}`,
    value:       `${stats.top_category_pct}%`,
  });

  // Daily average
  insights.push({
    type:        'trend',
    title:       'Daily Spending Average',
    description: `You average ${fmt(stats.avg_daily)} per day. Over a full month that projects to ${fmt(stats.avg_daily * 30)}.`,
    value:       fmt(stats.avg_daily),
  });

  // API key nudge
  insights.push({
    type:        'tip',
    title:       'Unlock AI-Powered Advice',
    description: 'Add OPENAI_API_KEY to .env.local for personalized GPT-4o insights: spending trend analysis, saving suggestions, and budget warnings.',
    value:       'GPT-4o',
  });

  const momText = stats.mom_change_pct !== null
    ? ` — ${stats.mom_change_pct > 0 ? '+' : ''}${stats.mom_change_pct}% vs last month`
    : '';

  return {
    summary:      `${stats.transaction_count} transactions totalling ${fmt(stats.total_spend)}${momText}.`,
    insights,
    stats,
    model:        'rule-based',
    generated_at: new Date().toISOString(),
  };
}
