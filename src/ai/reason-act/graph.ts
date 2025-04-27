/**
 * Defines the LangGraph graph for a simple chat
 */
import { START, StateGraph, MessagesAnnotation } from '@langchain/langgraph'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { ToolNode, toolsCondition } from '@langchain/langgraph/prebuilt'

// import { ChatOpenAI } from '@langchain/openai'
import { ChatXAI } from '@langchain/xai'
// import { ChatAnthropic } from '@langchain/anthropic'
import { addTool, divideTool, multiplyTool, subtractTool } from './tools'

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
    'You are an assistant tasked with performing arithmetic operations. Use normal mathematical order or operations and do not request confirmation.',
  ],
  ['human', '{user_input}'],
])

// Define LLM call node to determine which tool to use (if any)
// The LLM will consider the tools that is available and make a decision
// on which tool to use (if any).
// The tool call will be added to the state and passed to the next node.
// If no tool is selected, the LLM will respond with a normal ai message.
async function whichToolToUse(
  state: typeof MessagesAnnotation.State,
): Promise<typeof MessagesAnnotation.State> {
  // Bind tools to LLM
  // This tells the LLM about the tools and allows it to decide
  // whether it should make a tool call or not.
  const llmWithTools = llm.bindTools([
    addTool,
    subtractTool,
    multiplyTool,
    divideTool,
  ])
  const response = await llmWithTools.invoke(state.messages)
  return { messages: [response] }
}

// Define the tool node
// This node will invoke the tool that is requested in the state
// message that is passed to it and return the result.
const toolsNode = new ToolNode([
  addTool,
  subtractTool,
  multiplyTool,
  divideTool,
])

// Define graph flow
const builder = new StateGraph(MessagesAnnotation)
  // Add nodes
  .addNode('whichToolToUse', whichToolToUse)
  .addNode('tools', toolsNode)

  // Add edges
  .addEdge(START, 'whichToolToUse')
  .addConditionalEdges('whichToolToUse', toolsCondition)
  .addEdge('tools', 'whichToolToUse') // If another tool call is required, send it back to the tools

// Compile and export Grapg object
export const graph = builder.compile()
