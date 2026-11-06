import api from './client';
import { CreateGoalRequest, SavingsGoal, UpdateGoalRequest } from '../types/goal.types';

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
};

