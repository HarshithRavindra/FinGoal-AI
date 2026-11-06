export type GoalFeasibilityStatus =
  | 'Feasible'
  | 'Feasible with adjustments'
  | 'Not currently feasible'
  | 'Achievable'
  | 'Achievable with adjustments'
  | 'At Risk';

export interface GoalCurrentPlan {
  monthly_contribution: number;
  remaining_amount: number;
  remaining_months: number;
  estimated_completion_date: string;
  completion_percentage: number;
  feasibility_status: string;
}

export interface GoalOptimizedPlan {
  optimized_monthly_contribution: number;
  potential_additional_savings: number;
  estimated_completion_date: string;
  estimated_months: number;
  time_saved_months: number;
  amount_achievable_by_deadline: number;
  feasibility_status: string;
}

export interface GoalFeasibilityDetails {
  shortfall_per_month: number;
  discretionary_reduction_needed: number;
  suggested_deadline: string;
  suggested_months: number;
  advice: string;
}

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
  completion_percentage?: number;
  estimated_completion_date?: string;
  current_plan?: GoalCurrentPlan;
  optimized_plan?: GoalOptimizedPlan;
  feasibility_details?: GoalFeasibilityDetails;
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
  description?: string;
}

export interface UpdateGoalRequest {
  name?: string;
  target_amount?: number;
  current_savings?: number;
  target_date?: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
  status?: string;
  description?: string;
}

export interface GoalsOverview {
  total_active_goals: number;
  total_target_amount: number;
  total_actual_savings_allocated: number;
  remaining_goal_amount: number;
  monthly_savings_capacity: number;
  actual_accumulated_savings: number;
  unallocated_accumulated_savings: number;
  potential_maximum_monthly_savings: number;
  overall_achievement_percentage: number;
  earliest_target_date?: string | null;
  latest_target_date?: string | null;
}

export interface AllocationPreviewItem {
  goal_id: number;
  goal_name: string;
  category: string;
  priority: string;
  target_amount: number;
  current_savings: number;
  remaining_amount: number;
  recommended_allocation: number;
  new_savings_total: number;
  new_completion_percentage: number;
  priority_weight_percentage: number;
  reason: string;
}

export interface AllocationPreviewResponse {
  actual_accumulated_savings: number;
  total_allocated_previously: number;
  unallocated_savings_available: number;
  total_recommended_allocation: number;
  is_balance_available: boolean;
  status_note: string;
  allocations: AllocationPreviewItem[];
}

export interface AllocateSavingsRequest {
  allocations: Array<{
    goal_id: number;
    amount: number;
    notes?: string;
  }>;
  source?: string;
}

export interface AllocationRecord {
  id: number;
  goal_id: number;
  goal_name: string;
  amount: number;
  allocation_date: string;
  source: string;
  notes?: string | null;
  created_at: string;
}
