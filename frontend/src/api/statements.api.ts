import api from './client';
import { BankStatement, StatementUploadResponse } from '../types/statement.types';

export const statementsApi = {
  uploadStatement: async (file: File): Promise<StatementUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<StatementUploadResponse>(
      '/statements/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  getStatements: async (): Promise<BankStatement[]> => {
    const response = await api.get<BankStatement[]>('/statements/');
    return response.data;
  },

  getStatementById: async (id: number): Promise<BankStatement> => {
    const response = await api.get<BankStatement>(`/statements/${id}`);
    return response.data;
  },

  deleteStatement: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/statements/${id}`);
    return response.data;
  },
};

