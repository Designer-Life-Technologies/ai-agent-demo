import {
  Annotation,
  END,
  MemorySaver,
  //   MessagesAnnotation,
  START,
  StateGraph,
} from '@langchain/langgraph'
import { TavilySearch } from '@langchain/tavily'
import { WikipediaQueryRun } from '@langchain/community/tools/wikipedia_query_run'
import { ChatXAI } from '@langchain/xai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

// Define Custom State
// Customise the state by adding a `summary` attribute (in addition to `messages` key,
// which MessagesAnnotation already has)
const GraphAnnotation = Annotation.Root({
  //   ...MessagesAnnotation.spec, // inherit messages key

  // add additional keys/channels to the state
  question: Annotation<string>({
    reducer: (_, b) => b,
    default: () => '',
  }),

  answer: Annotation<string>({
    reducer: (_, b) => b,
    default: () => '',
  }),

  context: Annotation<string[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
})

async function searchWeb(
  state: typeof GraphAnnotation.State,
): Promise<Partial<typeof GraphAnnotation.State>> {
  const tool = new TavilySearch({
    maxResults: 5,
  })

  const results = await tool.invoke({ query: state.question })

  // Format results into a string for the LLM
  const documents = results.results
    .map(
      (result: any) =>
        `<Document href="${result.url}">\n${result.content}\n</Document>`,
    )
    .join('\n\n---\n\n')

  return { context: [documents] }
}

async function searchWikipedia(
  state: typeof GraphAnnotation.State,
): Promise<Partial<typeof GraphAnnotation.State>> {
  const tool = new WikipediaQueryRun({
    topKResults: 3,
    maxDocContentLength: 4000,
  })
  const results = await tool.invoke(state.question)
  const documents = `<Document source="wikipedia">\n${results}\n</Document>`
  return { context: [documents] }
}

async function generateAnswer(
  state: typeof GraphAnnotation.State,
): Promise<Partial<typeof GraphAnnotation.State>> {
  const llm = new ChatXAI({
    model: 'grok-beta',
    temperature: 0,
  })

  const messages = [
    new SystemMessage({
      content:
        'You are an assistant for question-answering tasks. ' +
        'Use the following pieces of retrieved context to answer ' +
        'the question. If required you can search the web for factual information.' +
        "If you don't know the answer, say that you don't know. '" +
        '\n\n' +
        `${state.context}`,
    }),
    new HumanMessage({
      content: state.question,
    }),
  ]

  const response = await llm.invoke(messages)

  return { answer: response.content as string }
}

// Define graph FLOW
const builder = new StateGraph(GraphAnnotation)
  // Define the conversation node and the summarize node
  .addNode('search_web', searchWeb)
  .addNode('search_wikipedia', searchWikipedia)
  .addNode('generate_answer', generateAnswer)

  // Set the entrypoint as conversation
  .addEdge(START, 'search_web')
  .addEdge(START, 'search_wikipedia')
  .addEdge('search_web', 'generate_answer')
  .addEdge('search_wikipedia', 'generate_answer')
  .addEdge('generate_answer', END)

// Compile and export Graph object
// Add Memory Persistence
const memory = new MemorySaver()
export const graph = builder.compile({ checkpointer: memory })
