'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Sparkles, AlertTriangle, Lightbulb, TrendingUp,
  CheckCircle, RefreshCw, Zap, BrainCircuit,
  TrendingDown, DollarSign, Calendar, Tag,
} from 'lucide-react';
import type { Insight, InsightsResponse, SpendingStats } from '@/lib/types';

interface Props { refreshKey: number }

// ─── Insight card metadata ─────────────────────────────────────────────────
const INSIGHT_META: Record<Insight['type'], {
  Icon:   React.ElementType;
  label:  string;
  accent: string;
  bg:     string;
  border: string;
  pill:   string;
}> = {
  warning: {
    Icon:   AlertTriangle,
    label:  'Warning',
    accent: '#ef4444',
    bg:     'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.18)',
    pill:   'bg-red-500/15 text-red-400',
  },
  tip: {
    Icon:   Lightbulb,
    label:  'Tip',
    accent: '#38bdf8',
    bg:     'rgba(56,189,248,0.06)',
    border: 'rgba(56,189,248,0.18)',
    pill:   'bg-sky-500/15 text-sky-400',
  },
  trend: {
    Icon:   TrendingUp,
    label:  'Trend',
    accent: '#a855f7',
    bg:     'rgba(168,85,247,0.06)',
    border: 'rgba(168,85,247,0.18)',
    pill:   'bg-purple-500/15 text-purple-400',
  },
  success: {
    Icon:   CheckCircle,
    label:  'Win',
    accent: '#10b981',
    bg:     'rgba(16,185,129,0.06)',
    border: 'rgba(16,185,129,0.18)',
    pill:   'bg-green-500/15 text-green-400',
  },
};

