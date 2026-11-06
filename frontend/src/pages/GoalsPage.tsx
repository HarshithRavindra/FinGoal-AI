import React, { useEffect, useState } from 'react';
import { Target, Plus, Trash2, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import { goalsApi } from '../api/goals.api';
import { CreateGoalRequest, SavingsGoal } from '../types/goal.types';
import { formatDate, formatINR } from '../utils/formatters';
import { Link } from 'react-router-dom';

export const GoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // New goal form state
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const fetchGoals = async () => {
    try {
      const data = await goalsApi.getGoals();
      setGoals(data);
    } catch {
      // Handled silently
    }
  };

  useEffect(() => {
    fetchGoals();
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
      fetchGoals();
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
      fetchGoals();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete goal');
    }
  };

  const getFeasibilityBadge = (status: string) => {
    switch (status) {
      case 'Feasible':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Feasible
          </span>
        );
      case 'Feasible with adjustments':
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            Savings Goal Management & Feasibility Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Compute required monthly contributions matched against your actual uncommitted savings capacity.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Savings Goal</span>
        </button>
      </div>

      {/* Goal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.length > 0 ? (
          goals.map((goal) => {
            const percentage = Math.min(
              100,
              Math.round((goal.current_savings / goal.target_amount) * 100)
            );
            return (
              <div
                key={goal.id}
                className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        {goal.category} • Priority: {goal.priority}
                      </span>
                      <h3 className="text-base font-bold text-slate-100 mt-0.5">{goal.name}</h3>
                    </div>
                    {getFeasibilityBadge(goal.feasibility_status)}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                      <span className="text-slate-400 text-[11px]">Target Amount</span>
                      <p className="text-sm font-bold text-slate-100 mt-0.5">
                        {formatINR(goal.target_amount)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                      <span className="text-slate-400 text-[11px]">Required Monthly</span>
                      <p className="text-sm font-bold text-indigo-400 mt-0.5">
                        {formatINR(goal.required_monthly_savings)}/mo
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Saved: {formatINR(goal.current_savings)} ({percentage}%)</span>
                      <span>Target: {formatDate(goal.target_date)} ({goal.remaining_months} mos)</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-2.5 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-slate-800/30 border border-slate-800/80 text-xs text-slate-300">
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
              Create a goal to let FinGoal compute your uncommitted capacity and build an adaptive roadmap.
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

      {/* Modal for creating goal */}
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
                    min="100"
                    placeholder="120000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Current Savings (₹)
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Deadline Date
                </label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Vehicle">Vehicle</option>
                    <option value="Emergency Fund">Emergency Fund</option>
                    <option value="Education">Education</option>
                    <option value="Home & Real Estate">Home & Real Estate</option>
                    <option value="Travel">Travel</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? 'Assessing Feasibility...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

