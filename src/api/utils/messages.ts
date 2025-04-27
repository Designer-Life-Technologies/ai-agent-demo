import { AIMessage, BaseMessage } from '@langchain/core/messages'
import { AIChatMessageType, type AIChatMessage } from '../../types/aiChat'

export function lagnchainMessageToAIChatMessage(
  message: BaseMessage,
): AIChatMessage {
  const outMessage: AIChatMessage = {
    id: message.id,
    type: message.getType() as AIChatMessageType,
    tool_name: message.name, // will be present if this was a ToolMessage
    content: message.content ? (message.content as string) : null,
    time: new Date().toISOString(),
  }

  // Add tool calls if present
  if (message instanceof AIMessage && message.tool_calls) {
    outMessage.tool_calls = message.tool_calls.map((tool_call) => ({
      name: tool_call.name,
      arguments: tool_call.args,
    }))
  }

  // Add response metadata if present
  if (
    message.response_metadata &&
    message.response_metadata.model_name &&
    message.response_metadata.tokenUsage
  ) {
    outMessage.response_metadata = {
      model_name: message.response_metadata.model_name,
      token_usage: message.response_metadata.tokenUsage,
    }
  }
  return outMessage
}
