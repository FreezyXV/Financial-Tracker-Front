export type TxType = 'income' | 'expense' | 'transfer';

export interface User {
  id: number;
  name: string;
  email: string;
  currency: string;
  savings_rate_target: number;
  large_transaction_threshold: number;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string | null;
  parent_id: number | null;
  is_essential: boolean;
  transactions_count?: number;
}

export interface Account {
  id: number;
  name: string;
  type: string;
  institution: string | null;
  currency: string;
  opening_balance: number;
  opened_at: string | null;
  manual_value: number | null;
  interest_rate: number | null;
  color: string;
  include_in_net_worth: boolean;
  is_archived: boolean;
  balance: number;
  value: number;
  group: string;
  contributions?: number;
  gain?: number;
  gain_pct?: number;
  xirr?: number | null;
  holdings_value?: number;
  ceiling?: number;
  deposits?: number;
  ceiling_remaining?: number;
  age_years?: number;
  tax_free_date?: string;
}

export interface Transaction {
  id: number;
  account_id: number;
  category_id: number | null;
  transfer_account_id: number | null;
  type: TxType;
  amount: number;
  date: string;
  description: string | null;
  notes: string | null;
  tags: string[] | null;
  category?: Pick<Category, 'id' | 'name' | 'color' | 'icon' | 'type'> | null;
  account?: Pick<Account, 'id' | 'name' | 'type' | 'color'> | null;
  transfer_account?: { id: number; name: string } | null;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface TxPage extends Paginated<Transaction> {
  totals: { income: number; expense: number; net: number; count: number };
}

export interface BudgetRow {
  id: number;
  category_id: number;
  name: string;
  color: string;
  amount: number;
  carry_over: number;
  limit: number;
  spent: number;
  remaining: number;
  percent: number;
  projected: number;
  status: 'ok' | 'warning' | 'over';
  rollover: boolean;
  alert_threshold: number;
  start_date: string | null;
  end_date: string | null;
}

export interface Asset {
  id: number;
  symbol: string;
  name: string;
  asset_class: string;
  isin: string | null;
  currency: string;
  price_source: 'manual' | 'yahoo' | 'coingecko';
  source_id: string | null;
  current_price: number;
  fx_rate: number;
  price_updated_at: string | null;
  region: string | null;
  sector: string | null;
  pea_eligible: boolean;
  operations_count?: number;
}

export interface AssetSearchResult {
  symbol: string;
  name: string;
  asset_class: string;
  exchange: string | null;
  price_source: 'yahoo' | 'coingecko';
  source_id: string;
}

export interface Operation {
  id: number;
  account_id: number;
  asset_id: number | null;
  type: 'buy' | 'sell' | 'dividend' | 'interest' | 'fee';
  quantity: number;
  price: number;
  fx_rate: number;
  fees: number;
  amount: number;
  date: string;
  notes: string | null;
  asset?: Pick<Asset, 'id' | 'symbol' | 'name' | 'asset_class' | 'currency'> | null;
  account?: { id: number; name: string; type: string } | null;
}

export interface Position {
  account_id: number;
  account_name: string;
  asset_id: number;
  symbol: string;
  name: string;
  asset_class: string;
  region: string | null;
  currency: string;
  quantity: number;
  avg_price: number;
  price: number;
  cost: number;
  value: number;
  unrealized: number;
  unrealized_pct: number;
  realized: number;
  dividends: number;
  weight?: number;
  price_updated_at: string | null;
}

export interface PortfolioTotals {
  value: number;
  cash: number;
  contributions: number;
  gain: number;
  gain_pct: number;
  cost: number;
  unrealized: number;
  unrealized_pct: number;
  realized: number;
  dividends: number;
  fees: number;
  xirr: number | null;
}

export interface Portfolio {
  totals: PortfolioTotals;
  accounts: Account[];
  positions: Position[];
  closed_positions: Position[];
  allocation: { by_class: Record<string, number>; by_region: Record<string, number>; by_sector: Record<string, number> };
  dividends_by_month: { month: string; amount: number }[];
  history: { date: string; value: number }[];
}

export interface NetWorth {
  date: string;
  net_worth: number;
  assets: number;
  liabilities: number;
  by_group: Record<string, number>;
  by_type: Record<string, number>;
  by_account: { id: number; name: string; type: string; value: number }[];
}

export interface HistoryPoint {
  date: string;
  net_worth: number;
  assets: number;
  liabilities: number;
  investments: number;
}

export interface CashflowPoint {
  month: string;
  income: number;
  expense: number;
  savings: number;
  savings_rate: number;
  invested: number;
}

export interface Upcoming {
  recurring_id: number;
  date: string;
  description: string;
  amount: number;
  type: TxType;
  category: Pick<Category, 'id' | 'name' | 'color' | 'icon'> | null;
  is_subscription: boolean;
}

export interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  account_id: number | null;
  color: string;
  priority: number;
  current: number;
  remaining: number;
  percent: number;
  months_left: number | null;
  monthly_needed: number | null;
  reached: boolean;
}

