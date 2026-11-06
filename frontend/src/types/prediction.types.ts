export interface MonthlyCashFlowPoint {
  month: string;
  is_historical: boolean;
  income: number;
  expenses: number;
  net_savings: number;
  essential_expenses?: number;
  discretionary_expenses?: number;
  confidence_lower?: number;
  confidence_upper?: number;
}

export interface CashFlowPredictionResponse {
  model_used: string;
  historical_months_count: number;
  projection_months_count: number;
  monthly_series: MonthlyCashFlowPoint[];
  summary: {
    avg_predicted_income: number;
    avg_predicted_expenses: number;
    avg_predicted_savings: number;
    projected_savings_6m: number;
    savings_trend: 'increasing' | 'stable' | 'decreasing';
  };
  disclaimer: string;
}

