import { prompt, graph } from './graph'
import { type AIChat } from '../../types/aiChat'
import { lagnchainMessageToAIChatMessage } from '../../api/utils/messages'

/**
 * Demonstrates reasoning and action capabilities.
 *
 * The object is to use the LLM to decide on the tools to use to solve the problem.
 * If it needs to use tools again, it will continue to do so until the problem is solved.
 *
 * 4 Tools are defined (tools.ts), add, subtract, multiply and divide.
 *
 * Given a complex instruction, which will require multiple tools to solve, the LLM will use the tools to solve the problem.
 * E.g. "What is 9 times seven plus 25 times two hundred and fifty by 1000?"
 *
 * The LLM is instructed to use standard order of operations, so it will multiply first, then add/subtract
 *    9 x 7 = 63
 *    25 x 250 = 6250
 *    6250 / 1000 = 6.25
 *    63 + 6.25 = 69.25
 *
 * This demonstrates how the LLM can break a complex problem down into steps and execute them. This particular
 * problem is simple enough that the LLM can solve it in one step, but the same reasoning process can be applied
 * to more complex problems.
 *
 * @param chat The chat object
 * @returns The response from the LLM
 */
export async function reAct(chat: AIChat): Promise<AIChat> {
  // Get the prompt from the prompt template
  const messages = await prompt.invoke({
    // Pass the request from the first message in the chat as user_input
    user_input: chat.messages[0]!.content,
  })

  // Invoke the graph chain with the prompt
  const result = await graph.invoke(messages, {
    configurable: { thread_id: chat.thread_id! },
  })

  chat.messages = result.messages.map((message) => {
    return lagnchainMessageToAIChatMessage(message)
  })

  return chat
}

export async function streamingReAct(chat: AIChat): Promise<void> {
  // Get the prompt from the prompt template
  const messages = await prompt.invoke({
    // Pass the request from the first message in the chat as user_input
    user_input: chat.messages[0]!.content,
  })

  const eventStream = await graph.streamEvents(messages, {
    configurable: { thread_id: chat.thread_id! },
    version: 'v2',
  })

  for await (const { event, name, metadata } of eventStream) {
    console.log(
      `Node: ${metadata?.langgraph_node ? metadata?.langgraph_node : ''} Event: ${event}: Name: ${name}`,
    )
  }
}
