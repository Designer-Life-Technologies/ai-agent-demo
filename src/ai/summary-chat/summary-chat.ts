import { graph } from './graph'
import { type AIChat } from '../../types/aiChat'
import { lagnchainMessageToAIChatMessage } from '../../api/utils/messages'
import { HumanMessage } from '@langchain/core/messages'

/**
 * Handles a longer conversation with memory as well as summarisation of the conversation history
 * to preserve tokens.
 *
 * @param chat The chat object
 * @returns The response from the LLM
 */
export async function summaryChat(chat: AIChat): Promise<AIChat> {
  // Get the prompt from the prompt template
  const message = new HumanMessage(chat.messages[0]!.content!)

  // Invoke the graph chain with the prompt
  const result = await graph.invoke(
    { messages: [message] },
    {
      configurable: { thread_id: chat.thread_id! },
    },
  )
  console.log(result)
  chat.messages = result.messages.map((message) =>
    lagnchainMessageToAIChatMessage(message),
  )

  return chat
}

/**
 * Handles a conversation request (memory, multiple question/answer)
 * @param chat The chat object
 * @returns The response from the LLM
 */
// export async function conversation(chat: AIChat): Promise<MessageContent> {}
