/**
 * Interview Graph
 *
 * This graph conducts an interview with an analyst and returns the sections of the interview.
 *
 * Input Channels
 *  analyst: The analyst to interview.
 *  max_num_turns: Maximum number of turns to interview. (default: 2)
 *
 * Output Channels
 *  sections: The sections of the interview.
 */
import {
  Annotation,
  END,
  MemorySaver,
  MessagesAnnotation,
  START,
  StateGraph,
} from '@langchain/langgraph'
import { Analyst, getAnalystPersona } from './create-analysts'
import z from 'zod'
import { ChatOpenAI } from '@langchain/openai'
// import { ChatXAI } from '@langchain/xai'
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages'
import { TavilySearch } from '@langchain/tavily'
import { WikipediaQueryRun } from '@langchain/community/tools/wikipedia_query_run'
// import { ChatAnthropic } from '@langchain/anthropic'

//Create LLM Instance
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

const InterviewState = Annotation.Root({
  // Messages Channel
  ...MessagesAnnotation.spec,

  // Output channels
  sections: Annotation<string[]>,

  // Input channels
  analyst: Annotation<Analyst>,
  max_num_turns: Annotation<number>({
    value: (_, action) => action,
    default: () => 2, // defaults to 2
  }),

  // Internal Channels
  context: Annotation<string[]>({
    reducer: (state, action) => {
      return state.concat(action)
    },
    default: () => [],
  }),
  interview: Annotation<string>,
})

function getQuestionInstructions(analyst: string): string {
  return `You are an analyst tasked with interviewing an expert to learn about a specific topic. 
    Your goal is boil down to interesting and specific insights related to your topic.
    1. Interesting: Insights that people will find surprising or non-obvious.
    2. Specific: Insights that avoid generalities and include specific examples from the expert.
    The expert you are interviewing is: ${analyst}
    Begin by introducing yourself using a name that fits your persona, and then ask your question.
    Continue to ask questions to drill down and refine your understanding of the topic.
    When you are satisfied with your understanding, complete the interview with: "Thank you so much for your help!"
    Remember to stay in character throughout your response, reflecting the persona and goals provided to you.`
}

async function generateQuestion(
  state: typeof InterviewState.State,
): Promise<{ messages: AIMessage[] }> {
  console.log('interviewGraph: generateQuestion:')
  console.dir(state, { depth: null })

  const systemMessage = getQuestionInstructions(
    getAnalystPersona(state.analyst),
  )
  const question = await llm.invoke([
    new SystemMessage(systemMessage),
    ...state.messages,
  ])

  return { messages: [question] }
}

// Search instructions
function getSearchInstructions(): string {
  return `You will be given a conversation between an analyst and an expert. 
    Your goal is to generate a well-structured query for use in retrieval and / or web-search related to the conversation.
    First, analyze the full conversation.
    Pay particular attention to the final question posed by the analyst.
    Convert this final question into a well-structured web search query.`
}

const searchQuerySchema = z.object({
  query: z.string().describe('The search query.'),
})

async function searchWeb(
  state: typeof InterviewState.State,
): Promise<Partial<typeof InterviewState.State>> {
  const structuredLlm = llm.withStructuredOutput(searchQuerySchema)
  const searchQuery = await structuredLlm.invoke([
    new SystemMessage(getSearchInstructions()),
    ...state.messages,
  ])

  const tool = new TavilySearch({
    maxResults: 5,
  })

  const results = await tool.invoke({ query: searchQuery.query })

  // Format results into a string for the LLM
  const documents = results.results
    .map(
      (result: any) =>
        `<Document href="${result.url}"/>\n${result.content}\n</Document>`,
    )
    .join('\n\n---\n\n')

  return { context: [documents] }
}

async function searchWikipedia(
  state: typeof InterviewState.State,
): Promise<Partial<typeof InterviewState.State>> {
  const structuredLlm = llm.withStructuredOutput(searchQuerySchema)
  const searchQuery = await structuredLlm.invoke([
    new SystemMessage(getSearchInstructions()),
    ...state.messages,
  ])

  const tool = new WikipediaQueryRun({
    topKResults: 3,
    maxDocContentLength: 4000,
  })
  const results = await tool.invoke({ query: searchQuery.query })
  // f'<Document source="{doc.metadata["source"]}" page="{doc.metadata.get("page", "")}"/>\n{doc.page_content}\n</Document>'
  // const documents = `<Document source="${results.metadata["source"]}" page="${results.metadata.get("page", "")}"/>\n${results.page_content}\n</Document>`
  const documents = `<Document source="wikipedia"/>\n${results}\n</Document>`
  return { context: [documents] }
}

/**
 * Generates instructions for the expert being interviewed
 * @param analyst - The analyst's area of focus
 * @param context - The context information to use when answering
 * @returns Formatted instructions string
 */
function getAnswerInstructions(analyst: string, context: string): string {
  return `You are an expert being interviewed by an analyst.
    Here is analyst area of focus: ${analyst}. 
    You goal is to answer a question posed by the interviewer.
    To answer question, use this context:
    ${context}
    When answering questions, follow these guidelines:
    1. Use only the information provided in the context. 
    2. Do not introduce external information or make assumptions beyond what is explicitly stated in the context.
    3. The context contain sources at the topic of each individual document.
    4. Include these sources your answer next to any relevant statements. For example, for source # 1 use [1]. 
    5. List your sources in order at the bottom of your answer. [1] Source 1, [2] Source 2, etc
    6. If the source is: <Document source="assistant/docs/llama3_1.pdf" page="7"/>' then just list: 
    [1] assistant/docs/llama3_1.pdf, page 7 
    And skip the addition of the brackets as well as the Document source preamble in your citation.`
}

