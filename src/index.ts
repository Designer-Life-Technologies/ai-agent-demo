import api from './api'
import { Environment } from './environment'

if (process.env.LANGSMITH_TRACING === 'true') {
  console.log('LangSmith tracing is enabled:', process.env.LANGSMITH_PROJECT)
}

// // Start API Service
api.listen(Environment.server.port, () => {
  console.info(`API Server started`)
  console.info(`  Port: ${Environment.server.port}`)
  console.info(`  Server Environment: ${Environment.server.node_env}`)
})
