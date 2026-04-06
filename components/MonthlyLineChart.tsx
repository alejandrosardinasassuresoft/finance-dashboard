'use client';

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { Expense } from '@/lib/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface Props { expenses: Expense[] }

function lastNMonths(n: number) {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

export default function MonthlyLineChart({ expenses }: Props) {
  const { chartData, isEmpty, trend, trendPct } = useMemo(() => {
    const months = lastNMonths(6);
    const totals = months.map((m) =>
      expenses.filter((e) => e.date.startsWith(m)).reduce((s, e) => s + e.amount, 0)
    );

    const isEmpty = totals.every((t) => t === 0);

    // Trend: compare last month vs previous
    const last = totals[totals.length - 1];
    const prev = totals[totals.length - 2];
    const trendPct = prev > 0 ? ((last - prev) / prev) * 100 : null;
    const trend = trendPct !== null ? (trendPct >= 0 ? 'up' : 'down') : null;

    const labels = months.map((m) => {
      const [y, mo] = m.split('-');
      return new Date(Number(y), Number(mo) - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
    });

    return {
      isEmpty,
      trend,
      trendPct,
      chartData: {
        labels,
        datasets: [
          {
            label: 'Spending',
            data: totals.map((t) => parseFloat(t.toFixed(2))),
            fill: true,
            borderColor: '#7c3aed',
            backgroundColor: (ctx: { chart: ChartJS }) => {
              const canvas = ctx.chart.ctx;
              const grad = canvas.createLinearGradient(0, 0, 0, 260);
              grad.addColorStop(0,   'rgba(124,58,237,0.30)');
              grad.addColorStop(0.5, 'rgba(124,58,237,0.08)');
              grad.addColorStop(1,   'rgba(124,58,237,0.00)');
              return grad;
            },
            pointBackgroundColor:  '#7c3aed',
            pointBorderColor:      '#f1f5f9',
            pointBorderWidth:      2,
            pointRadius:           5,
            pointHoverRadius:      7,
            pointHoverBackgroundColor: '#a855f7',
            tension: 0.42,
          },
        ],
      },
    };
  }, [expenses]);

  const options: ChartOptions<'line'> = {
    responsive:          true,
    maintainAspectRatio: true,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        grid:  { color: 'rgba(255,255,255,0.03)' },
        ticks: { color: '#475569', font: { size: 11, family: 'Inter, sans-serif' } },
        border: { color: 'transparent' },
      },
      y: {
        grid:  { color: 'rgba(255,255,255,0.03)' },
        ticks: {
          color: '#475569',
          font:  { size: 11, family: 'Inter, sans-serif' },
          callback: (v) => `$${v}`,
        },
        border:    { color: 'transparent', dash: [4, 4] },
        beginAtZero: true,
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(6,6,20,0.92)',
        borderColor:     'rgba(255,255,255,0.08)',
        borderWidth:     1,
        titleColor:      '#f1f5f9',
        bodyColor:       '#94a3b8',
        padding:         12,
        displayColors:   false,
        callbacks: {
          title: (items) => items[0].label,
          label: (ctx)  => ` $${(ctx.parsed.y as number).toFixed(2)}`,
        },
      },
    },
  };

  return (
    <div className="glass-card-grad p-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-cyan-500/15 p-2">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Monthly Trend</h2>
            <p className="text-[11px] text-slate-500">Last 6 months</p>
          </div>
        </div>

        {trendPct !== null && (
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              trend === 'up'
                ? 'bg-red-500/15 text-red-400'
                : 'bg-green-500/15 text-green-400'
            }`}
          >
            {trend === 'up'
              ? <TrendingUp className="h-3 w-3" />
              : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trendPct).toFixed(1)}% MoM
          </div>
        )}
      </div>

      {isEmpty ? (
        <div className="flex h-48 items-center justify-center text-slate-600 text-sm">
          No expense data yet
        </div>
      ) : (
        <Line data={chartData} options={options} />
      )}
    </div>
  );
}
