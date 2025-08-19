import {
  Annotation,
  MessagesAnnotation,
  BinaryOperator,
} from '@langchain/langgraph'
import { InfoPack, QandA, Scenario } from './types'

export const OverallState = Annotation.Root({
  ...MessagesAnnotation.spec,
  scenario: Annotation<Scenario>(),
  userId: Annotation<string>(),
  // The field in `infoPack` that currently needs more information
  missingField: Annotation<string | null>(),
  qAndA: Annotation<QandA[]>({
    reducer: ((acc: QandA[], value: QandA[]) => {
      return [...acc, ...value]
    }) as BinaryOperator<QandA[], QandA[]>,
  }),
  infoPack: Annotation<InfoPack>(),
})

export const OutputState = Annotation.Root({
  ...MessagesAnnotation.spec,
  infoPack: Annotation<InfoPack>(),
})
