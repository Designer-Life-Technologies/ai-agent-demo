import { z } from 'zod'

export const aiChatMessage = z.object({
  request: z.string(),
  response: z.string().optional(),
  time: z.string().optional(),
})

export const aiChat = z.object({
  id: z.string().optional(),
  messages: z.array(aiChatMessage),
})

export type AIChatMessage = z.infer<typeof aiChatMessage>
export type AIChat = z.infer<typeof aiChat>
