// Set up the tool
import { ChatAnthropic } from '@langchain/anthropic'
import {
  StateGraph,
  MessagesAnnotation,
  START,
  END,
  MemorySaver,
  interrupt,
} from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { AIMessage, ToolMessage } from '@langchain/core/messages'
import { askHumanTool, searchTool } from './tools'

// Set up the LLM
const model = new ChatAnthropic({
  model: 'claude-3-5-sonnet-20240620',
  temperature: 0,
})

// Define the tool node
// This will invoke the tool requested in the state
const tools = [searchTool]
const toolNode = new ToolNode<typeof MessagesAnnotation.State>(tools)

// Bind tools to model
const modelWithTools = model.bindTools([...tools, askHumanTool])

// Define the function that determines whether to continue or not
function shouldContinue(
  state: typeof MessagesAnnotation.State,
): 'action' | 'askHuman' | typeof END {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage
  // If there is no function call, then we finish
  if (lastMessage && !lastMessage.tool_calls?.length) {
    return END
  }
  // If tool call is askHuman, we return that node
  // You could also add logic here to let some system know that there's something that requires Human input
  // For example, send a slack message, etc
  if (lastMessage.tool_calls?.[0]?.name === 'askHuman') {
    console.log('--------------- shouldContinue: askHuman')
    return 'askHuman'
  }
  // Otherwise if it isn't, we continue with the action node
  return 'action'
}

// Define the function that calls the model
async function callModel(
  state: typeof MessagesAnnotation.State,
): Promise<Partial<typeof MessagesAnnotation.State>> {
  console.log('--------------- callModel')
  const messages = state.messages
  const response = await modelWithTools.invoke(messages)
  // We return an object with a messages property, because this will get added to the existing list
  return { messages: [response] }
}

// We define a fake node to ask the human
function askHuman(
  state: typeof MessagesAnnotation.State,
): Partial<typeof MessagesAnnotation.State> {
  console.log('--------------- askHuman')
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage
  const toolCallId = lastMessage.tool_calls?.[0]!.id
  const location: string = interrupt('Please provide your location:')

  console.log('askHuman Resume: ', location)
  const newToolMessage = new ToolMessage({
    tool_call_id: toolCallId!,
    content: location,
  })
  return { messages: [newToolMessage] }
}

// Define a new graph
const messagesWorkflow = new StateGraph(MessagesAnnotation)
  // Define the two nodes we will cycle between
  .addNode('agent', callModel)
  .addNode('action', toolNode)
  .addNode('askHuman', askHuman)

  // This means that this node is the first one called
  .addEdge(START, 'agent')

  // We now add a conditional edge
  .addConditionalEdges(
    // First, we define the start node. We use `agent`.
    // This means these are the edges taken after the `agent` node is called.
    'agent',
    // Next, we pass in the function that will determine which node is called next.
    shouldContinue,
  )
  // We now add a normal edge from `action` to `agent`.
  // This means that after `action` is called, `agent` node is called next.
  .addEdge('action', 'agent')
  // After we get back the human response, we go back to the agent
  .addEdge('askHuman', 'agent')
// Set the entrypoint as `agent`

// Setup memory
const messagesMemory = new MemorySaver()

// Finally, we compile it!
// This compiles it into a LangChain Runnable,
// meaning you can use it as you would any other runnable
export const graph = messagesWorkflow.compile({
  checkpointer: messagesMemory,
})