export interface MonthSummary {
  income: number;
  expense: number;
  savings: number;
  savings_rate: number;
  essential: number;
  discretionary: number;
  invested: number;
  count: number;
}

export interface Dashboard {
  net_worth: NetWorth;
  change_30d: number;
  change_ytd: number;
  month: MonthSummary;
  cashflow: CashflowPoint[];
  history: HistoryPoint[];
  allocation: Record<string, number>;
  budgets: BudgetRow[];
  upcoming: Upcoming[];
  recent: Transaction[];
  goals: Goal[];
  portfolio: PortfolioTotals;
  indicators: {
    avg_monthly_income: number;
    avg_monthly_expense: number;
    avg_savings_rate: number;
    emergency_fund_months: number | null;
    liquid_savings: number;
    savings_rate_target: number;
  };
  unread_alerts: number;
  uncategorized: number;
}

export interface Insight {
  level: 'good' | 'warning' | 'danger' | 'info';
  text: string;
}

export interface CategoryLine {
  category_id: number | null;
  name: string;
  color: string;
  amount: number;
  count: number;
  share?: number;
  previous?: number;
  average_3m?: number;
  delta_pct?: number | null;
  is_essential?: boolean;
}

export interface MonthlyReport {
  month: string;
  label: string;
  is_current: boolean;
  summary: MonthSummary;
  previous: MonthSummary;
  average_3m: { income: number; expense: number };
  savings_rate_target: number;
  rule_50_30_20: { needs: number; wants: number; savings: number };
  expenses_by_category: CategoryLine[];
  income_by_category: CategoryLine[];
  top_expenses: { id: number; date: string; description: string; amount: number; category: string }[];
  daily_curve: { day: number; current: number | null; previous: number }[];
  budgets: BudgetRow[];
  net_worth: { start: number; end: number; change: number; change_pct: number | null; from_savings: number; from_markets: number };
  portfolio_income: number;
  insights: Insight[];
}

export interface YearlyReport {
  year: number;
  months: (CashflowPoint & { net_worth: number | null })[];
  totals: {
    income: number;
    expense: number;
    savings: number;
    savings_rate: number;
    invested: number;
    avg_monthly_expense: number;
    avg_monthly_income: number;
  };
  net_worth: { start: number; end: number; change: number };
  expenses_by_category: CategoryLine[];
}

export interface Recurring {
  id: number;
  account_id: number;
  category_id: number | null;
  transfer_account_id: number | null;
  type: TxType;
  amount: number;
  description: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  next_date: string;
  end_date: string | null;
  is_subscription: boolean;
  is_active: boolean;
  auto_post: boolean;
  monthly_amount: number;
  category?: Pick<Category, 'id' | 'name' | 'color' | 'icon'> | null;
  account?: { id: number; name: string } | null;
}

export interface RecurringList {
  items: Recurring[];
  totals: { subscriptions_monthly: number; expenses_monthly: number; income_monthly: number; transfers_monthly: number };
  upcoming: Upcoming[];
}

export interface RecurringSuggestion {
  description: string;
  amount: number;
  occurrences: number;
  frequency: 'monthly';
  last_date: string;
  next_date: string;
  category_id: number | null;
  account_id: number;
  yearly_cost: number;
}

export interface Rule {
  id: number;
  pattern: string;
  category_id: number;
  priority: number;
  category?: Pick<Category, 'id' | 'name' | 'color' | 'type'>;
}

export interface AlertItem {
  id: number;
  type: string;
  level: 'info' | 'warning' | 'danger';
  message: string;
  is_read: boolean;
  created_at: string;
}
