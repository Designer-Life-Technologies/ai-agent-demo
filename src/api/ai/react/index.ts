import { RequestHandler, Router } from 'express'
import { reAct, streamingReAct } from '../../../ai/reason-act/re-act'
import { aiChat } from '../../../types/aiChat'
import { v4 as uuid } from 'uuid'

const chat: RequestHandler = async (req, res): Promise<void> => {
  // Parse the request body into an AIChat object
  // Using parse will throw an error if the request body is invalid
  // This is handled by the zodError middleware
  const chat = aiChat.parse(req.body)

  // If chat does not have an id, assign one
  if (!chat.thread_id) {
    chat.thread_id = uuid()
  }

  // Invoke the simple chat function
  const result = await reAct(chat)
  res.json(result)
}

const streamingChat: RequestHandler = async (req, res): Promise<any> => {
  // Parse the request body into an AIChat object
  // Using parse will throw an error if the request body is invalid
  // This is handled by the zodError middleware
  const chat = aiChat.parse(req.body)

  // If chat does not have an id, assign one
  if (!chat.thread_id) {
    chat.thread_id = uuid()
  }

  await streamingReAct(chat)
  res.json({})
}

// Route Definition: /ai/re-act
const router = Router()

router.post('/', chat)
router.post('/stream', streamingChat)

export default router
