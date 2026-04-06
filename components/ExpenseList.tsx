'use client';

import { useState, useMemo } from 'react';
import { Pencil, Trash2, Search, SlidersHorizontal, ChevronDown, ArrowUpDown } from 'lucide-react';
import type { Expense } from '@/lib/types';
import { CATEGORIES, CATEGORY_COLORS } from '@/lib/types';

interface Props {
  expenses: Expense[];
  onEdit:   (e: Expense) => void;
  onDelete: (id: number) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export default function ExpenseList({ expenses, onEdit, onDelete }: Props) {
  const [search,   setSearch]   = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [sortBy,   setSortBy]   = useState<'date' | 'amount'>('date');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let list = [...expenses];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) => e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
      );
    }
    if (catFilter) list = list.filter((e) => e.category === catFilter);
    list.sort((a, b) => sortBy === 'date' ? b.date.localeCompare(a.date) : b.amount - a.amount);
    return list;
  }, [expenses, search, catFilter, sortBy]);

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this expense?')) return;
    setDeletingId(id);
    try { onDelete(id); } finally { setDeletingId(null); }
  };

  return (
    <div className="glass-card-grad overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="border-b border-white/[0.05] px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Title */}
          <div className="mr-auto flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Transactions</h2>
            <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-400">
              {filtered.length}
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input w-44 pl-8 py-2 text-xs"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`btn-icon text-slate-500 hover:bg-white/5 hover:text-slate-300 ${showFilters ? 'bg-white/5 text-slate-300' : ''}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>

          {/* Sort */}
          <button
            onClick={() => setSortBy((s) => s === 'date' ? 'amount' : 'date')}
            className="btn-icon text-slate-500 hover:bg-white/5 hover:text-slate-300"
            title={`Sort by ${sortBy === 'date' ? 'amount' : 'date'}`}
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>

        {/* Expandable filter row */}
        {showFilters && (
          <div className="mt-3 flex flex-wrap gap-2 animate-slide-up">
            <div className="relative">
              <select
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                className="glass-input w-44 appearance-none py-1.5 pr-7 text-xs"
              >
                <option value="">All categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
            </div>
            <span className="flex items-center text-xs text-slate-600">
              Sort: <span className="ml-1 font-semibold text-slate-400 capitalize">{sortBy}</span>
            </span>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-600">
          <Search className="h-8 w-8 opacity-30" />
          <p className="text-sm">
            {expenses.length === 0 ? 'No expenses yet — add your first one!' : 'No results match your filters'}
          </p>
        </div>
      ) : (
        <div className="custom-scroll overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {['Date', 'Category', 'Description', 'Amount', ''].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((expense, i) => {
                const color = CATEGORY_COLORS[expense.category] ?? '#94a3b8';
                return (
                  <tr
                    key={expense.id}
                    className="group border-b border-white/[0.03] transition-all duration-150 hover:bg-white/[0.025]"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    {/* Date */}
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs tabular-nums text-slate-500">
                      {expense.date}
                    </td>

                    {/* Category pill with dot */}
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium"
                        style={{ background: color + '18', color }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        {expense.category}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="max-w-[220px] px-5 py-3.5">
                      <p className="truncate text-sm text-slate-300">{expense.description || '—'}</p>
                    </td>

                    {/* Amount */}
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className="text-sm font-bold tabular-nums text-white">
                        {fmt(expense.amount)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => onEdit(expense)}
                          className="btn-icon h-7 w-7 text-slate-600 hover:bg-blue-500/12 hover:text-blue-400"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          disabled={deletingId === expense.id}
                          className="btn-icon h-7 w-7 text-slate-600 hover:bg-red-500/12 hover:text-red-400 disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Footer ── */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between border-t border-white/[0.04] px-5 py-3">
          <p className="text-xs text-slate-600">{filtered.length} transactions</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Total:</span>
            <span className="gradient-text text-sm font-bold">{fmt(totalFiltered)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
