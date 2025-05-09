// Highest Level Graph
import {
  Annotation,
  END,
  MemorySaver,
  Send,
  START,
  StateGraph,
} from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
// import { ChatXAI } from '@langchain/xai'
import { Analyst, createAnalystsGraph } from './create-analysts'
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages'
// import { ChatAnthropic } from '@langchain/anthropic'
import { extractAiMessageContent } from '../utils/messages'
import { interviewGraph } from './interview'

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

const ResearchAssistantState = Annotation.Root({
  // Input Channels
  // Shared with GenerateAnalystState
  topic: Annotation<string>,
  max_analysts: Annotation<number>,
  analysts: Annotation<Analyst[]>, // GenerateAnalystState

  // Output Channels
  report: Annotation<string>,

  // Internal Channels
  // Shared with InterviewState
  sections: Annotation<string[]>({
    reducer: (state, action) => {
      return state.concat(action)
    },
    default: () => [],
  }),

  content: Annotation<string>,
  introduction: Annotation<string>,
  conclusion: Annotation<string>,
})

function runAllAnalystInterviews(
  state: typeof ResearchAssistantState.State,
): Send[] {
  console.log('researchAssistantGraph: runAllAnalystInterviews:')
  console.dir(state, { depth: null })
  return state.analysts.map((analyst) => new Send('interview', { analyst }))
}

function getReportWriterInstructions(topic: string, context: string): string {
  return `You are a technical writer creating a report on this overall topic: 

    ${topic}
        
    You have a team of analysts. Each analyst has done two things: 

    1. They conducted an interview with an expert on a specific sub-topic.
    2. They write up their finding into a memo.

    Your task: 

    1. You will be given a collection of memos from your analysts.
    2. Think carefully about the insights from each memo.
    3. Consolidate these into a crisp overall summary that ties together the central ideas from all of the memos. 
    4. Summarize the central points in each memo into a cohesive single narrative.

    To format your report:
    
    1. Use markdown formatting. 
    2. Include no pre-amble for the report.
    3. Use no sub-heading. 
    4. Start your report with a single title header: ## Insights
    5. Do not mention any analyst names in your report.
    6. Preserve any citations in the memos, which will be annotated in brackets, for example [1] or [2].
    7. Create a final, consolidated list of sources and add to a Sources section with the \`## Sources\` header.
    8. List your sources in order and do not repeat.

    [1] Source 1
    [2] Source 2

    Here are the memos from your analysts to build your report from: 

    ${context}`
}

/**
 *
 * Writes To:
 *  content
 *
 * @param state
 * @returns
 */
async function writeReport(
  state: typeof ResearchAssistantState.State,
): Promise<{ content: string }> {
  const { topic, sections } = state

  // Concatenate all sections together
  const formattedStrSections = sections.join('\n\n')

  // Get the system message instructions
  const systemMessageContent = getReportWriterInstructions(
    topic,
    formattedStrSections,
  )

  const messages: BaseMessage[] = [
    new SystemMessage(systemMessageContent),
    new HumanMessage('Write a report based upon these memos.'),
  ]

  // Invoke the LLM to generate the report
  const reportAiMessage = await llm.invoke(messages)
  const reportContentString: string = extractAiMessageContent(reportAiMessage)

  // Return the generated report content, which will update the 'content' field in the graph state
  return { content: reportContentString }
}

function getIntroConclusionInstructions(
  topic: string,
  formattedStrSections: string,
): string {
  return `You are a technical writer finishing a report on ${topic}

    You will be given all of the sections of the report.

    You job is to write a crisp and compelling introduction or conclusion section.

    The user will instruct you whether to write the introduction or conclusion.

    Include no pre-amble for either section.

    Target around 100 words, crisply previewing (for introduction) or recapping (for conclusion) all of the sections of the report.

    Use markdown formatting. 

    For your introduction, create a compelling title and use the # header for the title.

    For your introduction, use ## Introduction as the section header. 

    For your conclusion, use ## Conclusion as the section header.

    Here are the sections to reflect on for writing: ${formattedStrSections}`
}

/**
 *
 * Writes To:
 *  introduction
 *  conclusion
 *
 * @param state
 * @returns
 */
async function writeIntroConclusion(
  state: typeof ResearchAssistantState.State,
): Promise<{ introduction?: string; conclusion?: string }> {
  const { topic, sections, introduction } = state // Destructure 'introduction' to check if it exists

  // Concatenate all sections together for context
  const formattedStrSections = sections.join('\n\n')

  // Get the base system message instructions
  const systemMessageContent = getIntroConclusionInstructions(
    topic,
    formattedStrSections,
  )

  let partToGenerate: 'introduction' | 'conclusion'
  let userPrompt: string

  // Decide whether to write an introduction or conclusion
  if (!introduction) {
    // If introduction doesn't exist yet, generate it
    partToGenerate = 'introduction'
    userPrompt = 'Write the introduction section of this report.'
  } else {
    // Otherwise, generate the conclusion
    partToGenerate = 'conclusion'
    userPrompt = 'Write the conclusion section of this report.'
  }

  const messages: BaseMessage[] = [
    new SystemMessage(systemMessageContent),
    new HumanMessage(userPrompt),
  ]

  // Invoke the LLM
  const aiResponse = await llm.invoke(messages)
  const generatedContent: string = extractAiMessageContent(aiResponse)

  // Return an object to update either the 'introduction' or 'conclusion' field in the graph state
  if (partToGenerate === 'introduction') {
    return { introduction: generatedContent }
  } else {
    return { conclusion: generatedContent }
  }
}

function assembleReport(state: typeof ResearchAssistantState.State): {
  report: string
} {
  // Extract out of report
  const introduction = state.introduction ?? ''
  let content = state.content ?? '' // Use 'let' as it will be modified
  const conclusion = state.conclusion ?? ''

  // Process content:
  if (content.startsWith('## Insights')) {
    content = content.substring('## Insights'.length).trimStart()
  }

  let sources: string | null = null
  const sourcesMarker = '\n## Sources\n'
  const sourcesIndex = content.indexOf(sourcesMarker)

  if (sourcesIndex !== -1) {
    sources = content.substring(sourcesIndex + sourcesMarker.length)
    content = content.substring(0, sourcesIndex)
  }

  // Assemble the final report
  let finalReport = `${introduction}\n\n---\n\n${content.trim()}\n\n---\n\n${conclusion}`

  // Add sources if they exist
  if (sources !== null) {
    finalReport += `\n\n## Sources\n${sources.trim()}`
  }

  return { report: finalReport.trim() }
}

// Define the graph
const builder = new StateGraph(ResearchAssistantState.spec)
  // Sub-graphs
  .addNode('createAnalysts', createAnalystsGraph)
  .addNode('interview', interviewGraph)

  // Post interview processing
  .addNode('writeReport', writeReport)
  .addNode('writeIntroConclusion', writeIntroConclusion)
  .addNode('assembleReport', assembleReport)

  // Workflow Edges
  .addEdge(START, 'createAnalysts') // Create set of analysts and get human feedback

  .addConditionalEdges('createAnalysts', runAllAnalystInterviews, {
    interview: 'interview',
  }) // Run interviews - one for each analyst
  .addEdge('interview', 'writeReport')
  .addEdge('interview', 'writeIntroConclusion')
  .addEdge(['writeReport', 'writeIntroConclusion'], 'assembleReport')
  .addEdge('assembleReport', END)

const memory = new MemorySaver()
export const researchAssistantGraph = builder.compile({
  name: 'Research Assistant: Research Assistant Graph',
  checkpointer: memory,
})
