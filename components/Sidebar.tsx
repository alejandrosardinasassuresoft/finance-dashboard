'use client';

import { LayoutDashboard, Receipt, BarChart3, Sparkles, Settings, Wallet, X } from 'lucide-react';

const NAV = [
  { id: 'overview',   icon: LayoutDashboard, label: 'Overview' },
  { id: 'analytics',  icon: BarChart3,        label: 'Analytics' },
  { id: 'expenses',   icon: Receipt,          label: 'Transactions' },
  { id: 'insights',   icon: Sparkles,         label: 'AI Insights' },
];

interface Props {
  active: string;
  onNav: (id: string) => void;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ active, onNav, open, onClose }: Props) {
  const handleNav = (id: string) => {
    onNav(id);
    onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        {/* ── Brand ── */}
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div
                className="animate-pulse-glow rounded-xl p-2.5"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  boxShadow: '0 4px 20px rgba(124,58,237,0.5)',
                }}
              >
                <Wallet className="h-4 w-4 text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">FinanceAI</p>
              <p className="text-[10px] text-slate-500 leading-tight">Smart Dashboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon text-slate-500 hover:bg-white/5 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Section label ── */}
        <p className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
          Main Menu
        </p>

        {/* ── Nav items ── */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4 custom-scroll">
          {NAV.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => handleNav(id)}
              className={`nav-item ${active === id ? 'active' : ''}`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{label}</span>
              {id === 'insights' && (
                <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-purple-500/20 text-[9px] font-bold text-purple-400">
                  AI
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* ── Divider ── */}
        <div className="mx-5 border-t border-white/5" />

        {/* ── Bottom nav ── */}
        <div className="space-y-0.5 px-3 py-3">
          <button className="nav-item">
            <Settings className="h-4 w-4 flex-shrink-0" />
            <span>Settings</span>
          </button>
        </div>

        {/* ── User card ── */}
        <div className="mx-3 mb-4 mt-1 flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.025] px-3 py-2.5">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}
          >
            U
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">My Account</p>
            <p className="truncate text-[10px] text-slate-500">Personal Finance</p>
          </div>
          <div className="ml-auto h-2 w-2 flex-shrink-0 rounded-full bg-green-400" />
        </div>
      </aside>
    </>
  );
}
