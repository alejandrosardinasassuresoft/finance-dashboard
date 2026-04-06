'use client';

import { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
  type Plugin,
} from 'chart.js';
import { PieChart } from 'lucide-react';
import type { Expense } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/types';

ChartJS.register(ArcElement, Tooltip, Legend);

/* ── Center-text plugin for Doughnut ── */
const centerTextPlugin: Plugin<'doughnut'> = {
  id: 'centerText',
  afterDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const dataset = chart.data.datasets[0];
    const total   = (dataset.data as number[]).reduce((a, b) => a + b, 0);
    if (total === 0) return;

    const cx = (chartArea.left + chartArea.right)  / 2;
    const cy = (chartArea.top  + chartArea.bottom) / 2;

    ctx.save();

    // Total value
    ctx.font         = 'bold 18px Inter, sans-serif';
    ctx.fillStyle    = '#f1f5f9';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`$${total.toFixed(0)}`, cx, cy - 9);

    // Label
    ctx.font      = '11px Inter, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Total Spend', cx, cy + 12);

    ctx.restore();
  },
};

interface Props { expenses: Expense[] }

export default function CategoryPieChart({ expenses }: Props) {
  const { data, summary, isEmpty } = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const e of expenses) {
      totals[e.category] = (totals[e.category] ?? 0) + e.amount;
    }
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return { data: null, summary: [], isEmpty: true };

    const grand = sorted.reduce((s, [, v]) => s + v, 0);

    return {
      isEmpty: false,
      summary: sorted.slice(0, 5).map(([cat, total]) => ({
        cat,
        total,
        pct: ((total / grand) * 100).toFixed(1),
        color: CATEGORY_COLORS[cat] ?? '#94a3b8',
      })),
      data: {
        labels: sorted.map(([c]) => c),
        datasets: [{
          data:            sorted.map(([, v]) => parseFloat(v.toFixed(2))),
          backgroundColor: sorted.map(([c]) => (CATEGORY_COLORS[c] ?? '#94a3b8') + 'cc'),
          borderColor:     sorted.map(([c]) => CATEGORY_COLORS[c] ?? '#94a3b8'),
          borderWidth:     1.5,
          hoverOffset:     10,
        }],
      },
    };
  }, [expenses]);

  const options: ChartOptions<'doughnut'> = {
    responsive:          true,
    maintainAspectRatio: true,
    cutout:              '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(6,6,20,0.92)',
        borderColor:     'rgba(255,255,255,0.08)',
        borderWidth:     1,
        titleColor:      '#f1f5f9',
        bodyColor:       '#94a3b8',
        padding:         12,
        callbacks: {
          label: (ctx) => {
            const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const pct   = ((ctx.parsed / total) * 100).toFixed(1);
            return ` $${(ctx.parsed as number).toFixed(2)} · ${pct}%`;
          },
        },
      },
    },
  };

  return (
    <div className="glass-card-grad p-6">
      {/* Header */}
      <div className="mb-5 flex items-center gap-2">
        <div className="rounded-lg bg-purple-500/15 p-2">
          <PieChart className="h-4 w-4 text-purple-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Spending by Category</h2>
          <p className="text-[11px] text-slate-500">All-time breakdown</p>
        </div>
      </div>

      {isEmpty ? (
        <EmptyChart />
      ) : (
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* Doughnut */}
          <div className="mx-auto w-48 flex-shrink-0 sm:mx-0">
            <Doughnut data={data!} options={options} plugins={[centerTextPlugin]} />
          </div>

          {/* Custom legend */}
          <div className="flex-1 space-y-2.5">
            {summary.map(({ cat, total, pct, color }) => (
              <div key={cat} className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ background: color }}
                />
                <span className="flex-1 truncate text-xs text-slate-400">{cat}</span>
                <span className="text-xs font-semibold text-white">${total.toFixed(0)}</span>
                <span
                  className="w-10 text-right text-[10px] font-medium"
                  style={{ color }}
                >
                  {pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-48 items-center justify-center text-slate-600 text-sm">
      Add expenses to see category breakdown
    </div>
  );
}
