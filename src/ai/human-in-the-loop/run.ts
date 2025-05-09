// import { BaseMessage } from '@langchain/core/messages'
// import { lagnchainMessageToAIChatMessage } from '../../api/utils/messages'
import { graph } from './graph'
import { Command } from '@langchain/langgraph'
import { v4 as uuid } from 'uuid'
import { prettyPrint } from '../../api/utils/messages'

// Input
const input = {
  role: 'user',
  content:
    'Use the search tool to ask the user where they are, then look up the weather there',
}

// Thread
const config2 = {
  configurable: { thread_id: uuid() },
  streamMode: 'values' as const,
}

console.log('Thread ID:', config2.configurable.thread_id)
async function run() {
  // Initial Run
  for await (const event of await graph.stream(
    {
      messages: [input],
    },
    config2,
  )) {
    prettyPrint(event.messages[event.messages.length - 1]!)
  }

  const state = await graph.getState(config2)
  console.log('-------------------------- Interrupt: ', state.next)
  prettyPrint(state.values.messages[state.values.messages.length - 1])

  const question =
    state.values.messages[state.values.messages.length - 1].tool_calls?.[0].args
      .input

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  readline.question(question!, (location: string) => {
    readline.close()
    answer(location)
  })
}

async function answer(answer: string) {
  console.log('Answer: ' + answer)
  // Continue the graph execution
  for await (const event of await graph.stream(
    new Command({ resume: answer }),
    config2,
  )) {
    prettyPrint(event.messages[event.messages.length - 1]!)
  }
}

run()
