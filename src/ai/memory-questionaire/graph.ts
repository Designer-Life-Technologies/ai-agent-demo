import {
  END,
  interrupt,
  LangGraphRunnableConfig,
  MemorySaver,
  START,
  StateGraph,
} from '@langchain/langgraph'
import { OutputState, OverallState } from './state'
import { ChatAnthropic } from '@langchain/anthropic'
import { UserQueries } from '../../db'
import { validate as uuidValidate } from 'uuid'
import { getQuestionaireSchema, flattenToInfoPack } from './questionaire'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { nextQuestionPrompt, populateUserDataPrompt } from './prompt'
import { InfoPack } from './types'
import z from 'zod'

// Create LLM Instance
// const llm = new ChatOpenAI({
//   model: 'gpt-4o-mini',
//   temperature: 0,
// })
// const llm = new ChatXAI({
//   model: 'grok-beta',
//   temperature: 0,
// })
const llm = new ChatAnthropic({
  model: 'claude-3-5-sonnet-20240620',
  temperature: 0,
})

/**
 * Load user data and questionaire schema, then calls the LLM to
 * populate the questionaire with know data
 *
 * @param _state
 * @param config
 * @returns
 */
async function loadQuestionaire(
  state: typeof OverallState.State,
  _config: LangGraphRunnableConfig,
): Promise<Partial<typeof OverallState.State>> {
  const userId = state.userId
  if (!userId || !uuidValidate(String(userId))) {
    console.warn('Skipping user load: invalid or missing userId', userId)
  }
  const userQueries = new UserQueries()
  const userData = await userQueries.getUserFullProfile(String(userId))

  const questionaireSchema = getQuestionaireSchema(state.scenario)

  // Populate questionaire with known data
  const response = await llm.withStructuredOutput(questionaireSchema).invoke([
    new SystemMessage({
      content: populateUserDataPrompt(userData!, state.scenario),
    }),
    new HumanMessage({
      content: 'Generate the questionaire.',
    }),
  ])

  // Convert response to InfoPack
  const infoPack: InfoPack = {
    ...flattenToInfoPack(response),
    scenario: String(state.scenario ?? ''),
  }

  console.log('Loaded Questionaire and User Data.', infoPack)
  return { infoPack }
}

// Compute and persist which field is currently missing
async function findMissingField(
  state: typeof OverallState.State,
): Promise<Partial<typeof OverallState.State>> {
  for (const [key, value] of Object.entries(state.infoPack)) {
    if (value === '<UNKNOWN>') {
      console.log('More info required:', key)
      return { missingField: key }
    }
  }
  return { missingField: null }
}

// Route based on presence of missing field
function routeByMissingField(
  state: typeof OverallState.State,
): 'createQuestion' | 'finaliseInfoPack' {
  return state.missingField ? 'createQuestion' : 'finaliseInfoPack'
}

async function createQuestion(
  state: typeof OverallState.State,
): Promise<Partial<typeof OverallState.State>> {
  const nextQuestionSchema = z.object({
    question: z
      .string()
      .describe('The question that will be asked to the user.'),
    field: z
      .string()
      .describe('The field that the question will be asked about.'),
  })

  const result = await llm.withStructuredOutput(nextQuestionSchema).invoke([
    new SystemMessage({
      content: nextQuestionPrompt(state.infoPack, state.missingField!),
    }),
    new HumanMessage({
      content: 'Create the next question.',
    }),
  ])

  const field = state.missingField ?? result.field

  // Append qAndA
  return { qAndA: [{ field, question: result.question }] }
}

function askQuestion(
  state: typeof OverallState.State,
): Partial<typeof OverallState.State> {
  console.log('Ask the user: ', state.qAndA[state.qAndA.length - 1]!.question)

  const answer: string = interrupt(
    state.qAndA[state.qAndA.length - 1]!.question,
  )

  console.log('askQuestion Resume: ', answer)

  // Set the field value
  state.infoPack[state.qAndA[state.qAndA.length - 1]!.field] = 'TEST1234'

  return {
    messages: [
      new HumanMessage({
        content: state.qAndA[state.qAndA.length - 1]!.question,
      }),
    ],
  }
}

async function finaliseInfoPack(
  state: typeof OverallState.State,
): Promise<Partial<typeof OverallState.State>> {
  console.log('Finalising Info Pack:', state.infoPack)

  // const response = await llm.invoke(state.messages)
  // Append the messages to the state
  // This is a shortcut provided by the MessagesAnnotation
  return { messages: [] }
}

const builder = new StateGraph(OverallState, OutputState)
  .addNode('loadQuestionaire', loadQuestionaire)
  .addNode('findMissingField', findMissingField)
  .addNode('createQuestion', createQuestion)
  .addNode('askQuestion', askQuestion)
  .addNode('finaliseInfoPack', finaliseInfoPack)

  .addEdge(START, 'loadQuestionaire')
  .addEdge('loadQuestionaire', 'findMissingField')
  .addConditionalEdges('findMissingField', routeByMissingField, [
    'createQuestion',
    'finaliseInfoPack',
  ])
  .addEdge('createQuestion', 'askQuestion')
  .addEdge('askQuestion', 'findMissingField')

  .addEdge('finaliseInfoPack', END)

// Add Memory Persistence
const memory = new MemorySaver()

// Compile and export Grapg object
export const graph = builder.compile({ checkpointer: memory })
