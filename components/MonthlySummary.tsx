'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Calendar, Activity } from 'lucide-react';
import type { Expense } from '@/lib/types';

interface Props { expenses: Expense[] }

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function MonthlySummary({ expenses }: Props) {
  const s = useMemo(() => {
    const now = new Date();
    const cur = now.toISOString().slice(0, 7);
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

    const curExp  = expenses.filter(e => e.date.startsWith(cur));
    const prevExp = expenses.filter(e => e.date.startsWith(prev));

    const curTotal  = curExp.reduce((s, e) => s + e.amount, 0);
    const prevTotal = prevExp.reduce((s, e) => s + e.amount, 0);
    const allTotal  = expenses.reduce((s, e) => s + e.amount, 0);
    const pct = prevTotal > 0 ? ((curTotal - prevTotal) / prevTotal) * 100 : null;

    const byCat = curExp.reduce<Record<string, number>>((a, e) => ({ ...a, [e.category]: (a[e.category] ?? 0) + e.amount }), {});
    const top   = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0] ?? null;

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth  = now.getDate();
    const daily       = dayOfMonth > 0 ? curTotal / dayOfMonth : 0;

    return { curTotal, prevTotal, allTotal, pct, top, count: curExp.length, daily, projected: daily * daysInMonth };
  }, [expenses]);

  const cards = [
    {
      label: 'This Month',
      value: fmt(s.curTotal),
      sub: s.pct !== null ? `${s.pct >= 0 ? '+' : ''}${s.pct.toFixed(1)}% vs last month` : `${s.count} transactions`,
      icon: DollarSign,
      trend: s.pct !== null ? (s.pct >= 0 ? 'up' : 'down') : null,
      accent: '#7c3aed',
      glow:   'rgba(124,58,237,0.25)',
      gradFrom: 'rgba(124,58,237,0.12)',
      gradTo:   'rgba(109,40,217,0.04)',
    },
    {
      label: 'Daily Average',
      value: fmt(s.daily),
      sub: `Projected ${fmt(s.projected)} / mo`,
      icon: Calendar,
      trend: null,
      accent: '#06b6d4',
      glow:   'rgba(6,182,212,0.2)',
      gradFrom: 'rgba(6,182,212,0.10)',
      gradTo:   'rgba(6,182,212,0.03)',
    },
    {
      label: 'Top Category',
      value: s.top?.[0] ?? '—',
      sub: s.top ? fmt(s.top[1]) : 'No data yet',
      icon: ShoppingBag,
      trend: null,
      accent: '#f59e0b',
      glow:   'rgba(245,158,11,0.2)',
      gradFrom: 'rgba(245,158,11,0.10)',
      gradTo:   'rgba(245,158,11,0.03)',
    },
    {
      label: 'All-Time Spent',
      value: fmt(s.allTotal),
      sub: `${expenses.length} transactions total`,
      icon: Activity,
      trend: null,
      accent: '#10b981',
      glow:   'rgba(16,185,129,0.2)',
      gradFrom: 'rgba(16,185,129,0.10)',
      gradTo:   'rgba(16,185,129,0.03)',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="glass-card-grad relative overflow-hidden p-5 animate-slide-up"
            style={{
              animationDelay: `${i * 70}ms`,
              background: `linear-gradient(135deg, ${card.gradFrom}, ${card.gradTo})`,
            }}
          >
            {/* Glow orb */}
            <div
              className="glow-orb h-24 w-24 -right-4 -top-4"
              style={{ background: card.accent }}
            />

            {/* Icon */}
            <div
              className="mb-4 inline-flex rounded-xl p-2.5"
              style={{
                background: card.accent + '22',
                boxShadow: `0 0 16px ${card.glow}`,
              }}
            >
              <Icon className="h-4 w-4" style={{ color: card.accent }} />
            </div>

            {/* Value */}
            <p className="stat-value animate-number-pop truncate" style={{ color: '#f1f5f9' }}>
              {card.value}
            </p>

            {/* Label */}
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {card.label}
            </p>

            {/* Sub / trend */}
            <div className="mt-3 flex items-center gap-1.5">
              {card.trend === 'up' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                  <TrendingUp className="h-2.5 w-2.5" /> {card.sub}
                </span>
              )}
              {card.trend === 'down' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                  <TrendingDown className="h-2.5 w-2.5" /> {card.sub}
                </span>
              )}
              {card.trend === null && (
                <span className="text-[11px] text-slate-500">{card.sub}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
