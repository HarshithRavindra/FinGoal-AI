import React, { useEffect, useState, useMemo } from 'react';
import {
  Target,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Sparkles,
  History,
  ShieldCheck,
  Compass,
  Zap,
} from 'lucide-react';
import { goalsApi } from '../api/goals.api';
import {
  CreateGoalRequest,
  SavingsGoal,
  GoalsOverview,
  AllocationPreviewResponse,
  AllocationRecord,
} from '../types/goal.types';
import { formatDate, formatINR } from '../utils/formatters';
import { Link } from 'react-router-dom';

const GOAL_CATEGORIES = [
  'Education',
  'Vehicle',
  'Travel',
  'Emergency Fund',
  'House',
  'Gadgets',
  'Personal',
  'Other',
];

export const GoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [overview, setOverview] = useState<GoalsOverview | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showAllocateModal, setShowAllocateModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [allocationPreview, setAllocationPreview] = useState<AllocationPreviewResponse | null>(null);
  const [allocationHistory, setAllocationHistory] = useState<AllocationRecord[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [allocating, setAllocating] = useState<boolean>(false);

  // New goal form state
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState('Emergency Fund');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

  // Active view toggle on goals: 'current' | 'optimized'
  const [planView, setPlanView] = useState<'current' | 'optimized'>('optimized');

  const fetchGoalsAndOverview = async () => {
    try {
      const [goalsData, overviewData] = await Promise.allSettled([
        goalsApi.getGoals(),
        goalsApi.getOverview(),
      ]);
      if (goalsData.status === 'fulfilled') setGoals(goalsData.value);
      if (overviewData.status === 'fulfilled') setOverview(overviewData.value);
    } catch {
      // Handled silently
    }
  };

  useEffect(() => {
    fetchGoalsAndOverview();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount || !targetDate) return;

    setSubmitting(true);
    try {
      const payload: CreateGoalRequest = {
        name,
        target_amount: parseFloat(targetAmount),
        current_savings: currentSavings ? parseFloat(currentSavings) : 0,
        target_date: targetDate,
        category,
        priority,
      };
      await goalsApi.createGoal(payload);
      setShowModal(false);
      setName('');
      setTargetAmount('');
      setCurrentSavings('');
      setTargetDate('');
      fetchGoalsAndOverview();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await goalsApi.deleteGoal(id);
      fetchGoalsAndOverview();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete goal');
    }
  };

  // Open Smart Auto-Allocate Modal
  const handleOpenAllocateModal = async () => {
    setShowAllocateModal(true);
    try {
      const preview = await goalsApi.getAllocationPreview();
      setAllocationPreview(preview);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to load savings allocation preview');
    }
  };

  // Confirm and Execute Smart Auto-Allocation
  const handleConfirmAllocation = async () => {
    if (!allocationPreview || !allocationPreview.allocations.length) return;
    setAllocating(true);
    try {
      const allocsToApply = allocationPreview.allocations
        .filter((a) => a.recommended_allocation > 0)
        .map((a) => ({
          goal_id: a.goal_id,
          amount: a.recommended_allocation,
          notes: `Smart priority auto-allocation (${a.priority} priority, ${a.priority_weight_percentage}% quota)`,
        }));

      if (!allocsToApply.length) {
        alert('No allocations to apply.');
        return;
      }

      await goalsApi.allocateSavings({ allocations: allocsToApply });
      setShowAllocateModal(false);
      fetchGoalsAndOverview();
      alert('Savings successfully allocated across your active goals based on priority & deadlines!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to execute savings allocation');
    } finally {
      setAllocating(false);
    }
  };

  // Open Allocation History Modal
  const handleOpenHistoryModal = async () => {
    setShowHistoryModal(true);
    try {
      const history = await goalsApi.getAllocationHistory();
      setAllocationHistory(history);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to load allocation history');
    }
  };

  const getFeasibilityBadge = (status: string) => {
    switch (status) {
      case 'Feasible':
      case 'Achievable':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Achievable
          </span>
        );
      case 'Feasible with adjustments':
      case 'Achievable with adjustments':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-950 text-amber-400 border border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            Adjustments Needed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-950 text-rose-400 border border-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            Not Currently Feasible
          </span>
        );
    }
  };

  // Real-time preview calculation in Create Goal Modal
  const previewRequiredMonthly = useMemo(() => {
    if (!targetAmount || !targetDate) return 0;
    const tgt = parseFloat(targetAmount) || 0;
    const cur = parseFloat(currentSavings) || 0;
    const rem = Math.max(0, tgt - cur);
    const today = new Date();
    const tgtD = new Date(targetDate);
    const diffMonths = Math.max(1, (tgtD.getFullYear() - today.getFullYear()) * 12 + (tgtD.getMonth() - today.getMonth()));
    return Math.round(rem / diffMonths);
  }, [targetAmount, currentSavings, targetDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            Savings Goal Management & Dual-Scenario Feasibility Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track milestones, simulate Current vs Optimized plans, and automatically allocate real ledger savings without manual guesswork.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenHistoryModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>Allocation History</span>
          </button>

          <button
            onClick={handleOpenAllocateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Smart Auto-Allocate</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Savings Goal</span>
          </button>
        </div>
      </div>

      {/* SECTION 3.1 — Savings Goal Overview Dashboard (8 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. Total Active Goals */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Active Goals
          </span>
          <span className="text-xl font-bold text-slate-100 mt-1 block">
            {overview?.total_active_goals ?? goals.length}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Concurrent milestones</span>
        </div>

        {/* 2. Total Target Amount */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Total Target
          </span>
          <span className="text-xl font-bold text-indigo-400 mt-1 block">
            {formatINR(overview?.total_target_amount || 0)}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Cumulative capital target</span>
        </div>

        {/* 3. Total Savings Allocated */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Savings Allocated
          </span>
          <span className="text-xl font-bold text-emerald-400 mt-1 block">
            {formatINR(overview?.total_actual_savings_allocated || 0)}
          </span>
          <span className="text-[11px] text-emerald-500/80 mt-0.5 block">
            {overview?.overall_achievement_percentage || 0}% overall achieved
          </span>
        </div>

        {/* 4. Remaining Goal Amount */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Remaining Gap
          </span>
          <span className="text-xl font-bold text-amber-400 mt-1 block">
            {formatINR(overview?.remaining_goal_amount || 0)}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Needed to reach 100%</span>
        </div>

        {/* 5. Monthly Savings Capacity */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Monthly Savings Capacity
          </span>
          <span className="text-xl font-bold text-teal-400 mt-1 block">
            {formatINR(overview?.monthly_savings_capacity || 0)}/mo
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Income - Living Expenses</span>
        </div>

        {/* 6. Actual Accumulated Bank Savings */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Accumulated Bank Reserves
          </span>
          <span className="text-xl font-bold text-cyan-400 mt-1 block">
            {formatINR(overview?.actual_accumulated_savings || 0)}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Verified liquid ledger balance</span>
        </div>

        {/* 7. Potential Max Monthly Savings */}
        <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/30 bg-indigo-950/20">
          <span className="text-[11px] font-medium text-indigo-300 uppercase tracking-wider block">
            Optimized Max Monthly
          </span>
          <span className="text-xl font-bold text-indigo-300 mt-1 block">
            {formatINR(overview?.potential_maximum_monthly_savings || 0)}/mo
          </span>
          <span className="text-[11px] text-indigo-400 mt-0.5 block">With discretionary pruning</span>
        </div>

        {/* 8. Unallocated Available for Goals */}
        <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 bg-emerald-950/20">
          <span className="text-[11px] font-medium text-emerald-300 uppercase tracking-wider block">
            Unallocated Liquid Surplus
          </span>
          <span className="text-xl font-bold text-emerald-300 mt-1 block">
            {formatINR(overview?.unallocated_accumulated_savings || 0)}
          </span>
          <span className="text-[11px] text-emerald-400 mt-0.5 block">Available to auto-allocate</span>
        </div>
      </div>

      {/* Distinction explanation banner */}
      <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-300 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-100 font-semibold">Automatic Ledger Computation: </strong>
          <span>
            Monthly Savings Capacity represents your ongoing cashflow surplus (Income - Expenses). Actual Accumulated Reserves are your current verified liquid savings. In the Smart Auto-Allocate engine, savings are allocated strictly from verified surplus without manual entry.
          </span>
        </div>
      </div>

      {/* Plan Scenario View Selector */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Scenario Mode:</span>
          <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-xs">
            <button
              onClick={() => setPlanView('current')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                planView === 'current' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Current Savings Plan
            </button>
            <button
              onClick={() => setPlanView('optimized')}
              className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                planView === 'optimized'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              Optimized Savings Plan
            </button>
          </div>
        </div>

        <span className="text-[11px] text-slate-400 italic">
          {planView === 'optimized'
            ? 'Simulating a 30% reduction in non-essential dining and shopping to accelerate deadlines.'
            : 'Simulating existing monthly cash flow surplus without lifestyle changes.'}
        </span>
      </div>

      {/* Goal Cards Grid with Dual Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.length > 0 ? (
          goals.map((goal) => {
            const percentage = Math.min(
              100,
              Math.round((goal.current_savings / goal.target_amount) * 100)
            );
            const opt = goal.optimized_plan;
            const cur = goal.current_plan;

            return (
              <div
                key={goal.id}
                className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {goal.category}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            goal.priority === 'high'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : goal.priority === 'medium'
                              ? 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {goal.priority} priority
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-100 mt-1.5">{goal.name}</h3>
                    </div>
                    {getFeasibilityBadge(
                      planView === 'optimized' && opt ? opt.feasibility_status : goal.feasibility_status
                    )}
                  </div>

                  {/* Financial Targets Overview */}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                      <span className="text-slate-400 text-[11px]">Target Amount</span>
                      <p className="text-sm font-bold text-slate-100 mt-0.5">
                        {formatINR(goal.target_amount)}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                      <span className="text-slate-400 text-[11px]">
                        {planView === 'optimized' ? 'Optimized Monthly' : 'Required Monthly'}
                      </span>
                      <p
                        className={`text-sm font-bold mt-0.5 ${
                          planView === 'optimized' ? 'text-emerald-400' : 'text-indigo-400'
                        }`}
                      >
                        {formatINR(
                          planView === 'optimized' && opt
                            ? opt.optimized_monthly_contribution
                            : goal.required_monthly_savings
                        )}
                        /mo
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Saved: {formatINR(goal.current_savings)} ({percentage}%)</span>
                      <span>Target Date: {formatDate(goal.target_date)}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2.5 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Dual Plan Scenario Box */}
                  {planView === 'optimized' && opt ? (
                    <div className="mt-4 p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs space-y-2">
                      <div className="flex items-center justify-between text-indigo-300 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Optimized Plan Impact
                        </span>
                        {opt.time_saved_months > 0 && (
                          <span className="text-[11px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                            Saves {opt.time_saved_months} months!
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                        <div>
                          <span className="text-slate-400">Revised Completion:</span>{' '}
                          <strong className="text-slate-200">{formatDate(opt.estimated_completion_date)}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Discretionary Trim Boost:</span>{' '}
                          <strong className="text-emerald-400">+{formatINR(opt.potential_additional_savings)}/mo</strong>
                        </div>
                      </div>
                    </div>
                  ) : cur ? (
                    <div className="mt-4 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-300 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-slate-400" /> Current Plan Trajectory
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {cur.remaining_months} months remaining
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                        <div>
                          <span className="text-slate-400">Est. Completion:</span>{' '}
                          <strong className="text-slate-200">{formatDate(cur.estimated_completion_date)}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Remaining Gap:</span>{' '}
                          <strong className="text-rose-400">{formatINR(cur.remaining_amount)}</strong>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Feasibility Assessment Advice */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-800/30 border border-slate-800/80 text-xs text-slate-300">
                    <span className="font-semibold text-slate-200">Feasibility Assessment: </span>
                    {goal.feasibility_message}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <Link
                    to={`/adaptive-planning?goalId=${goal.id}`}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
                  >
                    Reschedule Unexpected Expense <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Delete goal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-2 py-12 text-center rounded-2xl bg-slate-900 border border-slate-800">
            <Target className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-200">No Savings Goals Set Yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Create a goal to let FinGoal compute your uncommitted capacity, assess dual plan scenarios, and build an adaptive roadmap.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create First Goal
            </button>
          </div>
        )}
      </div>

      {/* SMART AUTO-ALLOCATE MODAL (Sections 3.3 & 3.4) */}
      {showAllocateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  Smart Automatic Savings Allocation
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculated directly from verified bank ledger reserves. No manual amount guessing required.
                </p>
              </div>
              <button
                onClick={() => setShowAllocateModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Balances Status */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="text-slate-400 text-[11px] uppercase block">Total Bank Liquid Surplus</span>
                <span className="text-base font-bold text-cyan-400 mt-0.5 block">
                  {formatINR(allocationPreview?.actual_accumulated_savings || 0)}
                </span>
                <span className="text-[10px] text-slate-500">Verified from statement records</span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                <span className="text-emerald-300 text-[11px] uppercase block">Unallocated Available</span>
                <span className="text-base font-bold text-emerald-400 mt-0.5 block">
                  {formatINR(allocationPreview?.unallocated_savings_available || 0)}
                </span>
                <span className="text-[10px] text-emerald-500/80">Surplus not yet earmarked</span>
              </div>
            </div>

            {/* Note */}
            <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-300">
              {allocationPreview?.status_note}
            </div>

            {/* Recommended Allocations Table */}
            {allocationPreview?.allocations && allocationPreview.allocations.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  System Priority-Weighted Allocation Breakdown
                </h4>

                <div className="space-y-2.5">
                  {allocationPreview.allocations.map((item) => (
                    <div
                      key={item.goal_id}
                      className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700 space-y-1.5"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">{item.goal_name}</span>
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {item.category}
                          </span>
                        </div>
                        <span className="font-bold text-emerald-400">
                          +{formatINR(item.recommended_allocation)}
                        </span>
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Current: {formatINR(item.current_savings)} / {formatINR(item.target_amount)}</span>
                        <span>New Completion: {item.new_completion_percentage}%</span>
                      </div>

                      <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800">
                        {item.reason}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                  <span className="text-xs font-semibold text-slate-300">
                    Total Auto-Allocation:
                  </span>
                  <span className="text-base font-extrabold text-emerald-400">
                    {formatINR(allocationPreview.total_recommended_allocation)}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAllocateModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!allocationPreview?.is_balance_available || !allocationPreview?.allocations.length || allocating}
                onClick={handleConfirmAllocation}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{allocating ? 'Applying...' : 'Confirm & Allocate'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALLOCATION HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                Savings Allocation History
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {allocationHistory.length > 0 ? (
                allocationHistory.map((rec) => (
                  <div key={rec.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-200">{rec.goal_name}</span>
                      <span className="font-bold text-emerald-400">+{formatINR(rec.amount)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Date: {rec.allocation_date}</span>
                      <span className="capitalize">Source: {rec.source.replace('_', ' ')}</span>
                    </div>
                    {rec.notes && <p className="text-[10px] text-slate-500 italic">{rec.notes}</p>}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  No allocation records found yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOR CREATING GOAL (Extended with Preview) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100">Create Savings Goal</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Goal Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Purchase a Bike, Emergency Cushion"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="100000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Initial Savings (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={currentSavings}
                    onChange={(e) => setCurrentSavings(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {GOAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Goal Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-1.5 text-xs font-semibold rounded-lg capitalize border transition-all ${
                        priority === p
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Real-time Preliminary Calculation Preview */}
              {previewRequiredMonthly > 0 && (
                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs space-y-1">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Est. Required Contribution:</span>
                    <strong className="text-emerald-400 text-sm">
                      {formatINR(previewRequiredMonthly)}/mo
                    </strong>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    Matched against your monthly capacity upon creation.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
