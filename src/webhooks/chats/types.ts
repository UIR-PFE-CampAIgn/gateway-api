export interface ChatWithDetails {
    _id: string;
    lead_id: string;
    lead_name?: string;
    lead_phone?: string;
    business_social_media_id: string;
    status: string;
    running_summary?: string;
    last_inbound_at?: Date;
    last_outbound_at?: Date;
    message_count: number;
    unread_count?: number;
    last_message?: {
      text?: string;
      direction: string;
      msg_type: string;
      created_at: Date;
    };
    created_at: Date;
    updated_at: Date;
  }
  
  export interface MessageWithDetails {
    _id: string;
    chat_id: string;
    direction: 'inbound' | 'outbound';
    msg_type: string;
    text?: string;
    payload?: Record<string, any>;
    provider_message_id?: string;
    ai_reply: boolean;
    ai_model?: string;
    ai_confidence?: number;
    campaign_id?: string;
    created_at: Date;
  }
  
  export interface SendMessageDto {
    chat_id: string;
    text: string;
    msg_type?: string;
  }
  
  export interface GetChatsQuery {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }