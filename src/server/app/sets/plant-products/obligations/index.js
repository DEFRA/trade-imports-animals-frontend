import { countryOfOrigin } from './sections/origin.js'

export { countryOfOrigin }

export const obligations = [countryOfOrigin]

export const groups = obligations.filter((obligation) =>
  obligations.some((other) => other.within === obligation)
)

export const policy = {
  systemPopulated: [],
  enforcedAtContinue: ['countryOfOrigin'],
  maxEntriesFrom: {},
  systemAnswerKeys: ['referenceNumber']
}
