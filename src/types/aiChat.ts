import { z } from 'zod'

export const aiChatMessageType = z.enum([
  'system',
  'human',
  'ai',
  'tool',
  'interrupt',
])

export const aiChatMessageToolCall = z
  .object({
    name: z.string(),
    arguments: z.record(z.string(), z.any()),
  })
  .strict()

export const aiChatMessageInterrupt = z
  .object({
    value: z.any(),
  })
  .strict()

export const aiChatMessage = z
  .object({
    id: z.string().optional(),
    type: aiChatMessageType,
    content: z.string().nullable(),
    tool_calls: z.array(aiChatMessageToolCall).optional(),
    tool_name: z.string().optional(),
    interrupt: aiChatMessageInterrupt.optional(),
    time: z.string().datetime().optional(),
    response_metadata: z
      .object({
        model_name: z.string(),
        token_usage: z.number(),
      })
      .optional(),
  })
  .strict()

export const aiChat = z
  .object({
    userId: z.string().optional(),
    thread_id: z.string().optional(),
    messages: z.array(aiChatMessage),
  })
  .strict()

export type AIChatMessageType = z.infer<typeof aiChatMessageType>
export type AIChatMessageToolCall = z.infer<typeof aiChatMessageToolCall>
export type AIChatMessage = z.infer<typeof aiChatMessage>
export type AIChat = z.infer<typeof aiChat>
