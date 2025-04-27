import { prompt, graph } from './graph'
import { type AIChat } from '../../types/aiChat'
import { lagnchainMessageToAIChatMessage } from '../../api/utils/messages'

/**
 * Handles a simple chat request with memory.
 * If thread_id is specified, it will be used and the message history
 * will be passed to the LLM.
 *
 * This will cause excessive token usage since the message history will be passed
 * to the LLM. See summary-chat where the LLM is used to summarise the
 * conversation history and only that is passed to the LLM, preserving tokens.
 *
 * @param chat The chat object
 * @returns The response from the LLM
 */
export async function simpleChat(chat: AIChat): Promise<AIChat> {
  // Get the prompt from the prompt template
  const messages = await prompt.invoke({
    // Pass the request from the first message in the chat as user_input
    user_input: chat.messages[0]!.content,
  })

  // Invoke the graph chain with the prompt
  const result = await graph.invoke(messages, {
    configurable: { thread_id: chat.thread_id! },
  })

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
