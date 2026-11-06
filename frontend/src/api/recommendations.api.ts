import api from './client';
import { RecommendationResponse } from '../types/recommendation.types';

export const recommendationsApi = {
  getRecommendations: async (): Promise<RecommendationResponse> => {
    const response = await api.get<RecommendationResponse>('/recommendations/');
    return response.data;
  },

  dismissRecommendation: async (id: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/recommendations/${id}/dismiss`);
    return response.data;
  },
};

