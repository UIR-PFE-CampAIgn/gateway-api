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

export type ChatAnswerRequest = z.infer<typeof ChatAnswerRequestSchema>;
export type ChatAnswerResponse = z.infer<typeof ChatAnswerResponseSchema>;
