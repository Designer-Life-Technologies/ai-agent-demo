import { Milvus } from '@langchain/community/vectorstores/milvus'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { OpenAIEmbeddings } from '@langchain/openai'
import { pull } from 'langchain/hub'
import { Document } from 'langchain/document'
// import { ChatXAI } from '@langchain/xai'
// import { ChatAnthropic } from '@langchain/anthropic'

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

// Connect to vector store
const embeddings = new OpenAIEmbeddings({
  model: 'text-embedding-3-large',
})

const vectorStore = new Milvus(embeddings, {
  collectionName: 'candidates',
  url: 'http://localhost:19530',
})
vectorStore.client.useDatabase({ db_name: 'network_cape_town' })

const StateAnnotation = Annotation.Root({
  question: Annotation<string>,
  context: Annotation<Document[]>,
  answer: Annotation<string>,
})

// Define application steps
const retrieve = async (state: typeof StateAnnotation.State) => {
  const retrievedDocs = await vectorStore.similaritySearch(
    state.question,
    5,
    "candidateId == 'Candidate 2'",
  )
  return { context: retrievedDocs }
}

const generate = async (state: typeof StateAnnotation.State) => {
  // Define prompt for question-answering
  const promptTemplate = await pull<ChatPromptTemplate>('rlm/rag-prompt')

  const docsContent = state.context.map((doc) => doc.pageContent).join('\n')
  const messages = await promptTemplate.invoke({
    question: state.question,
    context: docsContent,
  })
  const response = await llm.invoke(messages)
  return { answer: response.content }
}

// Compile application and test
export const graph = new StateGraph(StateAnnotation)
  .addNode('retrieve', retrieve)
  .addNode('generate', generate)
  .addEdge(START, 'retrieve')
  .addEdge('retrieve', 'generate')
  .addEdge('generate', END)
  .compile()
