import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../common/http/http-client.service';
import {
  ChatAnswerRequest,
  ChatAnswerResponse,
  ChatAnswerResponseSchema,
} from './ml.schemas';

@Injectable()
export class MlClientService extends HttpClientService {
  private readonly enabled: boolean;

  constructor(config: ConfigService) {
    super({
      baseURL: (
        config.get<string>('ML_SERVICE_URL') ||
        config.get<string>('CAMPAIGN_ML_SERVICE_URL')
      )?.replace(/\/$/, ''),
      timeoutMs: Number(config.get<string>('ML_HTTP_TIMEOUT_MS') ?? 8000),
      headers: { 'Content-Type': 'application/json' },
    });
    this.enabled = Boolean(
      this['axios'].defaults.baseURL &&
        this['axios'].defaults.baseURL.length > 0,
    );
  }

  isEnabled() {
    return this.enabled;
  }

  async answerChat(req: ChatAnswerRequest): Promise<ChatAnswerResponse> {
    if (!this.enabled) {
      throw new Error('ML client disabled: baseURL not configured');
    }
    const res = await this['axios'].post(
      '/api/v1/chat/answer',
      {
        query: req.message,
        business_id: req.from,
        context_limit: 5,
        temperature: 0.7,
        min_confidence: 0.4,
        chat_id: req.channel,
        timestamp: new Date().toLocaleTimeString(),
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
    const parsed = ChatAnswerResponseSchema.safeParse(res.data);
    if (!parsed.success) {
      throw new Error('Invalid ML response schema');
    }
    if (!parsed.data.answer) {
      throw new Error('ML response has empty answer');
    }
    return parsed.data;
  }
}
