import React, { useEffect, useState } from 'react';
import {
  Activity,
  TrendingUp,
  RefreshCw,
  Scale,
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
} from 'recharts';
import { healthScoreApi } from '../api/healthScore.api';
import { predictionsApi } from '../api/predictions.api';
import { FinancialHealthScore } from '../types/healthScore.types';
import { CashFlowPredictionResponse } from '../types/prediction.types';
import { formatINR, formatPercentage } from '../utils/formatters';

export const FinancialAnalysisPage: React.FC = () => {
  const [healthScore, setHealthScore] = useState<FinancialHealthScore | null>(null);
  const [predictions, setPredictions] = useState<CashFlowPredictionResponse | null>(null);
  const [recalculating, setRecalculating] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      const [scoreRes, predRes] = await Promise.allSettled([
        healthScoreApi.getLatestScore(),
        predictionsApi.getCashFlowPredictions(6),
      ]);
      if (scoreRes.status === 'fulfilled') setHealthScore(scoreRes.value);
      if (predRes.status === 'fulfilled') setPredictions(predRes.value);
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
    } finally {
      setRecalculating(false);
    }
  };

  // Component score data for breakdown
  const componentData = healthScore
    ? [
        {
          name: 'Savings Rate (30%)',
          score: Math.round(healthScore.savings_rate_score),
          fullMark: 100,
        },
        {
          name: 'Expense/Income (25%)',
          score: Math.round(healthScore.expense_to_income_score),
          fullMark: 100,
        },
        {
          name: 'Essential Coverage (25%)',
          score: Math.round(healthScore.essential_coverage_score),
          fullMark: 100,
        },
        {
          name: 'Income Stability (20%)',
          score: Math.round(healthScore.income_stability_score),
          fullMark: 100,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Financial Health Diagnostic & Predictive Modeling
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Empirical multi-factor health index and machine learning cash flow forecasting.
          </p>
        </div>

        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
          <span>Recalculate Score</span>
        </button>
      </div>

      {/* Main Scorecard Banner */}
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
          <p className="text-[11px] text-slate-500 mt-1">
            Model: FHS = 0.30S + 0.25E + 0.25C + 0.20I
          </p>
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

      {/* Cash Flow Prediction Chart */}
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
                <Legend />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
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

