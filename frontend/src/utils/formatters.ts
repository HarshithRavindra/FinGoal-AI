import { ExpenseType, TransactionCategory } from '../types/transaction.types';

/**
 * Format a numeric value in Indian Rupees (INR) with standard Lakh/Crore grouping.
 * E.g., 120000 -> ₹1,20,000
 */
export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format decimal as percentage. E.g. 0.25 -> 25.0%
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.0%';
  }
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format ISO date string into readable date: e.g. "12 Oct 2026"
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Color badge styling for Expense Categories
 */
export function getCategoryBadgeClass(category: TransactionCategory): string {
  switch (category) {
    case 'Income':
      return 'bg-emerald-950 text-emerald-400 border border-emerald-800';
    case 'Rent':
    case 'Bills and Utilities':
      return 'bg-blue-950 text-blue-400 border border-blue-800';
    case 'Groceries':
    case 'Food and Dining':
      return 'bg-amber-950 text-amber-400 border border-amber-800';
    case 'Healthcare':
      return 'bg-rose-950 text-rose-400 border border-rose-800';
    case 'Education':
      return 'bg-cyan-950 text-cyan-400 border border-cyan-800';
    case 'Transportation':
      return 'bg-violet-950 text-violet-400 border border-violet-800';
    case 'Shopping':
      return 'bg-purple-950 text-purple-400 border border-purple-800';
    case 'Entertainment':
      return 'bg-pink-950 text-pink-400 border border-pink-800';
    case 'Transfers':
      return 'bg-slate-800 text-slate-300 border border-slate-700';
    default:
      return 'bg-slate-900 text-slate-400 border border-slate-800';
  }
}

/**
 * Color badge styling for Expense Classification (Essential vs Discretionary vs Review)
 */
export function getExpenseTypeBadgeClass(type: ExpenseType): string {
  switch (type) {
    case 'Essential':
      return 'bg-emerald-900/60 text-emerald-300 border border-emerald-700';
    case 'Discretionary':
      return 'bg-purple-900/60 text-purple-300 border border-purple-700';
    case 'Review':
      return 'bg-amber-900/60 text-amber-300 border border-amber-700';
    default:
      return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}

