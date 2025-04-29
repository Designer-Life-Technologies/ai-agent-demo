import { prompt, graph } from './graph'
import { type AIChat } from '../../types/aiChat'

/**
 * Handles a simple chat with memory.
 *
 * If thread_id is specified, it will be used and the message history
 * will be passed to the LLM.
 *
 * If thread_id is not specified, a new thread will be created.
 *
 * This will cause excessive token usage since the message history will be passed
 * to the LLM. See summary-chat where the LLM is used to summarise the
 * conversation history and only that is passed to the LLM, preserving tokens.
 *
 * @param chat The chat object
 * @returns The response from the LLM
 */
export async function streamingChat(chat: AIChat): Promise<ReadableStream> {
  // Get the prompt from the prompt template
  const messages = await prompt.invoke({
    // Pass the request from the first message in the chat as user_input
    user_input: chat.messages[0]!.content,
  })

  // Invoke the graph chain with the prompt
  const stream = await graph.stream(messages, {
    configurable: { thread_id: chat.thread_id! },
    streamMode: 'messages',
  })

  // Create output stream and pass on the chunks received
  // from the LLM
  const outputStream = new ReadableStream({
    async start(controller) {
      for await (const [message, _metadata] of stream) {
        // console.log(message)
        // console.log(_metadata)
        controller.enqueue(message.content)
      }
      controller.close()
    },
  })

  return outputStream
}

export async function streamingChatEvents(chat: AIChat): Promise<void> {
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
