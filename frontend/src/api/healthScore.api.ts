import api from './client';
import { FinancialHealthScore } from '../types/healthScore.types';

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
};

