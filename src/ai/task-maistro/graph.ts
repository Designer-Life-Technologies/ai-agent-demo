/**
 * Defines the LangGraph graph for a simple chat
 */
import {
  START,
  END,
  StateGraph,
  MessagesAnnotation,
  LangGraphRunnableConfig,
  BaseStore,
  MemorySaver,
  InMemoryStore,
} from '@langchain/langgraph'
import { AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'
// import { ChatXAI } from '@langchain/xai'
// import { ChatAnthropic } from '@langchain/anthropic'
import { z } from 'zod'
import { tool } from '@langchain/core/tools'
import { v4 as uuid } from 'uuid'

// Create LLM Instance
const llm = new ChatOpenAI({
  model: 'gpt-4o-mini',
  temperature: 0,
})
// const llm = new ChatXAI({
//   model: 'grok-beta',
//   temperature: 0,
// })
// const llm = new ChatAnthropic({
//   model: 'claude-3-5-sonnet-20240620',
//   temperature: 0,
// })

// Memory store instance
const inMemoryStore = new InMemoryStore()

/**
 * User Profile Schema
 */
const ProfileSchema = z.object({
  name: z.string().nullable().describe("The user's name"),
  location: z.string().nullable().describe("The user's location"),
  job: z.string().nullable().describe("The user's job"),
  preferences: z
    .array(z.string())
    .describe('Personal preferences of the user, such as likes, dislikes')
    .nullable(),
  interests: z
    .array(z.string())
    .describe('Interests and hobbies of the user')
    .nullable(),
})

/**
 * Create user profile prompt
 */
function generateUserProfilePrompt(memory: string): string {
  return `You are collecting information about the user to personalize your responses.

  CURRENT USER INFORMATION:
  ${memory}

  INSTRUCTIONS:
  1. Review the chat history below carefully
  2. Identify new information about the user, such as:
    - Personal details (name, location, job)
    - Preferences (likes, dislikes)
    - Interests and hobbies
  3. Merge any new information with existing memory
  4. Format the memory as a clear, bulleted list
  5. If new information conflicts with existing memory, keep the most recent version

  Remember: Only include factual information directly stated by the user. Do not make assumptions or inferences.

  Based on the chat history below, please update the user information:`
}

/**
 * ToDo Schema
 */
const ToDoSchema = z.object({
  key: z.string().nullable().describe('The key of the todo item if it exists'),
  task: z.string().describe('The task to be completed.'),
  // time_to_complete: z
  //   .number()
  //   .nullable()
  //   .describe('Estimated time to complete the task (minutes).'),
  // deadline: z
  //   .date()
  //   .nullable()
  //   .describe('When the task needs to be completed by (if applicable)'),
  // solutions: z
  //   .array(z.string())
  //   .describe(
  //     'List of specific, actionable solutions (e.g., specific ideas, service providers, or concrete options relevant to completing the task)',
  //   )
  //   .nullable(),
  // status: z
  //   .enum(['not started', 'in progress', 'done', 'archived'])
  //   .nullable()
  //   .describe('Current status of the task'),
})

function generateTodoPrompt(todos: string): string {
  return `Reflect on the following interactions and the current todo list:
    <todo>
      ${todos}
    </todo>

    The todo list has tasks, and each task has a unique key. The list can be empty.

    Examine the todo list carefully to see if the new task is related to an existing task. If the new task is related to an existing task, set the key value to that of the existing task and combine the task descriptions.
    
    Otherwise, return '' as the key value. 

    `
}

const updateMemorySchema = z.object({
  update_type: z.enum(['user', 'todo', 'instructions']),
})

const updateMemoryTool = tool(
  (input: z.infer<typeof updateMemorySchema>) => input.update_type,
  {
    name: 'updateMemory',
    description: 'Update memory',
    schema: updateMemorySchema,
  },
)

/**
 * Utility function to check that the store is available
 * as well as ensure the user id is set
 *
 * @param config - The LangGraphRunnableConfig object
 * @returns The BaseStore object
 */
function getStore(config: LangGraphRunnableConfig): BaseStore {
  if (!config.store) {
    throw new Error('store is required when compiling the graph')
  }
  if (!config.configurable?.userId) {
    throw new Error('userId is required in the config')
  }
  return config.store
}

function generateSystemPrompt(
  profile: string,
  todo: string,
  instructions: string,
): string {
  return `You are a helpful chatbot. 

    You are designed to be a companion to a user, helping them keep track of their ToDo list.

    You have a long term memory which keeps track of three things:
    1. The user's profile (general information about them) 
    2. The user's ToDo list
    3. General instructions for updating the ToDo list

    Here is the current User Profile (may be empty if no information has been collected yet):
    <user_profile>
    ${profile}
    </user_profile>

    Here is the current ToDo List (may be empty if no tasks have been added yet):
    <todo>
    ${todo}
    </todo>

    Here are the current user-specified preferences for updating the ToDo list (may be empty if no preferences have been specified yet):
    <instructions>
    ${instructions}
    </instructions>

    Here are your instructions for reasoning about the user's messages:

    1. Reason carefully about the user's messages as presented below. 

    2. Decide whether any of the your long-term memory should be updated:
    - If personal information was provided about the user, update the user's profile by calling UpdateMemory tool with type \\\`user\\\`
    - If tasks are mentioned, update the ToDo list by calling UpdateMemory tool with type \\\`todo\\\`
    - If the user has specified preferences for how to update the ToDo list, update the instructions by calling UpdateMemory tool with type \\\`instructions\\\`

    3. Tell the user that you have updated your memory, if appropriate:
    - Do not tell the user you have updated the user's profile
    - Tell the user them when you update the todo list
    - Do not tell the user that you have updated instructions

    4. Err on the side of updating the todo list. No need to ask for explicit permission.

    5. Respond naturally to user user after a tool call was made to save memories, or if no tool call was made.`
}

async function taskMAIstro(
  state: typeof MessagesAnnotation.State,
  config: LangGraphRunnableConfig,
): Promise<typeof MessagesAnnotation.State> {
  const store = getStore(config)

  // Retrieve user profile from memory
  const profileMemory = await store.get(
    ['profile'],
    config.configurable?.userId,
  )
  const profile = profileMemory ? profileMemory.value : ''

  // Retrieve todo from memory
  const todoMemory = await store.search(['todo', config.configurable?.userId])
  const todo = todoMemory
    .map((d) => `task: ${d.value.task} (key: ${d.key})`)
    .join('\n')

  // Retrieve instructions from memory
  const instructionsMemory = await store.search([
    'instructions',
    config.configurable?.userId,
  ])
  const instructions = instructionsMemory[0]
    ? instructionsMemory[0].value.data
    : ''

  // Generate system message
  const systemMessage = generateSystemPrompt(
    JSON.stringify(profile),
    todo,
    instructions,
  )

  // Generate response
  const response = await llm
    .bindTools([updateMemoryTool])
    .invoke([new SystemMessage({ content: systemMessage }), ...state.messages])

  // Return response
  return { messages: [response] }
}

async function updateProfile(
  state: typeof MessagesAnnotation.State,
  config: LangGraphRunnableConfig,
): Promise<typeof MessagesAnnotation.State> {
  const store = getStore(config)

  // Ensure the the message is a tool call
  const message = state.messages[state.messages.length - 1]
  if (
    !(
      message instanceof AIMessage &&
      message.tool_calls &&
      message.tool_calls.length > 0
    )
  ) {
    throw new Error('Last message is not a tool message')
  }

  // Create the tool message to add the to chat
  const toolMessage = new ToolMessage({
    content: 'updateProfile',
    tool_call_id: message.tool_calls[0]!.id!,
  })

  const profileMemory = await store.get(
    ['profile'],
    config.configurable?.userId,
  )
  const profile = profileMemory ? profileMemory.value : ''
  const result = await llm.withStructuredOutput(ProfileSchema).invoke([
    ...state.messages,
    toolMessage,
    new SystemMessage({
      content: generateUserProfilePrompt(JSON.stringify(profile)),
    }),
  ])

  // Store the updated profile
  await store.put(['profile'], config.configurable?.userId, {
    ...result,
  })

  // Add tool message to chat
  return {
    messages: [toolMessage],
  }
}

async function updateTodo(
  state: typeof MessagesAnnotation.State,
  config: LangGraphRunnableConfig,
): Promise<typeof MessagesAnnotation.State> {
  const store = getStore(config)

  console.log(state.messages)

  // Ensure the the message is a tool call
  const message = state.messages[state.messages.length - 1]
  if (
    !(
      message instanceof AIMessage &&
      message.tool_calls &&
      message.tool_calls.length > 0
    )
  ) {
    throw new Error('Last message is not a tool message')
  }

  // Create the tool message to add the to chat
  const toolMessage = new ToolMessage({
    content: 'updateTodo',
    tool_call_id: message.tool_calls[0]!.id!,
  })

  const todoMemory = await store.search(['todo', config.configurable?.userId])
  const todoList = todoMemory
    .map((d) => `task: ${d.value.task} (key: ${d.key})`)
    .join('\n')

  console.log('ToDo List', todoList)
  const result = await llm.withStructuredOutput(ToDoSchema).invoke([
    ...state.messages,
    toolMessage,
    new SystemMessage({
      content: generateTodoPrompt(todoList),
    }),
  ])

  // Add a new todo to the list
  if (result.key === '') {
    console.log('Adding new todo', result)
    result.key = uuid()
    await store.put(['todo', config.configurable?.userId], result.key, result)
  }

  // Update an existing todo
  else if (result.key) {
    console.log('Updating existing todo', result)
    await store.put(['todo', config.configurable?.userId], result.key, result)
  }

  const todos = await store.search(['todo', config.configurable?.userId])
  console.log(todos)
  return {
    messages: [toolMessage],
  }
}

async function updateInstructions(
  state: typeof MessagesAnnotation.State,
  config: LangGraphRunnableConfig,
): Promise<typeof MessagesAnnotation.State> {
  const store = getStore(config)

  const instructionsMemory = await store.search([
    'instructions',
    config.configurable?.userId,
  ])
  console.log('-------- Update Instructions')
  console.log(instructionsMemory)
  console.log(state.messages[state.messages.length - 1]!.content)
  return { messages: state.messages }
}

function routeMessage(
  state: typeof MessagesAnnotation.State,
): typeof END | 'updateProfile' | 'updateTodo' | 'updateInstructions' {
  // Get the last message
  const message = state.messages[state.messages.length - 1]!

  if (
    message instanceof AIMessage &&
    message.tool_calls &&
    message.tool_calls.length > 0
  ) {
    const toolCall = message.tool_calls?.[0]

    if (toolCall?.args.update_type === 'user') {
      return 'updateProfile'
    } else if (toolCall?.args.update_type === 'todo') {
      return 'updateTodo'
    } else if (toolCall?.args.update_type === 'instructions') {
      return 'updateInstructions'
    } else {
      throw new Error('Invalid update type')
    }
  } else {
    return END
  }
}

// Define graph flow
const builder = new StateGraph(MessagesAnnotation)
  // Add nodes
  .addNode('taskMAIstro', taskMAIstro)
  .addNode('updateProfile', updateProfile)
  .addNode('updateTodo', updateTodo)
  .addNode('updateInstructions', updateInstructions)

  // Add edges
  .addEdge(START, 'taskMAIstro')
  .addConditionalEdges('taskMAIstro', routeMessage)
  .addEdge('updateProfile', 'taskMAIstro')
  .addEdge('updateTodo', 'taskMAIstro')
  .addEdge('updateInstructions', 'taskMAIstro')

// Compile and export Grapg object
export const taskMAIstroGraph = builder.compile({
  checkpointer: new MemorySaver(),
  store: inMemoryStore,
})
