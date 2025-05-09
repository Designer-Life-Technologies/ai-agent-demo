import { AIChat } from '../../types/aiChat'
import { graph } from './graph'

export async function searchWeb(chat: AIChat): Promise<AIChat> {
  // Invoke the graph chain with the prompt
  const result = await graph.invoke(
    { question: chat.messages[0]!.content! },
    {
      configurable: { thread_id: chat.thread_id! },
    },
  )

  console.log(
    await graph.getState({ configurable: { thread_id: chat.thread_id! } }),
  )

  chat.messages.push({
    type: 'ai',
    content: result.answer,
  })

  //   console.dir(chat, { depth: null })
  return chat
}

searchWeb({
  thread_id: 'anton-test-100',
  messages: [
    {
      type: 'human',
      content: 'who was nikola tesla and what was he famous for?',
    },
  ],
})