async function generateAnswer(
  state: typeof InterviewState.State,
): Promise<{ messages: AIMessage[] }> {
  const systemMessage = getAnswerInstructions(
    getAnalystPersona(state.analyst),
    state.context.join('\n'),
  )
  const answer = await llm.invoke([
    new SystemMessage(systemMessage),
    ...state.messages,
  ])

  answer.name = 'expert'
  return { messages: [answer] }
}

async function saveInterview(
  state: typeof InterviewState.State,
): Promise<Partial<typeof InterviewState.State>> {
  const interview = state.messages.join('\n')
  return { interview }
}

function routeMessages(
  state: typeof InterviewState.State,
): 'saveInterview' | 'generateQuestion' {
  // Get messages
  const messages = state.messages
  const maxNumTurns = state.max_num_turns || 2

  // Check the number of expert answers
  const numResponses = messages.filter(
    (m: any) => m instanceof AIMessage && (m as AIMessage).name === 'expert',
  ).length

  // End if expert has answered more than the max turns
  if (numResponses >= maxNumTurns) {
    return 'saveInterview'
  }

  // This router is run after each question - answer pair
  // Get the last question asked to check if it signals the end of discussion
  const lastQuestion =
    messages.length >= 2 ? messages[messages.length - 2] : null

  if (
    lastQuestion &&
    typeof lastQuestion.content === 'string' &&
    lastQuestion.content.includes('Thank you so much for your help')
  ) {
    return 'saveInterview'
  }

  return 'generateQuestion'
}

/**
 * Returns instructions for the section writer to create a report section
 * @param focus - The focus area of the analyst to include in the instructions
 * @returns Formatted instructions string for the section writer
 */
function getSectionWriterInstructions(focus: string): string {
  return `You are an expert technical writer. 
            
    Your task is to create a short, easily digestible section of a report based on a set of source documents.

    1. Analyze the content of the source documents: 
    - The name of each source document is at the start of the document, with the <Document tag.
            
    2. Create a report structure using markdown formatting:
    - Use ## for the section title
    - Use ### for sub-section headers
            
    3. Write the report following this structure:
    a. Title (## header)
    b. Summary (### header)
    c. Sources (### header)

    4. Make your title engaging based upon the focus area of the analyst: 
    ${focus}

    5. For the summary section:
    - Set up summary with general background / context related to the focus area of the analyst
    - Emphasize what is novel, interesting, or surprising about insights gathered from the interview
    - Create a numbered list of source documents, as you use them
    - Do not mention the names of interviewers or experts
    - Aim for approximately 400 words maximum
    - Use numbered sources in your report (e.g., [1], [2]) based on information from source documents
            
    6. In the Sources section:
    - Include all sources used in your report
    - Provide full links to relevant websites or specific document paths
    - Separate each source by a newline. Use two spaces at the end of each line to create a newline in Markdown.
    - It will look like:

    ### Sources
    [1] Link or Document name
    [2] Link or Document name

    7. Be sure to combine sources. For example this is not correct:

    [3] https://ai.meta.com/blog/meta-llama-3-1/
    [4] https://ai.meta.com/blog/meta-llama-3-1/

    There should be no redundant sources. It should simply be:

    [3] https://ai.meta.com/blog/meta-llama-3-1/
            
    8. Final review:
    - Ensure the report follows the required structure
    - Include no preamble before the title of the report
    - Check that all guidelines have been followed`
}

/**
 * Node to write a section of the report
 * @param state - The current interview state
 * @returns Partial state with the generated section
 */
async function writeSection(
  state: typeof InterviewState.State,
): Promise<Partial<typeof InterviewState.State>> {
  // Get state
  // Using either the context (source docs) or interview text
  const context = state.context
  const analyst = state.analyst

  // Write section using the gathered source docs from context
  const systemMessage = getSectionWriterInstructions(analyst.description)
  const section = await llm.invoke([
    new SystemMessage(systemMessage),
    new HumanMessage(
      `Use this source to write your section: ${context.join('\n')}`,
    ),
  ])

  // Append it to state with proper type handling
  return {
    sections: [
      typeof section.content === 'string'
        ? section.content
        : JSON.stringify(section.content),
    ],
  }
}

// Build the graph
const builder = new StateGraph(InterviewState)
  .addNode('generateQuestion', generateQuestion)
  .addNode('generateAnswer', generateAnswer)
  .addNode('saveInterview', saveInterview)
  .addNode('writeSection', writeSection)
  .addNode('searchWeb', searchWeb)
  .addNode('searchWikipedia', searchWikipedia)

// Define conditional edges using the routeMessages function
builder.addEdge(START, 'generateQuestion')

builder.addEdge('generateQuestion', 'searchWeb')
builder.addEdge('generateQuestion', 'searchWikipedia')

builder.addEdge('searchWeb', 'generateAnswer')
builder.addEdge('searchWikipedia', 'generateAnswer')

// Generate another question or save interview
builder.addConditionalEdges('generateAnswer', routeMessages, {
  generateQuestion: 'generateQuestion',
  saveInterview: 'saveInterview',
})

builder.addEdge('saveInterview', 'writeSection')
builder.addEdge('writeSection', END)

const memory = new MemorySaver()
export const interviewGraph = builder.compile({
  name: 'Research Assistant: Interview Graph',
  checkpointer: memory,
})
