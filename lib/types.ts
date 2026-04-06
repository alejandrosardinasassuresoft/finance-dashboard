export interface Expense {
  id: number;
  amount: number;
  category: string;
  description: string;
  date: string;        // ISO-8601 (YYYY-MM-DD)
  created_at: string;  // datetime('now') from SQLite
}

export type ExpenseInput = {
  amount: number;
  category: string;
  description?: string;
  date: string;
};

export const CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Healthcare',
  'Housing',
  'Utilities',
  'Education',
  'Travel',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#f97316',
  Transportation: '#3b82f6',
  Entertainment: '#a855f7',
  Shopping: '#ec4899',
  Healthcare: '#14b8a6',
  Housing: '#f59e0b',
  Utilities: '#6366f1',
  Education: '#84cc16',
  Travel: '#06b6d4',
  Other: '#94a3b8',
};

export interface MonthlySummary {
  month: string;
  total: number;
  count: number;
}

export interface CategorySummary {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface Insight {
  type:         'warning' | 'tip' | 'trend' | 'success';
  title:        string;
  description:  string;
  value?:       string;   // highlighted metric, e.g. "+35%", "$142", "Food & Dining"
}

export interface SpendingStats {
  total_spend:       number;
  this_month:        number;
  last_month:        number;
  mom_change_pct:    number | null;   // month-over-month %
  top_category:      string;
  top_category_pct:  number;
  avg_daily:         number;
  transaction_count: number;
}

export interface InsightsResponse {
  insights:     Insight[];
  summary:      string;
  stats:        SpendingStats;
  model:        string;             // which model generated this
  generated_at: string;             // ISO timestamp
}
