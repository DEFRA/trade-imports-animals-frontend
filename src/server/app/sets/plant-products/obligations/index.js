import {
  countryOfConsignment,
  countryOfOrigin,
  internalReference
} from './sections/origin.js'

export { countryOfConsignment, countryOfOrigin, internalReference }

export const obligations = [
  countryOfOrigin,
  countryOfConsignment,
  internalReference
]

export const groups = obligations.filter((obligation) =>
  obligations.some((other) => other.within === obligation)
)

export const policy = {
  systemPopulated: [],
  enforcedAtContinue: ['countryOfOrigin'],
  maxEntriesFrom: {},
  systemAnswerKeys: ['referenceNumber']
}
