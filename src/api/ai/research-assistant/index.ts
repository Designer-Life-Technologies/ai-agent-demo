import { RequestHandler, Router } from 'express'
import { aiChat } from '../../../types/aiChat'
import { v4 as uuid } from 'uuid'
import {
  hitlResume,
  researchAssistant,
} from '../../../ai/research-assistant/research-assistant'

const start: RequestHandler = async (req, res): Promise<any> => {
  // Parse the request body into an AIChat object
  // Using parse will throw an error if the request body is invalid
  // This is handled by the zodError middleware
  const chat = aiChat.parse(req.body)

  // If chat does not have an id, assign one
  if (!chat.thread_id) {
    chat.thread_id = uuid()
  }

  // Invoke the simple chat function
  const result = await researchAssistant(chat)
  res.json(result)
}

const hitlAnalystFeedback: RequestHandler = async (req, res): Promise<any> => {
  // Parse the request body into an AIChat object
  // Using parse will throw an error if the request body is invalid
  // This is handled by the zodError middleware
  const chat = aiChat.parse(req.body)

  // Thread id is required to be able to resume the thread
  if (!chat.thread_id) {
    return res.status(400).send('Invalid thread id')
  }

  // Invoke the simple chat function
  const result = await hitlResume(chat)
  res.json(result)
}

// Route Definition: /ai/research-assistant
const router = Router()

router.post('/', start)
router.post('/hitl/analyst-feedback', hitlAnalystFeedback)

export default router
