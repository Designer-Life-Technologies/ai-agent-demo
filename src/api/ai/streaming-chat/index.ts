import { RequestHandler, Router } from 'express'
import {
  streamingChat,
  streamingChatEvents,
} from '../../../ai/streaming-chat/streaming-chat'
import { aiChat } from '../../../types/aiChat'
import { v4 as uuid } from 'uuid'
import { setStreamingHeaders } from '../../utils/messages'

const chat: RequestHandler = async (req, res): Promise<any> => {
  // Parse the request body into an AIChat object
  // Using parse will throw an error if the request body is invalid
  // This is handled by the zodError middleware
  const chat = aiChat.parse(req.body)

  // If chat does not have an id, assign one
  if (!chat.thread_id) {
    chat.thread_id = uuid()
  }

  // Invoke the simple chat function
  setStreamingHeaders(res)

  const resultStream = await streamingChat(chat)
  for await (const chunk of resultStream) {
    // Send as NDJSON
    res.write(`${JSON.stringify({ content: chunk })}\n`)
  }
  res.end()
}

const chatEvents: RequestHandler = async (req, res): Promise<any> => {
  // Parse the request body into an AIChat object
  // Using parse will throw an error if the request body is invalid
  // This is handled by the zodError middleware
  const chat = aiChat.parse(req.body)

  // If chat does not have an id, assign one
  if (!chat.thread_id) {
    chat.thread_id = uuid()
  }

  await streamingChatEvents(chat)

  res.json({})
}

// Route Definition: /ai/streaming-chat
const router = Router()

router.post('/', chat)
router.post('/events', chatEvents)

export default router
