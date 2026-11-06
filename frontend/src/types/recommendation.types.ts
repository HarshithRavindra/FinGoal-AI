export type RecommendationCategory =
  | 'savings'
  | 'expenses'
  | 'budgeting'
  | 'emergency_fund'
  | 'debt'
  | 'goals';

export type ImpactLevel = 'high' | 'medium' | 'low';

export interface FinancialRecommendation {
  id: string;
  category: RecommendationCategory;
  title: string;
  description: string;
  impact_level: ImpactLevel;
  suggested_action: string;
  potential_monthly_savings: number;
  source: 'ai_model' | 'rule_engine';
  is_dismissed?: boolean;
}

export interface RecommendationResponse {
  recommendations: FinancialRecommendation[];
  generated_at: string;
  source: 'ai_model' | 'rule_engine';
}

