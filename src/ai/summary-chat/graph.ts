/**
 * Defines the LangGraph graph for a simple chat
 */
import {
  END,
  MemorySaver,
  START,
  StateGraph,
  MessagesAnnotation,
} from '@langchain/langgraph'
import { ChatPromptTemplate } from '@langchain/core/prompts'
// import { ChatOpenAI } from '@langchain/openai'
import { ChatXAI } from '@langchain/xai'
// import { ChatAnthropic } from '@langchain/anthropic'

// Create LLM Instance
// const llm = new ChatOpenAI({
//   model: 'gpt-4o-mini',
//   temperature: 0,
// })
const llm = new ChatXAI({
  model: 'grok-beta',
  temperature: 0,
})
// const llm = new ChatAnthropic({
//   model: 'claude-3-5-sonnet-20240620',
//   temperature: 0,
// })

// Define prompt template (optional)
export const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    'You talk like a pirate. Answer all questions to the best of your ability.',
  ],
  ['user', '{user_input}'],
])

// Define model call node to take the current state
// and invoke the LLM instance
// MessageAnnotation provides a shortcut that appends the messages to the state
async function callModel(
  state: typeof MessagesAnnotation.State,
): Promise<typeof MessagesAnnotation.State> {
  const response = await llm.invoke(state.messages)
  // Append the messages to the state
  // This is a shortcut provided by the MessagesAnnotation
  return { messages: [response] }
}

// Define graph flow
const builder = new StateGraph(MessagesAnnotation)
  // Add nodes
  .addNode('callModel', callModel)

  // Add edges
  .addEdge(START, 'callModel')
  .addEdge('callModel', END)

// Add Memory Persistence
const memory = new MemorySaver()

// Compile and export Grapg object
export const graph = builder.compile({ checkpointer: memory })
