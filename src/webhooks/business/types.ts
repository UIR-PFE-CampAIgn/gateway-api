import { Campaign } from '../campaigns/types';
import { MessageTemplateResponse } from '../templates/types';
export interface CreateBusinessDto {
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  logo_url?: string;
  userId?: string;
}

export interface UpdateBusinessDto {
  name?: string;
  description?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  logo_url?: string;
  is_active?: boolean;
}

export interface BusinessResponse {
  _id: string;
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone: string;
  logo_url?: string;
  is_active: boolean;
  user_id: string;
  campaigns?: number; // Campaign count
  Leads?: number;
  recentCampaigns?: Campaign[];
  welcomeTemplate?: MessageTemplateResponse | null;
  created_at: Date;
  updated_at: Date;
}
