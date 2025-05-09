/**
 * Create Analysts Graph
 *
 * This graph creates a set of analysts for a given topic.
 *
 * It uses a human-in-the-loop to request feedback on the generated analysts.
 * If feedback is provided, the analysts will be re-generated with the given feedback.
 *
 * Input Channels:
 *  topic: The topic to create analysts for.
 *  max_analysts: Maximum number of analysts to create. (default: 5)
 *
 * Output Channels:
 *  analysts: The generated analysts.
 */
import { z } from 'zod'
import { ChatOpenAI } from '@langchain/openai'
// import { ChatXAI } from '@langchain/xai'
// import { ChatAnthropic } from '@langchain/anthropic'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import {
  Annotation,
  END,
  interrupt,
  MemorySaver,
  START,
  StateGraph,
} from '@langchain/langgraph'

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

// Analyst schema and type
export const AnalystSchema = z.object({
  affiliation: z.string().describe('Primary affiliation of the analyst.'),
  name: z.string().describe('Name of the analyst.'),
  role: z.string().describe('Role of the analyst in the context of the topic.'),
  description: z
    .string()
    .describe('Description of the analyst focus, concerns, and motives.'),
})
export type Analyst = z.infer<typeof AnalystSchema>

// Analyst persona property (as a utility function)
export function getAnalystPersona(analyst: Analyst): string {
  return `Name: ${analyst.name}\nRole: ${analyst.role}\nAffiliation: ${analyst.affiliation}\nDescription: ${analyst.description}`
}

// GenerateAnalystsState
const GenerateAnalystsState = Annotation.Root({
  // Input Channels
  topic: Annotation<string>,
  max_analysts: Annotation<number>({
    reducer: (_, action) => {
      return action
    },
    default: () => 5, // defaults to 5 analysts
  }),

  // Output Channels
  analysts: Annotation<Analyst[]>,

  // Internal Channels
  human_analyst_feedback: Annotation<string>,
})

// createAnalysts prompt
function getAnalystInstructions(
  topic: string,
  humanAnalystFeedback: string,
  maxAnalysts: number,
): string {
  return `
    You are tasked with creating a set of AI analyst personas. Follow these instructions carefully:

    1. First, review the research topic: ${topic}

    2. Examine any editorial feedback that has been optionally provided to guide creation of the analysts: ${humanAnalystFeedback}

    3. Determine the most interesting themes based upon documents and / or feedback above.

    4. Pick the top ${maxAnalysts} themes.

    5. Assign one analyst to each theme.`
}

// Perspectives schema and type
export const PerspectivesSchema = z.object({
  analysts: z
    .array(AnalystSchema)
    .describe(
      'Comprehensive list of analysts with their roles and affiliations.',
    ),
})
export type Perspectives = z.infer<typeof PerspectivesSchema>

async function createAnalysts(
  state: typeof GenerateAnalystsState.State,
): Promise<{ analysts: Perspectives['analysts'] }> {
  // console.log('createAnalystsGraph: createAnalysts:')
  // console.dir(state, { depth: null })

  // Extract state
  const { topic, max_analysts, human_analyst_feedback = '' } = state

  // Enforce structured output
  const structuredLlm = llm.withStructuredOutput(PerspectivesSchema)

  // System message
  const systemMessage = getAnalystInstructions(
    topic,
    human_analyst_feedback,
    max_analysts,
  )

  // Generate question
  const analysts = await structuredLlm.invoke([
    new SystemMessage({ content: systemMessage }),
    new HumanMessage({ content: 'Generate the set of analysts.' }),
  ])

  // Write the list of analysts to state
  return { analysts: analysts.analysts }
}

/**
 * No-op node that should be interrupted on.
 * In a workflow, this is where you'd pause for human input.
 */
function humanFeedback(
  _state: typeof GenerateAnalystsState.State,
): Partial<typeof GenerateAnalystsState.State> {
  // console.log('createAnalystsGraph: humanFeedback:')
  // console.dir(_state, { depth: null })

  // This function is intentionally left as a no-op.
  // In your workflow engine, this node should trigger a human-in-the-loop interruption.
  const humanFeedback: string = interrupt({
    question:
      'Please provide your feedback on the set of analysts. If you are happy with the set of analysts, please provide an empty string.',
    type: 'text',
  })

  console.log(
    'createAnalystsGraph: humanFeedback: Resume with human feedback:',
    humanFeedback,
  )
  return { human_analyst_feedback: humanFeedback }
}

/**
 * Determines the next node to execute in the analyst workflow.
 * Returns 'create_analysts' if human_analyst_feedback is present, otherwise END.
 */
function shouldContinue(
  state: typeof GenerateAnalystsState.State,
): 'createAnalysts' | typeof END {
  const humanAnalystFeedback = state.human_analyst_feedback
  if (humanAnalystFeedback !== 'no_feedback') {
    return 'createAnalysts'
  }
  return END
}

const builder = new StateGraph(GenerateAnalystsState)
  .addNode('createAnalysts', createAnalysts)
  .addNode('humanFeedback', humanFeedback)

  .addEdge(START, 'createAnalysts')

  .addEdge('createAnalysts', 'humanFeedback')

  .addConditionalEdges('humanFeedback', shouldContinue, ['createAnalysts', END])

// Setup memory
const messagesMemory = new MemorySaver()

export const createAnalystsGraph = builder.compile({
  name: 'Research Assistant: Create Analysts Graph',
  checkpointer: messagesMemory,
})
