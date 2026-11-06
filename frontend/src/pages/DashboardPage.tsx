import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Sparkles,
  TrendingUp,
  Target,
  FileUp,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { MetricCard } from '../components/common/MetricCard';
import { healthScoreApi } from '../api/healthScore.api';
import { goalsApi } from '../api/goals.api';
import { recommendationsApi } from '../api/recommendations.api';
import { predictionsApi } from '../api/predictions.api';
import { FinancialHealthScore } from '../types/healthScore.types';
import { SavingsGoal } from '../types/goal.types';
import { FinancialRecommendation } from '../types/recommendation.types';
import { CashFlowPredictionResponse } from '../types/prediction.types';
import { formatINR, formatPercentage } from '../utils/formatters';

const PIE_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Rose
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#ec4899', // Pink
];

export const DashboardPage: React.FC = () => {
  const [healthScore, setHealthScore] = useState<FinancialHealthScore | null>(null);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [recommendations, setRecommendations] = useState<FinancialRecommendation[]>([]);
  const [predictions, setPredictions] = useState<CashFlowPredictionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [scoreRes, goalsRes, recsRes, predRes] = await Promise.allSettled([
        healthScoreApi.getLatestScore(),
        goalsApi.getGoals(),
        recommendationsApi.getRecommendations(),
        predictionsApi.getCashFlowPredictions(6),
      ]);

      if (scoreRes.status === 'fulfilled') setHealthScore(scoreRes.value);
      if (goalsRes.status === 'fulfilled') setGoals(goalsRes.value);
      if (recsRes.status === 'fulfilled')
        setRecommendations(recsRes.value.recommendations || []);
      if (predRes.status === 'fulfilled') setPredictions(predRes.value);
    } catch (err: any) {
      setError('Unable to load some financial metrics. Please ensure you have uploaded bank statements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const metrics = healthScore?.metrics;
  const hasData = !!metrics && metrics.monthly_income > 0;

  // Breakdown for Essential vs Discretionary
  const expenseTypeData = metrics
    ? [
        { name: 'Essential Expenses', value: metrics.essential_expenses || 0 },
        { name: 'Discretionary Expenses', value: metrics.discretionary_expenses || 0 },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Top Banner / Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Financial Health Command Center
            <span className="px-2.5 py-0.5 text-xs rounded-full font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Live Intelligence
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time synthesis of bank statement cash flows, categorization, and adaptive goal roadmap.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/statements"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Upload Statement</span>
          </Link>
          <button
            onClick={fetchDashboardData}
            title="Refresh Metrics"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Monthly Income"
          value={formatINR(metrics?.monthly_income || 0)}
          subtitle="Net monthly inflows"
          icon={ArrowUpRight}
          variant="success"
        />
        <MetricCard
          title="Monthly Expenses"
          value={formatINR(metrics?.monthly_expenses || 0)}
          subtitle="Total operational outflow"
          icon={ArrowDownRight}
          variant="danger"
        />
        <MetricCard
          title="Monthly Savings"
          value={formatINR(metrics?.monthly_savings || 0)}
          subtitle={`Savings Rate: ${formatPercentage(metrics?.savings_rate || 0)}`}
          icon={PiggyBank}
          variant="primary"
        />
        <MetricCard
          title="Financial Health Score"
          value={healthScore ? `${Math.round(healthScore.overall_score)}/100` : '--/100'}
          subtitle={healthScore?.status_badge || 'Awaiting statement data'}
          badge={healthScore?.status_badge}
          icon={Sparkles}
          variant={
            (healthScore?.overall_score || 0) >= 70
              ? 'success'
              : (healthScore?.overall_score || 0) >= 50
              ? 'warning'
              : 'default'
          }
        />
      </div>

      {/* Primary Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Forecast Chart (2 Columns) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Cash Flow Forecast (Next 6 Months)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Baseline Moving Average & Linear Regression estimates
              </p>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              AI Projection
            </span>
          </div>

          <div className="h-64 w-full">
            {predictions?.monthly_series && predictions.monthly_series.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={predictions.monthly_series}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickFormatter={(v) => `₹${v / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(v: any) => [formatINR(Number(v)), '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#incomeGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#expenseGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <TrendingUp className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-sm font-medium text-slate-300">No Cash Flow History Yet</p>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Upload at least one bank statement (PDF or CSV) to generate predictive cash flow trajectories.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Expense Classification Distribution (1 Column) */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              Essential vs Discretionary
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Expense segmentation according to FinGoal guidelines
            </p>

            <div className="h-44 w-full mt-2">
              {hasData && expenseTypeData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {expenseTypeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(v: any) => [formatINR(Number(v)), '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Awaiting categorized expenses
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                Essential (Rent, Utilities, Food)
              </span>
              <span className="font-semibold text-slate-200">
                {formatINR(metrics?.essential_expenses || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Discretionary (Dining, Shopping)
              </span>
              <span className="font-semibold text-slate-200">
                {formatINR(metrics?.discretionary_expenses || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Goals Progress & AI Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Savings Goals Overview */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                Active Savings Goals
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Progress tracking and required monthly contributions
              </p>
            </div>
            <Link
              to="/goals"
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
            >
              Manage All
            </Link>
          </div>

          <div className="space-y-4">
            {goals.length > 0 ? (
              goals.slice(0, 3).map((goal) => {
                const percentage = Math.min(
                  100,
                  Math.round((goal.current_savings / goal.target_amount) * 100)
                );
                return (
                  <div
                    key={goal.id}
                    className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-200 truncate">
                          {goal.name}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Target: {formatINR(goal.target_amount)} • Remaining: {goal.remaining_months} mos
                        </p>
                      </div>
                      <span className="px-2 py-0.5 text-[11px] rounded-md font-medium bg-indigo-950 text-indigo-400 border border-indigo-800">
                        {goal.feasibility_status}
                      </span>
                    </div>

                    <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Saved: {formatINR(goal.current_savings)} ({percentage}%)</span>
                      <span className="text-slate-200 font-medium">
                        Need {formatINR(goal.required_monthly_savings)}/mo
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Target className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No active savings goals found.</p>
                <Link
                  to="/goals"
                  className="mt-2 inline-block text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  + Create your first savings goal
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Personalized AI Recommendations */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                AI Financial Recommendations
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Data-grounded insights tailored to your actual spending
              </p>
            </div>
            <span className="px-2 py-0.5 text-[11px] rounded-full bg-amber-950 text-amber-400 border border-amber-800">
              Personalized
            </span>
          </div>

          <div className="space-y-3">
            {recommendations.length > 0 ? (
              recommendations.slice(0, 3).map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5 flex-shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-slate-200 truncate">
                        {rec.title}
                      </h4>
                      {rec.potential_monthly_savings > 0 && (
                        <span className="text-[11px] font-medium text-emerald-400 flex-shrink-0">
                          Save ~{formatINR(rec.potential_monthly_savings)}/mo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {rec.description}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">
                  Upload transactions to receive AI-powered spending optimization recommendations.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

