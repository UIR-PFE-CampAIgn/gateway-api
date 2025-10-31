export interface CreateMessageTemplateDto {
  name: string;
  content: string;
  business_id: string;
  category:
    | 'onboarding'
    | 'transactional'
    | 'follow-up'
    | 'promotional'
    | 'welcome'
    | 'general';
  language?: string;
  template_key?: string;
}

export interface UpdateMessageTemplateDto {
  name?: string;
  content?: string;
  category?:
    | 'onboarding'
    | 'transactional'
    | 'follow-up'
    | 'promotional'
    | 'general';
  language?: string;
  template_key?: string;
}

export interface MessageTemplateResponse {
  id: string;
  business_id: string;
  name: string;
  content: string;
  category: string;
  language: string;
  variables: string[];
  usage_count: number;
  last_used_at: Date | null;
  template_key?: string;
  created_at: Date;
  updated_at: Date;
}
