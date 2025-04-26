import { RequestHandler, Router } from 'express'
import { simpleChat } from '../../../ai/simple-chat/simple-chat'
import { aiChat } from '../../../types/aiChat'
import { v4 as uuid } from 'uuid'

const chat: RequestHandler = async (req, res): Promise<any> => {
  // Parse the request body into an AIChat object
  // Using parse will throw an error if the request body is invalid
  // This is handled by the zodError middleware
  const chat = aiChat.parse(req.body)

  // If chat does not have an id, assign one
  if (!chat.id) {
    chat.id = uuid()
  }

  // Invoke the simple chat function
  const result = await simpleChat(chat)

  // Add response to chat object
  chat.messages[0] = {
    request: chat.messages[0]!.request,
    response: result as string,
    time: new Date().toISOString(),
  }
  res.json(chat)
}

// Route Definition: /ai/simple-chat
const router = Router()

router.post('/', chat)

export default router
