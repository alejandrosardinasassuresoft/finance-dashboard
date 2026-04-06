'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Menu, Search, Bell } from 'lucide-react';
import type { Expense, ExpenseInput } from '@/lib/types';

import Sidebar from './Sidebar';
import MonthlySummary from './MonthlySummary';
import CategoryPieChart from './CategoryPieChart';
import MonthlyLineChart from './MonthlyLineChart';
import ExpenseList from './ExpenseList';
import ExpenseForm from './ExpenseForm';
import AIInsights from './AIInsights';

const SECTION_IDS = ['overview', 'analytics', 'expenses', 'insights'] as const;

export default function Dashboard() {
  const [expenses, setExpenses]     = useState<Expense[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [showForm, setShowForm]     = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [insightKey, setInsightKey] = useState(0);
  const [activeNav, setActiveNav]   = useState<string>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  /* ── Data fetching ── */
  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch('/api/expenses');
      if (!res.ok) throw new Error();
      const json: { data: Expense[] } = await res.json();
      setExpenses(json.data);
    } catch {
      setError('Could not load expenses. Is the server running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  /* ── Scrollspy ── */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveNav(e.target.id);
        }
      },
      { threshold: 0.3 }
    );
    for (const id of SECTION_IDS) {
      const el = sectionRefs.current[id];
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [loading]);

  const scrollTo = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ── CRUD ── */
  const handleAdd = async (data: ExpenseInput) => {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message ?? 'Failed'); }
    const json: { data: Expense } = await res.json();
    setExpenses((p) => [json.data, ...p]);
    setShowForm(false);
    setInsightKey((k) => k + 1);
  };

  const handleEdit = async (data: ExpenseInput) => {
    if (!editExpense) return;
    const res = await fetch(`/api/expenses/${editExpense.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message ?? 'Failed'); }
    const json: { data: Expense } = await res.json();
    setExpenses((p) => p.map((e) => (e.id === json.data.id ? json.data : e)));
    setEditExpense(null);
    setInsightKey((k) => k + 1);
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) return;
    setExpenses((p) => p.filter((e) => e.id !== id));
    setInsightKey((k) => k + 1);
  };

  const setRef = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };

  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar ── */}
      <Sidebar
        active={activeNav}
        onNav={scrollTo}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main area (offset by sidebar width on lg+) ── */}
      <div className="flex min-h-screen w-full flex-col lg:pl-[240px]">

        {/* ── Top header ── */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-white/[0.06] px-4 py-3 sm:px-6"
          style={{ background: 'rgba(6,6,20,0.80)', backdropFilter: 'blur(20px)' }}
        >
          {/* Left — hamburger + page title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="btn-icon text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">
                Smart Finance Dashboard
              </h1>
              <p className="text-[11px] text-slate-500 leading-tight">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Right — actions */}
          <div className="flex items-center gap-2">
            <button className="btn-icon text-slate-400 hover:bg-white/5 hover:text-white">
              <Search className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            </button>
            <button className="btn-icon relative text-slate-400 hover:bg-white/5 hover:text-white">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-purple-500" />
            </button>
            <div className="mx-1 h-5 w-px bg-white/10" />
            <button
              onClick={() => { setEditExpense(null); setShowForm(true); }}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Expense</span>
            </button>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 px-4 py-8 sm:px-6">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={fetchExpenses} />
          ) : (
            <div className="space-y-10 max-w-[1400px]">

              {/* Overview */}
              <section id="overview" ref={setRef('overview')}>
                <SectionLabel label="Overview" />
                <MonthlySummary expenses={expenses} />
              </section>

              {/* Analytics — bento grid */}
              <section id="analytics" ref={setRef('analytics')}>
                <SectionLabel label="Analytics" />
                <div className="grid gap-5 lg:grid-cols-2">
                  <CategoryPieChart expenses={expenses} />
                  <MonthlyLineChart expenses={expenses} />
                </div>
              </section>

              {/* Transactions + AI side by side */}
              <section id="expenses" ref={setRef('expenses')}>
                <SectionLabel label="Transactions" />
                <ExpenseList
                  expenses={expenses}
                  onEdit={(exp) => { setEditExpense(exp); setShowForm(false); }}
                  onDelete={handleDelete}
                />
              </section>

              <section id="insights" ref={setRef('insights')}>
                <SectionLabel label="AI Insights" />
                <AIInsights refreshKey={insightKey} />
              </section>

            </div>
          )}
        </main>
      </div>

      {/* ── Modal ── */}
      {(showForm || editExpense) && (
        <ExpenseForm
          expense={editExpense}
          onSubmit={editExpense ? handleEdit : handleAdd}
          onCancel={() => { setShowForm(false); setEditExpense(null); }}
        />
      )}
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</h2>
      <div className="flex-1 border-t border-white/[0.04]" />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="skeleton h-72 rounded-2xl" />
        <div className="skeleton h-72 rounded-2xl" />
      </div>
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-red-500/20 bg-red-500/8 p-8 text-center">
      <p className="text-2xl mb-3">⚠️</p>
      <p className="text-sm text-red-300 mb-4">{message}</p>
      <button onClick={onRetry} className="btn-ghost mx-auto">Retry</button>
    </div>
  );
}
