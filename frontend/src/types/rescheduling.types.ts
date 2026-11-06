export type FundingSource =
  | 'emergency_fund'
  | 'current_income'
  | 'goal_savings'
  | 'other';

export interface UnexpectedExpenseInput {
  goal_id: number;
  amount: number;
  description: string;
  funding_source: FundingSource;
  expense_date?: string;
}

export interface MonthlyRoadmapItem {
  month: string;
  month_number: number;
  target_savings: number;
  cumulative_savings: number;
  target_met: boolean;
}

export interface AdaptiveRescheduleResult {
  goal_id: number;
  goal_name: string;
  target_amount: number;
  unexpected_expense_amount: number;
  funding_source: FundingSource;
  original_monthly_savings: number;
  revised_monthly_savings: number;
  original_deadline: string;
  revised_deadline: string;
  delay_months: number;
  remaining_target_amount: number;
  feasibility_status: string;
  rescheduling_reason: string;
  discretionary_reduction_recommended: number;
  explanation: string;
  roadmap: MonthlyRoadmapItem[];
  created_at: string;
}

