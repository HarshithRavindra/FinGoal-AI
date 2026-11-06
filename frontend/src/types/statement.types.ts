export interface BankStatement {
  id: number;
  filename: string;
  file_type: 'pdf' | 'csv';
  file_size_bytes: number;
  upload_date: string;
  bank_name?: string;
  status: 'processing' | 'processed' | 'failed';
  total_transactions: number;
  total_debit: number;
  total_credit: number;
  start_date?: string;
  end_date?: string;
  error_message?: string;
}

export interface StatementUploadResponse {
  statement: BankStatement;
  transactions_count: number;
  message: string;
}

