import { AIChat } from '../../types/aiChat'
import { graph as questionaireGraph } from './graph'
import { HumanMessage } from '@langchain/core/messages'
import { Scenario } from './types'

export async function questionaire(
  chat: AIChat,
  scenario: Scenario,
): Promise<any> {
  const config: any = {
    configurable: {
      thread_id: chat.thread_id!,
    },
    streamMode: 'values' as const,
  }

  for await (const event of await questionaireGraph.stream(
    {
      messages: [
        new HumanMessage({
          content: chat.messages[chat.messages.length - 1]!.content!,
        }),
      ],
      // Provide required field from OverallState
      scenario,
      userId: chat.userId!,
    },
    config,
  )) {
    console.log('--------- Output ---------')
    console.dir(event, { depth: null })
  }

  return chat
}

questionaire(
  {
    userId: 'f46174a2-cccc-48a7-99a4-88662b04c7a3', // mike@joker.com
    thread_id: 'anton-test-100',
    messages: [
      {
        content:
          'What should we do for a worker who has back pain that he says is from sitting at his workstation in the office?',
        type: 'human',
      },
    ],
  },
  'injury',
)
