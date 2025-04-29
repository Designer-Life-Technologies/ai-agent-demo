import { RequestHandler, Router } from 'express'
import { aiChat } from '../../../types/aiChat'
import { v4 as uuid } from 'uuid'
import { summaryChat } from '../../../ai/summary-chat/summary-chat'

const chat: RequestHandler = async (req, res): Promise<any> => {
  // Parse the request body into an AIChat object
  // Using parse will throw an error if the request body is invalid
  // This is handled by the zodError middleware
  const chat = aiChat.parse(req.body)

  // If chat does not have an id, assign one
  if (!chat.thread_id) {
    chat.thread_id = uuid()
  }

  // Invoke the summary chat function
  const result = await summaryChat(chat)
  res.json(result)
}

// Route Definition: /ai/summary-chat
const router = Router()

router.post('/', chat)

export default router
