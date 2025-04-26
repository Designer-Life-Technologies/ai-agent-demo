import { MessageContent } from '@langchain/core/messages'
import { prompt, graph } from './graph'
import { type AIChat } from '../../types/aiChat'

/**
 * Handles a simple chat request (no memory, single question/answer)
 * @param chat The chat object
 * @returns The response from the LLM
 */
export async function simpleChat(chat: AIChat): Promise<MessageContent> {
  // Get the prompt from the prompt template
  const messages = await prompt.invoke({
    // Pass the request from the first message in the chat as user_input
    user_input: chat.messages[0]!.request,
  })

  // Invoke the graph chain with the prompt
  const result = await graph.invoke(messages, {
    configurable: { thread_id: chat.id! },
  })

  // Return the last message in the response
  if (
    !result.messages ||
    result.messages.length === 0 ||
    result.messages[result.messages.length - 1]!.getType() !== 'ai'
  ) {
    throw new Error('No response from LLM')
  }
  return result.messages[result.messages.length - 1]!.content
}

/**
 * Handles a conversation request (memory, multiple question/answer)
 * @param chat The chat object
 * @returns The response from the LLM
 */
// export async function conversation(chat: AIChat): Promise<MessageContent> {}
