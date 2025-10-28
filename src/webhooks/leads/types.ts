export interface LeadResponse {
  id: string;
  provider: string;
  provider_user_id: string;
  display_name?: string;
  business_id: string;
  score?: 'hot' | 'warm' | 'cold';
  created_at: string;
}

export interface GetLeadsQuery {
  businessId: string; // ✅ Made required
  search?: string;
  provider?: string;
  score?: 'hot' | 'warm' | 'cold';
  limit?: number;
}

export interface UpdateLeadScoreDto {
  lead_id: string;
  score: 'hot' | 'warm' | 'cold';
}

export interface UpdateLeadScoreResponse {
  success: boolean;
  lead: LeadResponse;
  message: string;
}