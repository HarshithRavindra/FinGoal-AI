import api from './client';
import { Transaction, TransactionUpdatePayload } from '../types/transaction.types';

export interface TransactionFilterParams {
  statement_id?: number;
  category?: string;
  expense_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  skip?: number;
}

export const transactionsApi = {
  getTransactions: async (params?: TransactionFilterParams): Promise<Transaction[]> => {
    const response = await api.get<Transaction[]>('/transactions/', { params });
    return response.data;
  },

  updateTransaction: async (
    id: number,
    payload: TransactionUpdatePayload
  ): Promise<Transaction> => {
    const response = await api.patch<Transaction>(`/transactions/${id}`, payload);
    return response.data;
  },

  deleteTransaction: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/transactions/${id}`);
    return response.data;
  },
};

