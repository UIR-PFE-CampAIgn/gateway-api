export interface CreateCampaignDto {
  template_id: string;
  name: string;
  schedule_type: 'immediate' | 'scheduled' | 'recurring';
  scheduled_at?: Date;
  cron_expression?: string;
  target_leads: string[];
  lead_data?: Record<string, any>[];
}

export interface CampaignLog {
  _id: string;
  campaign_id: string;
  lead_id: string;
  message_template_id: string;
  message_content: string;
  status: 'pending' | 'sent' | 'failed';
  message_id?: string;
  error_message?: string;
  sent_at?: Date;
  created_at: Date;
}

export interface Campaign {
  _id: string;
  business_id: string;
  template_id: string;
  name: string;
  schedule_type: 'immediate' | 'scheduled' | 'recurring';
  scheduled_at?: Date;
  cron_expression?: string;
  target_leads: string[];
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'failed';
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: Date;
  updated_at: Date;
}
