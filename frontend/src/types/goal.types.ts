export type GoalFeasibilityStatus =
  | 'Feasible'
  | 'Feasible with adjustments'
  | 'Not currently feasible';

export interface SavingsGoal {
  id: number;
  user_id?: number;
  name: string;
  target_amount: number;
  current_savings: number;
  target_date: string;
  remaining_months: number;
  required_monthly_savings: number;
  available_capacity: number;
  feasibility_status: GoalFeasibilityStatus;
  feasibility_message: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  updated_at: string;
}

export interface CreateGoalRequest {
  name: string;
  target_amount: number;
  current_savings: number;
  target_date: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface UpdateGoalRequest {
  name?: string;
  target_amount?: number;
  current_savings?: number;
  target_date?: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
}

