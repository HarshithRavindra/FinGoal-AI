import api from './client';
import {
  CreateGoalRequest,
  SavingsGoal,
  UpdateGoalRequest,
  GoalsOverview,
  AllocationPreviewResponse,
  AllocateSavingsRequest,
  AllocationRecord,
} from '../types/goal.types';

export const goalsApi = {
  getGoals: async (): Promise<SavingsGoal[]> => {
    const response = await api.get<SavingsGoal[]>('/goals/');
    return response.data;
  },

  getGoalById: async (id: number): Promise<SavingsGoal> => {
    const response = await api.get<SavingsGoal>(`/goals/${id}`);
    return response.data;
  },

  createGoal: async (goal: CreateGoalRequest): Promise<SavingsGoal> => {
    const response = await api.post<SavingsGoal>('/goals/', goal);
    return response.data;
  },

  updateGoal: async (id: number, goal: UpdateGoalRequest): Promise<SavingsGoal> => {
    const response = await api.patch<SavingsGoal>(`/goals/${id}`, goal);
    return response.data;
  },

  deleteGoal: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/goals/${id}`);
    return response.data;
  },

  getOverview: async (): Promise<GoalsOverview> => {
    const response = await api.get<GoalsOverview>('/goals/overview');
    return response.data;
  },

  getAllocationPreview: async (): Promise<AllocationPreviewResponse> => {
    const response = await api.get<AllocationPreviewResponse>('/goals/allocation-preview');
    return response.data;
  },

  allocateSavings: async (payload: AllocateSavingsRequest): Promise<SavingsGoal[]> => {
    const response = await api.post<SavingsGoal[]>('/goals/allocate-savings', payload);
    return response.data;
  },

  getAllocationHistory: async (): Promise<AllocationRecord[]> => {
    const response = await api.get<AllocationRecord[]>('/goals/allocation-history');
    return response.data;
  },
};
