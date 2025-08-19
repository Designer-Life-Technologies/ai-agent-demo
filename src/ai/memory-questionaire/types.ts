export type Scenario = 'injury' | 'illness'

export type InfoPack = {
  [key: string]: string
}

export type QandA = {
  field: string
  question: string
  answer?: string
}
