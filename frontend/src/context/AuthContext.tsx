import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/auth.api';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types/auth.types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('fingoal_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('fingoal_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyAuth = async () => {
      if (token) {
        try {
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);
          localStorage.setItem('fingoal_user', JSON.stringify(currentUser));
        } catch {
          // Token expired or invalid
          setToken(null);
          setUser(null);
          localStorage.removeItem('fingoal_token');
          localStorage.removeItem('fingoal_user');
        }
      }
      setIsLoading(false);
    };

    verifyAuth();
  }, [token]);

  const login = async (credentials: LoginRequest) => {
    const response: AuthResponse = await authApi.login(credentials);
    setToken(response.access_token);
    setUser(response.user);
    localStorage.setItem('fingoal_token', response.access_token);
    localStorage.setItem('fingoal_user', JSON.stringify(response.user));
  };

  const register = async (payload: RegisterRequest) => {
    const response: AuthResponse = await authApi.register(payload);
    setToken(response.access_token);
    setUser(response.user);
    localStorage.setItem('fingoal_token', response.access_token);
    localStorage.setItem('fingoal_user', JSON.stringify(response.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('fingoal_token');
    localStorage.removeItem('fingoal_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

