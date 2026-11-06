export interface HealthScoreMetrics {
  monthly_income: number;
  monthly_expenses: number;
  monthly_savings: number;
  savings_rate: number;
  expense_to_income_ratio: number;
  essential_expense_ratio: number;
  essential_expenses: number;
  discretionary_expenses: number;
  emergency_fund_months: number;
}

export interface FinancialHealthScore {
  id?: number;
  overall_score: number;
  savings_rate_score: number;
  expense_to_income_score: number;
  essential_coverage_score: number;
  income_stability_score: number;
  metrics: HealthScoreMetrics;
  status_badge: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention' | 'Critical';
  summary_explanation: string;
  component_explanations: {
    savings_rate: string;
    expense_to_income: string;
    essential_coverage: string;
    income_stability: string;
  };
  calculated_at: string;
}

