import api from './client';
import {
  FinancialHealthScore,
  DetailedFinancialSummary,
  ExpenseReductionSimulationResult,
} from '../types/healthScore.types';

export const healthScoreApi = {
  getLatestScore: async (): Promise<FinancialHealthScore> => {
    const response = await api.get<FinancialHealthScore>('/financial-health/score');
    return response.data;
  },

  recalculateScore: async (): Promise<FinancialHealthScore> => {
    const response = await api.post<FinancialHealthScore>('/financial-health/recalculate');
    return response.data;
  },

  getScoreHistory: async (): Promise<FinancialHealthScore[]> => {
    const response = await api.get<FinancialHealthScore[]>('/financial-health/history');
    return response.data;
  },

  getDetailedSummary: async (): Promise<DetailedFinancialSummary> => {
    const response = await api.get<DetailedFinancialSummary>('/financial-health/detailed-summary');
    return response.data;
  },

  simulateExpenseReduction: async (
    categoryReductions: Record<string, number>
  ): Promise<ExpenseReductionSimulationResult> => {
    const response = await api.post<ExpenseReductionSimulationResult>(
      '/financial-health/simulate-calculator',
      { category_reductions: categoryReductions }
    );
    return response.data;
  },
};
