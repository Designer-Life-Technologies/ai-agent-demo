import { AIChat } from '../../types/aiChat'
import { Command } from '@langchain/langgraph'
import { researchAssistantGraph } from './graph'

export async function researchAssistant(chat: AIChat) {
  for await (const event of await researchAssistantGraph.stream(
    { topic: chat.messages[0]!.content! },
    {
      configurable: {
        thread_id: chat.thread_id!,
      },
      subgraphs: true,
    },
  )) {
    console.dir(event[1], { depth: null })
    if (event[1].createAnalysts && event[1].createAnalysts.analysts) {
      chat.messages.push({
        type: 'ai',
        content: event[1].createAnalysts,
      })
    }
    if (event[1].__interrupt__) {
      chat.messages.push({
        type: 'interrupt',
        content: null,
        interrupt: event[1].__interrupt__[0].value,
      })
    }
  }

  return chat
}

export async function hitlResume(chat: AIChat): Promise<AIChat> {
  for await (const event of await researchAssistantGraph.stream(
    new Command({
      resume:
        chat.messages[chat.messages.length - 1]!.content! || 'no_feedback',
    }),
    {
      configurable: {
        thread_id: chat.thread_id!,
      },
      subgraphs: true,
    },
  )) {
    console.dir(event[1], { depth: null })
    if (event[1].createAnalysts && event[1].createAnalysts.analysts) {
      chat.messages.push({
        type: 'ai',
        content: event[1].createAnalysts,
      })
    }
    if (event[1].__interrupt__) {
      chat.messages.push({
        type: 'interrupt',
        content: null,
        interrupt: event[1].__interrupt__[0].value,
      })
    }
  }

  return chat
}
