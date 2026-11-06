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

export interface CategoryExpenseItem {
  category: string;
  total_amount: number;
  transaction_count: number;
  expense_type: string;
  percentage_of_income: number;
  percentage_of_total_expense: number;
  suggested_reduction_percentage: number;
  potential_savings: number;
}

export interface MonthlyTrendItem {
  month_label: string;
  income: number;
  total_expenses: number;
  essential_expenses: number;
  discretionary_expenses: number;
  savings: number;
  savings_rate: number;
}

export interface TopDiscretionaryTransaction {
  id: number;
  date: string;
  description: string;
  category: string;
  amount: number;
  percentage_of_income: number;
  expense_type: string;
}

export interface DetailedFinancialOverview {
  monthly_income: number;
  monthly_expenses: number;
  essential_expenses: number;
  discretionary_expenses: number;
  review_expenses: number;
  current_monthly_savings: number;
  actual_accumulated_savings: number;
  potential_additional_savings: number;
  optimized_monthly_savings: number;
  current_savings_rate: number;
  optimized_savings_rate: number;
  potential_annual_savings: number;
  emergency_fund_months: number;
  previous_month_comparison?: {
    current_month: string;
    previous_month: string;
    income_diff: number;
    income_pct_change: number;
    expense_diff: number;
    expense_pct_change: number;
    savings_diff: number;
  } | null;
}

export interface DiscretionaryAnalysisSection {
  total_discretionary_amount: number;
  discretionary_transaction_count: number;
  discretionary_percentage_of_income: number;
  discretionary_percentage_of_expenses: number;
  highest_spending_category: string;
  largest_transaction?: TopDiscretionaryTransaction | null;
  top_categories: CategoryExpenseItem[];
  top_transactions: TopDiscretionaryTransaction[];
  suggested_reductions: Array<{
    category: string;
    monthly_spending: number;
    suggested_reduction_percentage: number;
    potential_savings: number;
  }>;
}

export interface ScoreDiagnostics {
  overall_score: number;
  status_badge: string;
  summary_explanation: string;
  positive_drivers: string[];
  dragging_drivers: string[];
  pillar_recommendations: Record<string, string>;
  simulated_optimized_score: number;
}

export interface DetailedFinancialSummary {
  overview: DetailedFinancialOverview;
  classification: {
    essential_total: number;
    essential_percentage: number;
    discretionary_total: number;
    discretionary_percentage: number;
    review_total: number;
    review_percentage: number;
  };
  category_breakdown: CategoryExpenseItem[];
  monthly_trends: MonthlyTrendItem[];
  discretionary_analysis: DiscretionaryAnalysisSection;
  score_diagnostics: ScoreDiagnostics;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    impact_level: string;
    suggested_action: string;
    potential_monthly_savings: number;
    category: string;
  }>;
  calculated_at: string;
}

export interface ExpenseReductionSimulationResult {
  current: {
    monthly_income: number;
    monthly_expenses: number;
    monthly_savings: number;
    savings_rate: number;
  };
  optimized: {
    optimized_monthly_expenses: number;
    optimized_monthly_savings: number;
    optimized_savings_rate: number;
  };
  category_impacts: Array<{
    category: string;
    original_monthly_spending: number;
    reduction_percentage: number;
    monthly_amount_saved: number;
    optimized_monthly_spending: number;
  }>;
  additional_monthly_savings: number;
  additional_annual_savings: number;
  calculated_at: string;
}
