export type LeadStatus = 'new' | 'contacted' | 'replied' | 'converted';
export type AiScore = 'hot' | 'warm' | 'cold';

export interface Lead {
  id: string;
  user_id: string;
  name: string;
  address: string;
  city: string;
  type: string;
  types: string[];
  rating: number | null;
  total_ratings: number;
  place_id: string;
  website: string;
  phone: string;
  contact_name: string;
  contact_email: string;
  ai_score: AiScore | null;
  ai_reason: string;
  offering: string;
  status: LeadStatus;
  created_at: string;
}
