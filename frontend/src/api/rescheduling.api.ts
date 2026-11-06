import api from './client';
import {
  AdaptiveRescheduleResult,
  UnexpectedExpenseInput,
} from '../types/rescheduling.types';

export const reschedulingApi = {
  rescheduleGoal: async (
    payload: UnexpectedExpenseInput
  ): Promise<AdaptiveRescheduleResult> => {
    const response = await api.post<AdaptiveRescheduleResult>(
      '/reschedule/simulate',
      payload
    );
    return response.data;
  },

  applyReschedulePlan: async (
    payload: UnexpectedExpenseInput
  ): Promise<AdaptiveRescheduleResult> => {
    const response = await api.post<AdaptiveRescheduleResult>(
      '/reschedule/apply',
      payload
    );
    return response.data;
  },
};

