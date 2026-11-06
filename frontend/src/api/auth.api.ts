import api from './client';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types/auth.types';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    // OAuth2 expects form-encoded username & password
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await api.post<AuthResponse>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  register: async (payload: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', payload);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
};

