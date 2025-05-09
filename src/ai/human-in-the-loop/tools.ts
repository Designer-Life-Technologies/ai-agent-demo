import { tool } from '@langchain/core/tools'
import { z } from 'zod'

// Define Tools
export const searchTool = tool(
  (_) => {
    console.log('--------------- searchTool')
    return "It's sunny in San Francisco, but you better look out if you're a Gemini 😈."
  },
  {
    name: 'search',
    description: 'Call to surf the web.',
    schema: z.string(),
  },
)

export const askHumanTool = tool(
  (_) => {
    console.log('--------------- askHumanTool')
    return 'The human said XYZ'
  },
  {
    name: 'askHuman',
    description: 'Ask the human for input.',
    schema: z.string(),
  },
)
