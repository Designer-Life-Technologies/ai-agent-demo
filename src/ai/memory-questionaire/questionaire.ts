import { Scenario, InfoPack } from './types'
import { z } from 'zod'

const workplaceSchema = z.object({
  name: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  type: z.string().optional(),
})

const industrySchema = z.object({
  category: z.string().optional(),
  subCategory: z.string().optional(),
})

const baseQuestionsSchema = z.object({
  workplace: workplaceSchema,
  role: z.string().optional().describe('the role of the user in the workplace'),
  industry: industrySchema,
})

const injuryQuestionsSchema = baseQuestionsSchema.extend({})

export function getQuestionaireSchema(scenario: Scenario) {
  switch (scenario) {
    case 'injury':
      return injuryQuestionsSchema
    case 'illness':
      return baseQuestionsSchema
  }
}

// Flatten a nested object into InfoPack with dot-notation keys.
// - Skips undefined/null values
// - Coerces non-string primitives to string (defensive)
export function flattenToInfoPack(
  input: unknown,
  parentKey = '',
  acc: InfoPack = {},
): InfoPack {
  if (input == null) return acc
  if (typeof input !== 'object') {
    if (parentKey) acc[parentKey] = String(input)
    return acc
  }

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const nextKey = parentKey ? `${parentKey}.${key}` : key
    if (value == null) continue
    if (typeof value === 'object' && !Array.isArray(value)) {
      flattenToInfoPack(value, nextKey, acc)
    } else if (Array.isArray(value)) {
      if (value.every((v) => v == null || typeof v !== 'object')) {
        acc[nextKey] = value.filter((v) => v != null).map(String).join(', ')
      } else {
        value.forEach((v, i) => flattenToInfoPack(v, `${nextKey}[${i}]`, acc))
      }
    } else {
      acc[nextKey] = String(value)
    }
  }
  return acc
}
