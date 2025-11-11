import { z } from 'zod';

export const ChatAnswerRequestSchema = z.object({
  message: z.string().catch(''),
  provider: z.string().catch(''),
  channel: z.string().catch(''),
  from: z
    .object({
      phone: z.string().catch(''),
      waId: z.string().optional(),
      name: z.string().optional(),
    })
    .catch({ phone: '' }),
  to: z.string().catch(''),
  context: z.record(z.string(), z.any()).optional(),
});

export const ChatAnswerResponseSchema = z.object({
  answer: z.string().default(''),
  model: z.string().optional(),
  confidence: z.number().optional(),
});
export const FeedVectorRecordSchema = z.object({
  field: z.string(),
  content: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
  id: z.string().optional(),
});

export const FeedVectorRequestSchema = z.object({
  business_id: z.string(),
  records: z.array(FeedVectorRecordSchema),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const FeedVectorResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
});

export const CampaignRequestSchema = z.object({
  prompt: z.string(),
  timezone: z.string().optional().default('UTC'),
});

export const CampaignResponseSchema = z.object({
  strategy: z.object({
    target_segments: z.array(z.string()),
    reasoning: z.string(),
    campaign_type: z.string(),
    key_message: z.string(),
    expected_response_rates: z.record(z.string(), z.string()),
  }),
  templates: z.array(
    z.object({
      message: z.string(),
      target_segment: z.string(),
      approach: z.string(),
      personalization_tips: z.string(),
    })
  ),
  schedule: z.array(
    z.object({
      segment: z.string(),
      send_datetime: z.string(),
      day_of_week: z.string(),
      reasoning: z.string(),
      priority: z.string(),
    })
  ),
  insights: z.object({
    success_factors: z.array(z.string()),
    warnings: z.array(z.string()),
    optimization_tips: z.array(z.string()),
  }),
});

export type CampaignRequest = z.infer<typeof CampaignRequestSchema>;
export type CampaignResponse = z.infer<typeof CampaignResponseSchema>;

export type FeedVectorRequest = z.infer<typeof FeedVectorRequestSchema>;
export type FeedVectorResponse = z.infer<typeof FeedVectorResponseSchema>;
export type ChatAnswerRequest = z.infer<typeof ChatAnswerRequestSchema>;
export type ChatAnswerResponse = z.infer<typeof ChatAnswerResponseSchema>;
