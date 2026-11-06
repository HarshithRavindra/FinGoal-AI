import React, { useEffect, useState } from 'react';
import { Search, Filter, Check, Edit2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { transactionsApi } from '../api/transactions.api';
import {
  ExpenseType,
  Transaction,
  TransactionCategory,
} from '../types/transaction.types';
import {
  formatDate,
  formatINR,
  getCategoryBadgeClass,
  getExpenseTypeBadgeClass,
} from '../utils/formatters';

const CATEGORIES: TransactionCategory[] = [
  'Food and Dining',
  'Groceries',
  'Transportation',
  'Shopping',
  'Bills and Utilities',
  'Healthcare',
  'Education',
  'Entertainment',
  'Rent',
  'Income',
  'Transfers',
  'Others',
];

const EXPENSE_TYPES: ExpenseType[] = ['Essential', 'Discretionary', 'Review'];

export const TransactionReviewPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCategory, setEditCategory] = useState<TransactionCategory>('Others');
  const [editExpenseType, setEditExpenseType] = useState<ExpenseType>('Review');

  const fetchTransactions = async () => {
    try {
      const data = await transactionsApi.getTransactions();
      setTransactions(data);
    } catch {
      // Handled silently
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleStartEdit = (t: Transaction) => {
    setEditingId(t.id);
    setEditCategory(t.category);
    setEditExpenseType(t.expense_type);
  };

  const handleSaveEdit = async (id: number) => {
    try {
      const updated = await transactionsApi.updateTransaction(id, {
        category: editCategory,
        expense_type: editExpenseType,
      });
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setEditingId(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update transaction');
    }
  };

  const filtered = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.raw_description && t.raw_description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    const matchesType = typeFilter === 'all' || t.expense_type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Transaction Classification & Audit</h1>
          <p className="text-xs text-slate-400 mt-1">
            Review machine learning categorization and essential vs discretionary classifications.
          </p>
        </div>
        <div className="text-xs text-slate-400">
          Total Transactions: <span className="font-semibold text-slate-200">{filtered.length}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search by description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Expense Types</option>
            {EXPENSE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filtered.length > 0 ? (
                filtered.map((t) => {
                  const isEditing = editingId === t.id;
                  const isCredit = t.transaction_type === 'credit';
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {formatDate(t.date)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-200 max-w-xs truncate">
                        {t.description}
                        {t.is_user_modified && (
                          <span className="ml-2 text-[10px] text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-900">
                            Verified
                          </span>
                        )}
                      </td>

                      {/* Category Column */}
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as TransactionCategory)}
                            className="bg-slate-800 border border-indigo-500 rounded px-2 py-1 text-xs text-slate-200"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-full ${getCategoryBadgeClass(
                              t.category
                            )}`}
                          >
                            {t.category}
                          </span>
                        )}
                      </td>

                      {/* Expense Type Column */}
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <select
                            value={editExpenseType}
                            onChange={(e) => setEditExpenseType(e.target.value as ExpenseType)}
                            className="bg-slate-800 border border-indigo-500 rounded px-2 py-1 text-xs text-slate-200"
                          >
                            {EXPENSE_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-full ${getExpenseTypeBadgeClass(
                              t.expense_type
                            )}`}
                          >
                            {t.expense_type}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        {Math.round((t.confidence_score || 0.85) * 100)}%
                      </td>

                      <td
                        className={`py-3.5 px-4 text-right font-semibold whitespace-nowrap ${
                          isCredit ? 'text-emerald-400' : 'text-slate-100'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {isCredit ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                          )}
                          {formatINR(t.amount)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isEditing ? (
                          <button
                            onClick={() => handleSaveEdit(t.id)}
                            className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                            title="Save changes"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(t)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                            title="Edit classification"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No transactions match your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

