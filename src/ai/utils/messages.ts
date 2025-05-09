import { BaseMessage, MessageContentComplex } from '@langchain/core/messages'

export function extractAiMessageContent(aiResponse: BaseMessage): string {
  let generatedContent: string = ''
  if (typeof aiResponse.content === 'string') {
    generatedContent = aiResponse.content
  } else if (Array.isArray(aiResponse.content)) {
    generatedContent = aiResponse.content
      .filter(
        (part: MessageContentComplex): part is { type: 'text'; text: string } =>
          part.type === 'text' &&
          typeof (part as { text?: unknown }).text === 'string',
      )
      .map((part) => part.text)
      .join('')
    if (generatedContent === '' && aiResponse.content.length > 0) {
      console.warn(
        `LLM response content was an array but did not contain 'text' parts.`,
      )
    }
  } else {
    console.error(
      `LLM response content is of an unexpected type:`,
      typeof aiResponse.content,
      aiResponse.content,
    )
  }

  return generatedContent
}
