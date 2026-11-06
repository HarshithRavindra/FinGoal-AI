export type TransactionCategory =
  | 'Food and Dining'
  | 'Groceries'
  | 'Transportation'
  | 'Shopping'
  | 'Bills and Utilities'
  | 'Healthcare'
  | 'Education'
  | 'Entertainment'
  | 'Rent'
  | 'Income'
  | 'Transfers'
  | 'Others';

export type ExpenseType = 'Essential' | 'Discretionary' | 'Review';

export interface Transaction {
  id: number;
  statement_id?: number;
  date: string;
  description: string;
  raw_description?: string;
  amount: number;
  transaction_type: 'debit' | 'credit';
  category: TransactionCategory;
  expense_type: ExpenseType;
  confidence_score: number;
  is_user_modified: boolean;
  balance?: number;
  notes?: string;
}

export interface TransactionUpdatePayload {
  category?: TransactionCategory;
  expense_type?: ExpenseType;
  description?: string;
  amount?: number;
  date?: string;
}

