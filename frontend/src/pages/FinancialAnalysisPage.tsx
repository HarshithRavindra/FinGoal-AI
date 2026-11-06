import React, { useEffect, useState, useMemo } from 'react';
import {
  Activity,
  TrendingUp,
  RefreshCw,
  Scale,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  DollarSign,
  PieChart as PieIcon,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  CheckCircle2,
  Info,
  Layers,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { healthScoreApi } from '../api/healthScore.api';
import { predictionsApi } from '../api/predictions.api';
import { transactionsApi } from '../api/transactions.api';
import {
  FinancialHealthScore,
  DetailedFinancialSummary,
  ExpenseReductionSimulationResult,
} from '../types/healthScore.types';
import { CashFlowPredictionResponse } from '../types/prediction.types';
import { Transaction } from '../types/transaction.types';
import { formatINR, formatPercentage } from '../utils/formatters';

export const FinancialAnalysisPage: React.FC = () => {
  const [healthScore, setHealthScore] = useState<FinancialHealthScore | null>(null);
  const [summary, setSummary] = useState<DetailedFinancialSummary | null>(null);
  const [predictions, setPredictions] = useState<CashFlowPredictionResponse | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recalculating, setRecalculating] = useState<boolean>(false);

  // Expense table search, filter, sorting, and pagination
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Interactive Calculator Slider States (% reduction)
  const [sliderReductions, setSliderReductions] = useState<Record<string, number>>({
    'Food and Dining': 30,
    Shopping: 25,
    Entertainment: 40,
    Others: 20,
  });
  const [simResult, setSimResult] = useState<ExpenseReductionSimulationResult | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      const [scoreRes, summaryRes, predRes, txnsRes] = await Promise.allSettled([
        healthScoreApi.getLatestScore(),
        healthScoreApi.getDetailedSummary(),
        predictionsApi.getCashFlowPredictions(6),
        transactionsApi.getTransactions({ limit: 500 }),
      ]);
      if (scoreRes.status === 'fulfilled') setHealthScore(scoreRes.value);
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
      if (predRes.status === 'fulfilled') setPredictions(predRes.value);
      if (txnsRes.status === 'fulfilled') setTransactions(txnsRes.value);
    } finally {
      // Done fetching
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const updated = await healthScoreApi.recalculateScore();
      setHealthScore(updated);
      const updatedSummary = await healthScoreApi.getDetailedSummary();
      setSummary(updatedSummary);
    } finally {
      setRecalculating(false);
    }
  };

  // Run dynamic simulation when sliders adjust
  const handleSliderChange = async (cat: string, value: number) => {
    const updated = { ...sliderReductions, [cat]: value };
    setSliderReductions(updated);
    setSimulating(true);
    try {
      const res = await healthScoreApi.simulateExpenseReduction(updated);
      setSimResult(res);
    } catch {
      // Handled silently
    } finally {
      setSimulating(false);
    }
  };

  // Initial trigger for simulation when summary loads
  useEffect(() => {
    if (summary) {
      healthScoreApi.simulateExpenseReduction(sliderReductions).then(setSimResult).catch(() => {});
    }
  }, [summary]);

  // Handle classification update in expense table
  const handleUpdateClassification = async (id: number, newType: 'Essential' | 'Discretionary' | 'Review') => {
    try {
      await transactionsApi.updateTransaction(id, { expense_type: newType });
      // Update local transaction state
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, expense_type: newType, is_user_modified: true } : t))
      );
      // Refresh summary
      const updatedSummary = await healthScoreApi.getDetailedSummary();
      setSummary(updatedSummary);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update transaction classification');
    }
  };

  // Filtered & Sorted Transactions for Detailed Table
  const filteredTransactions = useMemo(() => {
    let result = [...transactions].filter((t) => t.transaction_type === 'debit');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter((t) => t.expense_type === typeFilter);
    }

    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.category === categoryFilter);
    }

    result.sort((a, b) => {
      if (sortField === 'date') {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return sortOrder === 'desc' ? db - da : da - db;
      } else {
        return sortOrder === 'desc' ? Number(b.amount) - Number(a.amount) : Number(a.amount) - Number(b.amount);
      }
    });

    return result;
  }, [transactions, searchQuery, typeFilter, categoryFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(transactions.filter((t) => t.transaction_type === 'debit').map((t) => t.category));
    return Array.from(cats);
  }, [transactions]);

  // Component score data for breakdown
  const componentData = healthScore
    ? [
        { name: 'Savings Rate (30%)', score: Math.round(healthScore.savings_rate_score) },
        { name: 'Expense/Income (25%)', score: Math.round(healthScore.expense_to_income_score) },
        { name: 'Essential Coverage (25%)', score: Math.round(healthScore.essential_coverage_score) },
        { name: 'Income Stability (20%)', score: Math.round(healthScore.income_stability_score) },
      ]
    : [];

  const overview = summary?.overview;
  const classification = summary?.classification;

  // Comparison chart data for Calculator
  const calcComparisonData = simResult
    ? [
        {
          name: 'Expenses',
          Current: simResult.current.monthly_expenses,
          Optimized: simResult.optimized.optimized_monthly_expenses,
        },
        {
          name: 'Monthly Savings',
          Current: simResult.current.monthly_savings,
          Optimized: simResult.optimized.optimized_monthly_savings,
        },
      ]
    : overview
    ? [
        {
          name: 'Expenses',
          Current: overview.monthly_expenses,
          Optimized: overview.monthly_expenses - overview.potential_additional_savings,
        },
        {
          name: 'Monthly Savings',
          Current: overview.current_monthly_savings,
          Optimized: overview.optimized_monthly_savings,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Financial Health Diagnostic & In-Depth Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Empirical multi-factor health index, granular discretionary analysis, and interactive optimization.
          </p>
        </div>

        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
          <span>Recalculate Diagnostics</span>
        </button>
      </div>

      {/* Main Scorecard Banner (Preserved & Enhanced) */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="text-center md:text-left md:border-r border-slate-800 md:pr-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Composite Index
          </span>
          <div className="mt-2 flex items-baseline justify-center md:justify-start gap-2">
            <span className="text-5xl font-extrabold text-slate-100 tracking-tight">
              {healthScore ? Math.round(healthScore.overall_score) : '--'}
            </span>
            <span className="text-slate-400 font-semibold text-lg">/100</span>
          </div>
          <p className="mt-2 text-xs font-medium text-emerald-400">
            {healthScore?.status_badge || 'Awaiting statement data'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Model: FHS = 0.30S + 0.25E + 0.25C + 0.20I</p>
        </div>

        <div className="md:col-span-2 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Algorithm Diagnosis
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {healthScore?.summary_explanation ||
              'Upload statements to generate a comprehensive diagnostic of your savings rate, fixed cost burden, and liquidity reserves.'}
          </p>
          <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
            <span className="px-2 py-1 bg-slate-800/80 rounded-md border border-slate-700">
              Savings Rate: {formatPercentage(healthScore?.metrics?.savings_rate || 0)}
            </span>
            <span className="px-2 py-1 bg-slate-800/80 rounded-md border border-slate-700">
              Expense/Income: {formatPercentage(healthScore?.metrics?.expense_to_income_ratio || 0)}
            </span>
            <span className="px-2 py-1 bg-slate-800/80 rounded-md border border-slate-700">
              Essential Burden: {formatPercentage(healthScore?.metrics?.essential_expense_ratio || 0)}
            </span>
            <span className="px-2 py-1 bg-slate-800/80 rounded-md border border-slate-700">
              Emergency Cushion: {healthScore?.metrics?.emergency_fund_months?.toFixed(1) || '0.0'} mos
            </span>
          </div>
        </div>
      </div>

      {/* 4 Pillars Component Breakdown */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <h2 className="text-sm font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Scale className="w-4 h-4 text-indigo-400" />
          Component Health Pillar Scores
        </h2>

        <div className="h-60 w-full">
          {componentData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={componentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={160} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${val}/100`, 'Score']}
                />
                <Bar dataKey="score" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No component score data available.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2.1 — 10-Point Comprehensive Financial Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Comprehensive Financial Overview (Real Ledger Records)
          </h2>
          {overview?.previous_month_comparison && (
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
              {overview.previous_month_comparison.income_pct_change >= 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>MoM Income: {overview.previous_month_comparison.income_pct_change}%</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* 1. Monthly Income */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              1. Monthly Income
            </span>
            <span className="text-lg font-bold text-slate-100 mt-1 block">
              {formatINR(overview?.monthly_income || 0)}
            </span>
            <span className="text-[11px] text-emerald-400 mt-1 block">Baseline inflow</span>
          </div>

          {/* 2. Monthly Expenses */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              2. Total Expenses
            </span>
            <span className="text-lg font-bold text-rose-400 mt-1 block">
              {formatINR(overview?.monthly_expenses || 0)}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {overview?.monthly_income ? ((overview.monthly_expenses / overview.monthly_income) * 100).toFixed(1) : 0}% of income
            </span>
          </div>

          {/* 3. Essential Expenses */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              3. Essential Expenses
            </span>
            <span className="text-lg font-bold text-amber-400 mt-1 block">
              {formatINR(overview?.essential_expenses || 0)}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">Protected non-reducible</span>
          </div>

          {/* 4. Discretionary Expenses */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              4. Discretionary Expenses
            </span>
            <span className="text-lg font-bold text-indigo-400 mt-1 block">
              {formatINR(overview?.discretionary_expenses || 0)}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">Lifestyle & leisure</span>
          </div>

          {/* 5. Current Monthly Savings */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              5. Monthly Savings
            </span>
            <span className="text-lg font-bold text-emerald-400 mt-1 block">
              {formatINR(overview?.current_monthly_savings || 0)}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">Income - Total Expenses</span>
          </div>

          {/* 6. Actual Accumulated Savings */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              6. Accumulated Savings
            </span>
            <span className="text-lg font-bold text-cyan-400 mt-1 block">
              {formatINR(overview?.actual_accumulated_savings || 0)}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">Liquid bank reserves</span>
          </div>

          {/* 7. Potential Additional Savings */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              7. Potential Add'l Savings
            </span>
            <span className="text-lg font-bold text-teal-400 mt-1 block">
              +{formatINR(overview?.potential_additional_savings || 0)}/mo
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">From discretionary trim</span>
          </div>

          {/* 8. Optimized Monthly Savings */}
          <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/40 bg-indigo-950/20">
            <span className="text-[11px] font-medium text-indigo-300 uppercase tracking-wider block">
              8. Optimized Savings
            </span>
            <span className="text-lg font-bold text-indigo-300 mt-1 block">
              {formatINR(overview?.optimized_monthly_savings || 0)}/mo
            </span>
            <span className="text-[11px] text-indigo-400 mt-1 block">With lifestyle optimization</span>
          </div>

          {/* 9. Current Savings Rate */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              9. Current Savings Rate
            </span>
            <span className="text-lg font-bold text-slate-100 mt-1 block">
              {overview?.current_savings_rate?.toFixed(1) || 0}%
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">Target benchmark: 30%</span>
          </div>

          {/* 10. Optimized Savings Rate */}
          <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/40 bg-emerald-950/20">
            <span className="text-[11px] font-medium text-emerald-300 uppercase tracking-wider block">
              10. Optimized Rate
            </span>
            <span className="text-lg font-bold text-emerald-300 mt-1 block">
              {overview?.optimized_savings_rate?.toFixed(1) || 0}%
            </span>
            <span className="text-[11px] text-emerald-400 mt-1 block">
              +{overview ? (overview.optimized_savings_rate - overview.current_savings_rate).toFixed(1) : 0}% uplift
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2.2 — Essential vs Discretionary Expense Classification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Breakdown Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-2">
              <PieIcon className="w-4 h-4 text-indigo-400" />
              Expense Classification Ratio
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Breakdown of non-negotiable living needs vs adjustable discretionary comfort spending.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-amber-400 font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Essential Fixed Costs
                  </span>
                  <span className="text-slate-100 font-bold">
                    {formatINR(classification?.essential_total || 0)} ({classification?.essential_percentage || 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full"
                    style={{ width: `${classification?.essential_percentage || 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-indigo-400 font-medium flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" /> Discretionary Lifestyle
                  </span>
                  <span className="text-slate-100 font-bold">
                    {formatINR(classification?.discretionary_total || 0)} ({classification?.discretionary_percentage || 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-400 h-full rounded-full"
                    style={{ width: `${classification?.discretionary_percentage || 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> Review / Ambiguous
                  </span>
                  <span className="text-slate-100 font-bold">
                    {formatINR(classification?.review_total || 0)} ({classification?.review_percentage || 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-slate-500 h-full rounded-full"
                    style={{ width: `${classification?.review_percentage || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-300 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              Essential commitments (Rent, Groceries, Utilities, Healthcare) are strictly protected by the engine. Discretionary spending represents your adjustable savings lever.
            </span>
          </div>
        </div>

        {/* Monthly Spending Trends Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Month-Wise Historical Cash Flow & Expense Composition
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Historical progression of Income, Essential costs, Discretionary outflows, and monthly net savings.
          </p>

          <div className="h-64 w-full">
            {summary?.monthly_trends && summary.monthly_trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.monthly_trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month_label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(v: any) => [formatINR(Number(v)), '']}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="essential_expenses" name="Essential" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="discretionary_expenses" name="Discretionary" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="savings" name="Net Savings" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Awaiting statement data.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2.4 — Discretionary Spending Analysis */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            Discretionary Spending Analysis & Reduction Potential
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Granular breakdown of lifestyle expenditures with empirical reduction recommendations.
          </p>
        </div>

        {/* Top metrics bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase font-medium">Total Discretionary</span>
            <span className="text-lg font-bold text-indigo-300 mt-1 block">
              {formatINR(summary?.discretionary_analysis?.total_discretionary_amount || 0)}/mo
            </span>
            <span className="text-[11px] text-slate-500">
              {summary?.discretionary_analysis?.discretionary_percentage_of_income || 0}% of monthly income
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase font-medium">Highest Category</span>
            <span className="text-lg font-bold text-amber-300 mt-1 block">
              {summary?.discretionary_analysis?.highest_spending_category || 'N/A'}
            </span>
            <span className="text-[11px] text-slate-500">Highest non-essential outflow</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase font-medium">Largest Single Item</span>
            <span className="text-lg font-bold text-rose-300 mt-1 block truncate">
              {formatINR(summary?.discretionary_analysis?.largest_transaction?.amount || 0)}
            </span>
            <span className="text-[11px] text-slate-500 truncate block">
              {summary?.discretionary_analysis?.largest_transaction?.description || 'N/A'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase font-medium">Transactions Count</span>
            <span className="text-lg font-bold text-cyan-300 mt-1 block">
              {summary?.discretionary_analysis?.discretionary_transaction_count || 0}
            </span>
            <span className="text-[11px] text-slate-500">Discretionary ledger debits</span>
          </div>
        </div>

        {/* Category-wise reduction cards */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase text-slate-300 tracking-wider">
            Discretionary Category Trimming Benchmark
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {summary?.discretionary_analysis?.suggested_reductions?.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-100">{item.category}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950 text-indigo-400 border border-indigo-800">
                    Target Cut: {item.suggested_reduction_percentage}%
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-slate-400">Monthly Spending:</span>
                  <span className="text-slate-200 font-semibold">{formatINR(item.monthly_spending)}</span>
                </div>
                <div className="flex justify-between items-baseline text-xs border-t border-slate-700/60 pt-2">
                  <span className="text-emerald-400 font-medium">Potential Monthly Gain:</span>
                  <span className="text-emerald-400 font-bold">+{formatINR(item.potential_savings)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 2.5 — Interactive Expense Reduction Calculator */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 border border-indigo-500/30 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              How Much More Could You Save? (Interactive Optimization Simulator)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Tune discretionary category reduction sliders. Essential expenses are locked and cannot be reduced.
            </p>
          </div>
          {simulating && (
            <span className="text-xs text-indigo-400 flex items-center gap-1.5 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Recalculating...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sliders Column */}
          <div className="space-y-5">
            <h3 className="text-xs font-semibold uppercase text-slate-300 tracking-wider">
              Adjust Discretionary Reductions
            </h3>

            {/* Food and Dining */}
            <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-200">Food and Dining (Swiggy, Zomato, Restaurants)</span>
                <span className="font-bold text-indigo-400">{sliderReductions['Food and Dining']}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={sliderReductions['Food and Dining']}
                onChange={(e) => handleSliderChange('Food and Dining', parseInt(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0% (No change)</span>
                <span>40% (Balanced)</span>
                <span>80% (Aggressive)</span>
              </div>
            </div>

            {/* Shopping */}
            <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-200">Shopping (Amazon, Clothes, Electronics)</span>
                <span className="font-bold text-indigo-400">{sliderReductions['Shopping']}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={sliderReductions['Shopping']}
                onChange={(e) => handleSliderChange('Shopping', parseInt(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0% (No change)</span>
                <span>30% (Recommended)</span>
                <span>80% (Aggressive)</span>
              </div>
            </div>

            {/* Entertainment */}
            <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-200">Entertainment (Netflix, Movies, Events)</span>
                <span className="font-bold text-indigo-400">{sliderReductions['Entertainment']}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={sliderReductions['Entertainment']}
                onChange={(e) => handleSliderChange('Entertainment', parseInt(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0%</span>
                <span>40% (Streamline)</span>
                <span>80%</span>
              </div>
            </div>

            {/* Locked Essential Indicator */}
            <div className="p-3.5 rounded-xl bg-slate-800/20 border border-slate-800/60 flex items-center gap-3 text-xs text-slate-400">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong className="text-slate-200 font-semibold">Protected Essential Commitments:</strong> Rent, Groceries, Utilities, and Healthcare are safely locked at 0% reduction.
              </span>
            </div>
          </div>

          {/* Dynamic Comparison Column */}
          <div className="space-y-5">
            <h3 className="text-xs font-semibold uppercase text-slate-300 tracking-wider">
              Financial Condition Comparison
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* CURRENT */}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Current Condition
                </span>
                <div>
                  <span className="text-xs text-slate-400 block">Monthly Expenses</span>
                  <span className="text-base font-bold text-rose-400">
                    {formatINR(simResult?.current?.monthly_expenses || overview?.monthly_expenses || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Monthly Savings</span>
                  <span className="text-base font-bold text-emerald-400">
                    {formatINR(simResult?.current?.monthly_savings || overview?.current_monthly_savings || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Savings Rate</span>
                  <span className="text-base font-bold text-slate-100">
                    {simResult?.current?.savings_rate?.toFixed(1) || overview?.current_savings_rate?.toFixed(1) || 0}%
                  </span>
                </div>
              </div>

              {/* OPTIMIZED */}
              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/40 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Optimized Condition
                </span>
                <div>
                  <span className="text-xs text-slate-400 block">Optimized Expenses</span>
                  <span className="text-base font-bold text-indigo-300">
                    {formatINR(simResult?.optimized?.optimized_monthly_expenses || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Optimized Savings</span>
                  <span className="text-base font-bold text-emerald-300">
                    {formatINR(simResult?.optimized?.optimized_monthly_savings || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Optimized Rate</span>
                  <span className="text-base font-bold text-emerald-400">
                    {simResult?.optimized?.optimized_savings_rate?.toFixed(1) || 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Total Potential Gains */}
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-300 block">Additional Monthly Wealth Gain:</span>
                <span className="text-xl font-extrabold text-emerald-400">
                  +{formatINR(simResult?.additional_monthly_savings || 0)}/mo
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-400 block">Annual Compounded Impact:</span>
                <span className="text-lg font-bold text-slate-100">
                  +{formatINR(simResult?.additional_annual_savings || 0)}/yr
                </span>
              </div>
            </div>

            {/* Comparison Visual Bar Chart */}
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={calcComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(v: any) => [formatINR(Number(v)), '']}
                  />
                  <Legend />
                  <Bar dataKey="Current" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Optimized" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2.3 — Detailed Interactive Expense Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Detailed Expense Ledger & Classification Editor
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review and adjust individual expense classifications. Changes immediately update your health scores and diagnostics.
            </p>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredTransactions.length} debit transactions
          </span>
        </div>

        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search description..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Expense Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Expense Types</option>
              <option value="Essential">Essential Only</option>
              <option value="Discretionary">Discretionary Only</option>
              <option value="Review">Review (Ambiguous) Only</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div className="flex gap-2">
            <select
              value={sortField}
              onChange={(e: any) => setSortField(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 hover:text-slate-100"
            >
              {sortOrder === 'desc' ? 'Desc' : 'Asc'}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800/70 text-slate-400 border-b border-slate-800 font-semibold">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Amount</th>
                <th className="py-2.5 px-4">% of Monthly Income</th>
                <th className="py-2.5 px-4">Classification</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((t) => {
                  const pctIncome = overview?.monthly_income
                    ? ((Number(t.amount) / overview.monthly_income) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {t.date}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-100 max-w-[200px] truncate">
                        {t.description}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                          {t.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-rose-400">
                        {formatINR(Number(t.amount))}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">{pctIncome}%</td>
                      <td className="py-2.5 px-4">
                        <select
                          value={t.expense_type}
                          onChange={(e) =>
                            handleUpdateClassification(
                              t.id,
                              e.target.value as 'Essential' | 'Discretionary' | 'Review'
                            )
                          }
                          className={`text-[11px] font-semibold rounded px-2 py-1 border cursor-pointer ${
                            t.expense_type === 'Essential'
                              ? 'bg-amber-950 text-amber-400 border-amber-800'
                              : t.expense_type === 'Discretionary'
                              ? 'bg-indigo-950 text-indigo-400 border-indigo-800'
                              : 'bg-slate-800 text-slate-300 border-slate-600'
                          }`}
                        >
                          <option value="Essential">Essential</option>
                          <option value="Discretionary">Discretionary</option>
                          <option value="Review">Review</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-4 text-[11px]">
                        {t.is_user_modified ? (
                          <span className="text-emerald-400 font-medium">User Corrected</span>
                        ) : (
                          <span className="text-slate-500">System AI</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No transactions match current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2.6 — Detailed FHS Diagnostic Drivers & Action Items */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-400" />
            Financial Health Score Drivers & Diagnostic Breakdown
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Why you received your score, key positive strengths, and dragging vulnerabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Positive Factors */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" /> Positive Drivers
            </h3>
            <ul className="space-y-2 text-xs text-slate-200">
              {summary?.score_diagnostics?.positive_drivers && summary.score_diagnostics.positive_drivers.length > 0 ? (
                summary.score_diagnostics.positive_drivers.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>{d}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-400 italic">No significant positive drivers detected yet.</li>
              )}
            </ul>
          </div>

          {/* Dragging Factors */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-3">
            <h3 className="text-xs font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" /> Factors Reducing Score
            </h3>
            <ul className="space-y-2 text-xs text-slate-200">
              {summary?.score_diagnostics?.dragging_drivers && summary.score_diagnostics.dragging_drivers.length > 0 ? (
                summary.score_diagnostics.dragging_drivers.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose-400 mt-0.5">•</span>
                    <span>{d}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-400 italic">No critical drag factors detected.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Pillar Action Items */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Targeted Pillar Action Plan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
              <span className="text-[11px] font-bold text-indigo-400 uppercase">Savings Rate Pillar</span>
              <p className="text-xs text-slate-300">
                {summary?.score_diagnostics?.pillar_recommendations?.savings_rate ||
                  'Automate a salary-day recurring savings transfer before discretionary spending.'}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
              <span className="text-[11px] font-bold text-amber-400 uppercase">Expense Burden Pillar</span>
              <p className="text-xs text-slate-300">
                {summary?.score_diagnostics?.pillar_recommendations?.expense_to_income ||
                  'Cap non-essential dining and shopping to preserve a minimum 25% cash buffer.'}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
              <span className="text-[11px] font-bold text-emerald-400 uppercase">Liquidity Pillar</span>
              <p className="text-xs text-slate-300">
                {summary?.score_diagnostics?.pillar_recommendations?.essential_coverage ||
                  'Build liquid emergency reserves covering at least 3 months of essential fixed costs.'}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
              <span className="text-[11px] font-bold text-cyan-400 uppercase">Income Stability</span>
              <p className="text-xs text-slate-300">
                {summary?.score_diagnostics?.pillar_recommendations?.income_stability ||
                  'Monitor monthly variance and smooth lumpy freelance or bonus revenue streams.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2.7 — Grounded Financial Recommendations */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Personalized Financial Action Plan
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Data-grounded advice derived directly from your actual bank transaction patterns.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary?.recommendations && summary.recommendations.length > 0 ? (
            summary.recommendations.map((r, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-2.5">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-xs font-bold text-slate-100">{r.title}</h3>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      r.impact_level === 'high'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : r.impact_level === 'medium'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                    }`}
                  >
                    {r.impact_level} Priority
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{r.description}</p>
                <div className="p-2.5 rounded bg-slate-800 border border-slate-700/80 text-[11px] text-slate-300">
                  <strong className="text-indigo-400 font-semibold">Recommended Action:</strong>{' '}
                  {r.suggested_action}
                </div>
                {r.potential_monthly_savings > 0 && (
                  <div className="text-[11px] text-emerald-400 font-semibold pt-1">
                    Estimated Benefit: +{formatINR(r.potential_monthly_savings)}/month (+
                    {formatINR(r.potential_monthly_savings * 12)}/year)
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-2 py-6 text-center text-xs text-slate-500">
              Awaiting transactions to generate personalized financial recommendations.
            </div>
          )}
        </div>
      </div>

      {/* Cash Flow Prediction Chart (Preserved) */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4" id="forecast">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Machine Learning Cash Flow Forecast
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical baseline aggregated with Moving Average & Linear Regression models.
            </p>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {predictions?.model_used || 'Standard Baseline'}
          </span>
        </div>

        <div className="h-72 w-full">
          {predictions?.monthly_series && predictions.monthly_series.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={predictions.monthly_series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(v: any) => [formatINR(Number(v)), '']}
                />
                <Legend />
                <Line type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                <Line
                  type="monotone"
                  dataKey="net_savings"
                  name="Net Savings"
                  stroke="#6366f1"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Awaiting sufficient transaction history for regression projections.
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-500 italic">
          * {predictions?.disclaimer ||
            'Predictions are statistical estimates based on past bank statement trends. Unforeseen future expenses and income changes will alter actual results.'}
        </p>
      </div>
    </div>
  );
};
