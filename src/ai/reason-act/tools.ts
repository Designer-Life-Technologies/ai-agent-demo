import { tool } from '@langchain/core/tools'
import { z } from 'zod'

const ToolInputSchema = z.object({
  a: z.number(),
  b: z.number(),
})

// Tool Functions
// This is deliberately verbose to show how functions can be defined
// and then exported as tools by wrapping them with the `tool` function
function add(input: z.infer<typeof ToolInputSchema>): number {
  return input.a + input.b
}

function subtract(input: z.infer<typeof ToolInputSchema>): number {
  return input.a - input.b
}

function multiply(input: z.infer<typeof ToolInputSchema>): number {
  return input.a * input.b
}

function divide(input: z.infer<typeof ToolInputSchema>): number {
  return input.a / input.b
}

// Export Tools for binding to LLM instance
// The tool name is used to identify the tool in the response
// LLM will use the description and schema definition to
// know how to use the tools. More descriptive description
// will help the LLM understand the tool better and use it
// for the right purpose.
export const addTool = tool(add, {
  name: 'add',
  description: 'Add two numbers',
  schema: ToolInputSchema,
})

export const subtractTool = tool(subtract, {
  name: 'subtract',
  description: 'Subtract two numbers',
  schema: ToolInputSchema,
})

export const multiplyTool = tool(multiply, {
  name: 'multiply',
  description: 'Multiply two numbers',
  schema: ToolInputSchema,
})

export const divideTool = tool(divide, {
  name: 'divide',
  description: 'Divide two numbers',
  schema: ToolInputSchema,
})
