'use client';

import { useState, useEffect } from 'react';
import { X, Save, Plus, DollarSign } from 'lucide-react';
import { CATEGORIES, CATEGORY_COLORS, type Expense, type ExpenseInput } from '@/lib/types';

interface Props {
  expense?: Expense | null;
  onSubmit: (data: ExpenseInput) => Promise<void>;
  onCancel: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

export default function ExpenseForm({ expense, onSubmit, onCancel }: Props) {
  const isEdit = Boolean(expense);

  const [form, setForm] = useState<ExpenseInput>({
    amount: 0, category: CATEGORIES[0], date: today(), description: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<Partial<Record<keyof ExpenseInput, string>>>({});

  useEffect(() => {
    if (expense) {
      setForm({ amount: expense.amount, category: expense.category, date: expense.date, description: expense.description ?? '' });
    }
  }, [expense]);

  const validate = () => {
    const e: typeof errors = {};
    if (!form.amount || form.amount <= 0) e.amount = 'Enter a positive amount';
    if (!form.date) e.date = 'Date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try { await onSubmit(form); } finally { setLoading(false); }
  };

  const set = (key: keyof ExpenseInput) => (
    ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((p) => ({ ...p, [key]: key === 'amount' ? parseFloat(ev.target.value) || 0 : ev.target.value }));
    setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const selectedColor = CATEGORY_COLORS[form.category] ?? '#7c3aed';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
    >
      <div className="glass-card-grad w-full max-w-md animate-slide-up overflow-hidden">

        {/* ── Gradient header ── */}
        <div
          className="relative px-6 py-5"
          style={{
            background: `linear-gradient(135deg, ${selectedColor}22, ${selectedColor}08)`,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Decorative glow */}
          <div
            className="glow-orb h-32 w-32 -right-8 -top-8 opacity-30"
            style={{ background: selectedColor }}
          />

          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">
                {isEdit ? 'Edit Expense' : 'New Expense'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {isEdit ? 'Update the expense details' : 'Track a new spending entry'}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="btn-icon text-slate-400 hover:bg-white/8 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Form body ── */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">

          {/* Amount + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">
                Amount <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="glass-input pl-8"
                  placeholder="0.00"
                  value={form.amount || ''}
                  onChange={set('amount')}
                />
              </div>
              {errors.amount && <p className="mt-1 text-[11px] text-red-400">{errors.amount}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Category</label>
              <div className="relative">
                <span
                  className="pointer-events-none absolute left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
                  style={{ background: selectedColor }}
                />
                <select
                  className="glass-input pl-7"
                  value={form.category}
                  onChange={set('category')}
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">
              Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              className="glass-input"
              value={form.date}
              onChange={set('date')}
              style={{ colorScheme: 'dark' }}
            />
            {errors.date && <p className="mt-1 text-[11px] text-red-400">{errors.date}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">Description</label>
            <textarea
              className="glass-input resize-none"
              rows={2}
              placeholder="e.g. Grocery run at Whole Foods, Netflix monthly…"
              value={form.description}
              onChange={set('description')}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel} className="btn-ghost flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : isEdit ? (
                <><Save className="h-4 w-4" /> Save Changes</>
              ) : (
                <><Plus className="h-4 w-4" /> Add Expense</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