// ─── Stats strip ───────────────────────────────────────────────────────────
function StatsStrip({ stats }: { stats: SpendingStats }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const momUp   = stats.mom_change_pct !== null && stats.mom_change_pct > 0;
  const momDown = stats.mom_change_pct !== null && stats.mom_change_pct < 0;

  const items = [
    {
      icon:  DollarSign,
      label: 'This Month',
      value: fmt(stats.this_month),
      sub:   stats.mom_change_pct !== null
        ? `${stats.mom_change_pct > 0 ? '+' : ''}${stats.mom_change_pct}% vs last month`
        : undefined,
      color: momUp ? 'text-red-400' : momDown ? 'text-green-400' : 'text-slate-300',
      SubIcon: momUp ? TrendingUp : momDown ? TrendingDown : null,
    },
    {
      icon:  Tag,
      label: 'Top Category',
      value: stats.top_category,
      sub:   `${stats.top_category_pct}% of spend`,
      color: 'text-slate-300',
      SubIcon: null,
    },
    {
      icon:  Calendar,
      label: 'Daily Average',
      value: fmt(stats.avg_daily),
      sub:   `${stats.transaction_count} transactions`,
      color: 'text-slate-300',
      SubIcon: null,
    },
  ];

  return (
    <div className="mb-5 grid grid-cols-3 gap-3">
      {items.map(({ icon: Icon, label, value, sub, color, SubIcon }) => (
        <div
          key={label}
          className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
        >
          <div className="mb-1 flex items-center gap-1.5">
            <Icon className="h-3 w-3 text-slate-600" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              {label}
            </span>
          </div>
          <p className={`text-sm font-bold leading-tight truncate ${color}`}>{value}</p>
          {sub && (
            <div className="mt-0.5 flex items-center gap-1">
              {SubIcon && <SubIcon className={`h-2.5 w-2.5 ${color}`} />}
              <p className="text-[10px] text-slate-600 truncate">{sub}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Single insight card ───────────────────────────────────────────────────
function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const m    = INSIGHT_META[insight.type];
  const Icon = m.Icon;

  return (
    <div
      className="group relative overflow-hidden rounded-xl p-4 transition-all duration-200 hover:scale-[1.01]"
      style={{
        background:       m.bg,
        border:           `1px solid ${m.border}`,
        animationDelay:   `${index * 60}ms`,
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 h-full w-0.5"
        style={{ background: m.accent }}
      />

      <div className="flex items-start gap-3 pl-2">
        {/* Icon */}
        <div
          className="mt-0.5 flex-shrink-0 rounded-lg p-1.5"
          style={{ background: m.accent + '22' }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: m.accent }} />
        </div>

        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-xs font-bold leading-tight text-white">{insight.title}</p>
            <span className={`badge text-[9px] capitalize ${m.pill}`}>{m.label}</span>
          </div>

          {/* Description */}
          <p className="text-[11px] leading-relaxed text-slate-400">{insight.description}</p>

          {/* Highlighted value */}
          {insight.value && (
            <div className="mt-2">
              <span
                className="inline-block rounded-md px-2 py-0.5 text-xs font-bold"
                style={{ background: m.accent + '18', color: m.accent }}
              >
                {insight.value}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function AIInsights({ refreshKey }: Props) {
  const [data, setData]         = useState<InsightsResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/insights', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        // Optional: pass a date range to narrow the analysis
        // body: JSON.stringify({ from: '2025-01-01' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: { data: InsightsResponse } = await res.json();
      setData(json.data);
      setLastFetch(new Date());
    } catch (e) {
      console.error('[AIInsights]', e);
      setError('Could not load AI insights. Check your API key and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const isOpenAI = data?.model?.startsWith('gpt');

  return (
    <div className="glass-card-grad p-6">

      {/* ── Header ── */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="animate-pulse-glow rounded-xl p-2.5"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(168,85,247,0.15))',
              border:     '1px solid rgba(124,58,237,0.3)',
            }}
          >
            <BrainCircuit className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">AI Financial Insights</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Zap className="h-2.5 w-2.5 text-purple-400" />
              <p className="text-[10px] font-medium text-purple-400">
                {isOpenAI ? `OpenAI ${data?.model}` : 'Smart analysis'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastFetch && !loading && (
            <p className="hidden text-[10px] text-slate-600 sm:block">
              Updated {lastFetch.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="btn-icon text-slate-500 hover:bg-white/5 hover:text-slate-300 disabled:opacity-40"
            title="Refresh insights"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Stats strip ── */}
      {data?.stats && !loading && <StatsStrip stats={data.stats} />}

      {/* ── Summary banner ── */}
      {data?.summary && !loading && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-purple-500/15 bg-purple-500/[0.06] px-4 py-3">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-purple-400" />
          <p className="text-xs leading-relaxed text-slate-300">{data.summary}</p>
        </div>
      )}

      {/* ── Skeleton ── */}
      {loading && (
        <div className="space-y-3">
          {/* Stats strip skeleton */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[1,2,3].map(i => (
              <div key={i} className="skeleton h-16 rounded-xl" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
          {/* Summary skeleton */}
          <div className="skeleton h-10 rounded-xl mb-5" />
          {/* Cards skeleton */}
          {[1,2,3,4,5].map(i => (
            <div key={i} className="skeleton h-20 rounded-xl" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-4">
          <p className="text-xs text-red-300 mb-2">{error}</p>
          <button onClick={load} className="text-[11px] font-semibold text-red-400 underline underline-offset-2">
            Try again
          </button>
        </div>
      )}

      {/* ── Insight cards ── */}
      {!loading && !error && data && (
        <>
          {data.insights.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Sparkles className="h-8 w-8 text-slate-700" />
              <p className="text-sm text-slate-500">Add expenses to generate insights.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.insights.map((ins, i) => (
                <InsightCard key={i} insight={ins} index={i} />
              ))}
            </div>
          )}

          {/* Model attribution */}
          {data.model !== 'none' && (
            <p className="mt-4 text-center text-[10px] text-slate-700">
              {isOpenAI
                ? `Generated by ${data.model} · ${new Date(data.generated_at).toLocaleString()}`
                : 'Rule-based analysis — add OPENAI_API_KEY for GPT-4o insights'}
            </p>
          )}
        </>
      )}
    </div>
  );
}
