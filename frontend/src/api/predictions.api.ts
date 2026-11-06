import api from './client';
import { CashFlowPredictionResponse } from '../types/prediction.types';

export const predictionsApi = {
  getCashFlowPredictions: async (months: number = 6): Promise<CashFlowPredictionResponse> => {
    const response = await api.get<CashFlowPredictionResponse>(
      `/predictions/cash-flow?months=${months}`
    );
    return response.data;
  },
};

