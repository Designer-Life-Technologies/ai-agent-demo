import { taskMAIstroGraph } from './graph'
import { HumanMessage } from '@langchain/core/messages'
import { AIChat } from '../../types/aiChat'

export async function taskMaistro(chat: AIChat): Promise<any> {
  for await (const event of await taskMAIstroGraph.stream(
    {
      messages: [
        new HumanMessage({
          content: chat.messages[chat.messages.length - 1]!.content!,
          // 'Hello, my name is Anton and I am a software engineer living in Perth, Western Australia',
        }),
      ],
    },
    {
      configurable: {
        thread_id: 'test',
        userId: '10234',
      },
    },
  )) {
    console.dir(event, { depth: null })
  }

  return chat
}

// taskMaistro({
//   messages: [
//     {
//       content:
//         'Hello, my name is Anton and I am a software engineer living in Perth, Western Australia',
//       type: 'human',
//     },
//   ],
// })
