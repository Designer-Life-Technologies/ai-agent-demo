import { UserFullProfile } from '../../db'
import { InfoPack, Scenario } from './types'

export function populateUserDataPrompt(
  userData: UserFullProfile,
  scenario: Scenario,
): string {
  return `You are a heath and safety expert assisting a user to complete a questionaire to gather information to deal with for a ${scenario}.\n\n

  Your task is to fill in the questionaire with the user's information.

  CURRENT USER INFORMATION:
  ${JSON.stringify(userData)}

    Guidelines:
    - If you do not have information to fill in a field, mark it as unknown.
    - Do not make assumptions or inferences.
    - Only include factual information directly stated by the user.
    - If there is more than one workplace, fill in the first one.
    - If there is more than one industry, list them as comma separated values.
    - If there is more than one role, list them as comma separated values.
    - Replace the country code with the full country name.
    - Replace the state code with the full state name.
  `
}

export function nextQuestionPrompt(
  infoPack: InfoPack,
  missingField: string,
): string {
  return `You are a heath and safety expert assisting a user to complete a questionaire to gather information to deal with ${infoPack.scenario}.\n\n

  CURRENT INFORMATION:
  ${JSON.stringify(infoPack)}
    
  Currently information for field: ${missingField} is missing\n\n

  Ask the user a question to find the information for ${missingField}.\n\n
  `
}
