/**
 * Defines the LangGraph graph for a simple chat
 */
import {
  END,
  MemorySaver,
  START,
  StateGraph,
  MessagesAnnotation,
  Annotation,
} from '@langchain/langgraph'
// import { ChatOpenAI } from '@langchain/openai'
import { ChatXAI } from '@langchain/xai'
import {
  HumanMessage,
  RemoveMessage,
  SystemMessage,
} from '@langchain/core/messages'
import { v4 as uuidv4 } from 'uuid'
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

// Define Custom State
// Customise the state by adding a `summary` attribute (in addition to `messages` key,
// which MessagesAnnotation already has)
const GraphAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec, // inherit messages key

  // add summary key to the state
  summary: Annotation<string>({
    reducer: (_, action) => action, // replace previous summary with new one
    default: () => '',
  }),
})

// Define Model Call Node
async function callModel(
  state: typeof GraphAnnotation.State,
): Promise<Partial<typeof GraphAnnotation.State>> {
  // If a summary exists, we add this in as a system message
  const { summary } = state
  let { messages } = state
  if (summary) {
    const systemMessage = new SystemMessage({
      id: uuidv4(),
      content: `Summary of conversation earlier: ${summary}`,
    })
    messages = [systemMessage, ...messages]
  }
  const response = await llm.invoke(messages)
  // We return an object, because this will get added to the existing state
  return { messages: [response] }
}

// Define conditional node to determine whether to end or summarize the conversation
function shouldSummarize(
  state: typeof GraphAnnotation.State,
): 'summarize_conversation' | typeof END {
  const messages = state.messages
  // If there are more than six messages, then we summarize the conversation
  if (messages.length > 6) {
    return 'summarize_conversation'
  }
  // Otherwise we can just end
  return END
}

// Define Summarize Conversation Node
async function summarizeConversation(
  state: typeof GraphAnnotation.State,
): Promise<Partial<typeof GraphAnnotation.State>> {
  // First, we summarize the conversation
  const { summary, messages } = state
  let summaryMessage: string
  if (summary) {
    // If a summary already exists, we use a different system prompt
    // to summarize it than if one didn't
    summaryMessage =
      `This is summary of the conversation to date: ${summary}\n\n` +
      'Extend the summary by taking into account the new messages above:'
  } else {
    summaryMessage = 'Create a summary of the conversation above:'
  }

  // Add summary message to the existing messages
  const allMessages = [
    ...messages,
    new HumanMessage({
      id: uuidv4(),
      content: summaryMessage,
    }),
  ]

  // Call the LLM to create the summary
  const response = await llm.invoke(allMessages)

  // Delete messages that we no longer want to show up
  // Delete all but the last two
  const deleteMessages = messages
    .slice(0, -2) // Pick all but the last two
    .map((m) => new RemoveMessage({ id: m.id! }))
  if (typeof response.content !== 'string') {
    throw new Error('Expected a string response from the model')
  }

  // Add the summary to the state, remove all but last two messages
  return { summary: response.content, messages: deleteMessages }
}

// Define graph FLOW
const builder = new StateGraph(GraphAnnotation)
  // Define the conversation node and the summarize node
  .addNode('conversation', callModel)
  .addNode('summarize_conversation', summarizeConversation)

  // Set the entrypoint as conversation
  .addEdge(START, 'conversation')
  // We now add a conditional edge to check if we need to summarize the conversation
  // shouldSummarize will return END or 'summarize_conversation'
  .addConditionalEdges('conversation', shouldSummarize)
  // We now add a normal edge from `summarize_conversation` to END.
  // This means that after `summarize_conversation` is called, we end.
  .addEdge('summarize_conversation', END)

// Add Memory Persistence
const memory = new MemorySaver()

// Compile and export Grapg object
export const graph = builder.compile({ checkpointer: memory })
