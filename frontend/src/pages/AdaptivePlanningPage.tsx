import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  AlertOctagon,
  Calendar,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { goalsApi } from '../api/goals.api';
import { reschedulingApi } from '../api/rescheduling.api';
import { SavingsGoal } from '../types/goal.types';
import {
  AdaptiveRescheduleResult,
  FundingSource,
  UnexpectedExpenseInput,
} from '../types/rescheduling.types';
import { formatDate, formatINR } from '../utils/formatters';

export const AdaptivePlanningPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialGoalId = searchParams.get('goalId');

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<number | ''>(
    initialGoalId ? parseInt(initialGoalId) : ''
  );
  const [amount, setAmount] = useState<string>('20000');
  const [description, setDescription] = useState<string>('Unexpected emergency dental/medical procedure');
  const [fundingSource, setFundingSource] = useState<FundingSource>('current_income');
  const [simulating, setSimulating] = useState<boolean>(false);
  const [applying, setApplying] = useState<boolean>(false);
  const [rescheduleResult, setRescheduleResult] = useState<AdaptiveRescheduleResult | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  useEffect(() => {
    const loadGoals = async () => {
      try {
        const data = await goalsApi.getGoals();
        setGoals(data);
        if (!selectedGoalId && data.length > 0) {
          setSelectedGoalId(data[0].id);
        }
      } catch {
        // Handled silently
      }
    };
    loadGoals();
  }, []);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId || !amount) return;

    setSimulating(true);
    setAppliedSuccess(false);
    try {
      const payload: UnexpectedExpenseInput = {
        goal_id: Number(selectedGoalId),
        amount: parseFloat(amount),
        description,
        funding_source: fundingSource,
      };
      const result = await reschedulingApi.rescheduleGoal(payload);
      setRescheduleResult(result);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to simulate rescheduling');
    } finally {
      setSimulating(false);
    }
  };

  const handleApply = async () => {
    if (!selectedGoalId || !amount) return;

    setApplying(true);
    try {
      const payload: UnexpectedExpenseInput = {
        goal_id: Number(selectedGoalId),
        amount: parseFloat(amount),
        description,
        funding_source: fundingSource,
      };
      await reschedulingApi.applyReschedulePlan(payload);
      setAppliedSuccess(true);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to apply rescheduled plan');
    } finally {
      setApplying(false);
    }
  };

  const selectedGoal = goals.find((g) => g.id === Number(selectedGoalId));

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </span>
          <h1 className="text-xl font-bold text-slate-100">
            Adaptive Goal Rescheduling Engine
          </h1>
        </div>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          FinGoal-AI's core algorithmic innovation: When unexpected life events occur, dynamically recalculate capacity, adjust discretionary margins, and revise milestones without compromising essential living standards.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form: Enter Unexpected Expense */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            Report Unexpected Financial Shock
          </h2>

          <form onSubmit={handleSimulate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Affected Savings Goal
              </label>
              <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({formatINR(g.target_amount)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Unexpected Expense Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="20000"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Description / Nature of Expense
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Medical bill, vehicle repair, home repair..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Funding Source
              </label>
              <select
                value={fundingSource}
                onChange={(e) => setFundingSource(e.target.value as FundingSource)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="current_income">Current Monthly Income</option>
                <option value="emergency_fund">Emergency Savings Cushion</option>
                <option value="goal_savings">Directly from Goal Savings</option>
                <option value="other">Other / Personal Loan</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                The engine never assumes all shocks must be deducted from goal principal.
              </p>
            </div>

            <button
              type="submit"
              disabled={simulating || !selectedGoalId}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-60 cursor-pointer"
            >
              {simulating ? 'Simulating Dynamic Plan...' : 'Simulate Rescheduled Roadmap'}
            </button>
          </form>

          {selectedGoal && (
            <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
              <span className="text-slate-400 font-medium">Selected Goal Baseline:</span>
              <div className="flex justify-between text-slate-300">
                <span>Target:</span>
                <span className="font-semibold">{formatINR(selectedGoal.target_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Current Monthly:</span>
                <span className="font-semibold text-indigo-400">
                  {formatINR(selectedGoal.required_monthly_savings)}/mo
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Current Deadline:</span>
                <span>{formatDate(selectedGoal.target_date)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Simulation Output & Revised Roadmap (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {rescheduleResult ? (
            <div className="space-y-6">
              {/* Comparison Scorecard */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-indigo-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Adaptive Reschedule Diagnosis
                  </h3>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800">
                    {rescheduleResult.feasibility_status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Original Monthly</span>
                    <p className="text-sm font-bold text-slate-200 mt-0.5">
                      {formatINR(rescheduleResult.original_monthly_savings)}/mo
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Revised Monthly</span>
                    <p className="text-sm font-bold text-indigo-400 mt-0.5">
                      {formatINR(rescheduleResult.revised_monthly_savings)}/mo
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Timeline Impact</span>
                    <p className="text-sm font-bold text-amber-400 mt-0.5">
                      {rescheduleResult.delay_months > 0
                        ? `+${rescheduleResult.delay_months} Months`
                        : 'On Schedule'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Revised Deadline</span>
                    <p className="text-sm font-bold text-slate-200 mt-0.5">
                      {formatDate(rescheduleResult.revised_deadline)}
                    </p>
                  </div>
                </div>

                {/* Explanation Block */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 text-xs text-slate-300 space-y-2">
                  <p className="font-semibold text-slate-200">
                    Rationale for Adjustment:
                  </p>
                  <p className="leading-relaxed">{rescheduleResult.explanation}</p>
                  {rescheduleResult.discretionary_reduction_recommended > 0 && (
                    <p className="text-amber-300 font-medium">
                      💡 Suggested non-essential trimming: Reallocate ~
                      {formatINR(rescheduleResult.discretionary_reduction_recommended)}
                      /mo from discretionary entertainment or dining to protect goal timeline.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  {appliedSuccess ? (
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Rescheduled roadmap applied and persisted to database!</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleApply}
                      disabled={applying}
                      className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {applying ? 'Updating Database...' : 'Apply & Save This Adjusted Plan'}
                    </button>
                  )}
                </div>
              </div>

              {/* Monthly Roadmap Progress Chart */}
              {rescheduleResult.roadmap && rescheduleResult.roadmap.length > 0 && (
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    Revised Monthly Savings Trajectory
                  </h3>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rescheduleResult.roadmap}>
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
                        <Bar
                          dataKey="target_savings"
                          name="Monthly Target"
                          fill="#6366f1"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[350px] flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <ShieldAlert className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-sm font-semibold text-slate-200">
                Awaiting Rescheduling Simulation
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Enter an unexpected financial shock on the left. The adaptive engine will recalculate capacity, compute discretionary reallocation, and chart a revised milestone.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

