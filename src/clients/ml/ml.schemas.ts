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
export type FeedVectorRequest = z.infer<typeof FeedVectorRequestSchema>;
export type FeedVectorResponse = z.infer<typeof FeedVectorResponseSchema>;
export type ChatAnswerRequest = z.infer<typeof ChatAnswerRequestSchema>;
export type ChatAnswerResponse = z.infer<typeof ChatAnswerResponseSchema>;
