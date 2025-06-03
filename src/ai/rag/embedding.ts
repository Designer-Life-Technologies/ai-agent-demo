import { OpenAIEmbeddings } from '@langchain/openai'
// import { Chroma } from '@langchain/community/vectorstores/chroma'
import { Milvus } from '@langchain/community/vectorstores/milvus'
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
const embeddings = new OpenAIEmbeddings({
  model: 'text-embedding-3-large',
})

// const vectorStore = new Chroma(embeddings, {
//   collectionName: 'test',
// })

const vectorStore = new Milvus(embeddings, {
  collectionName: 'candidates',
  url: 'http://localhost:19530',
})
vectorStore.client.useDatabase({ db_name: 'network_cape_town' })

// Load and chunk contents of blog
const pTagSelector = 'p'
const cheerioLoader = new CheerioWebBaseLoader(
  'https://lilianweng.github.io/posts/2023-06-23-agent/',
  {
    selector: pTagSelector,
  },
)

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
})

async function run() {
  // Get the doc
  const docs = await cheerioLoader.load()
  docs[0]!.metadata['candidateId'] = 'Candidate 2'
  docs[0]!.metadata['companyId'] = 'Company 1'
  docs[0]!.metadata['branchId'] = 'Branch 1'

  console.log(docs)

  // Split into chuncks
  const allSplits = await splitter.splitDocuments(docs)

  // Index chunks into vector store
  await vectorStore.addDocuments(allSplits)
}

run()
