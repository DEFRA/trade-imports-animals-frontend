import {
  countryOfConsignment,
  countryOfOrigin,
  internalReference
} from './sections/origin.js'
import { reasonForImport } from './sections/purpose.js'

export {
  countryOfConsignment,
  countryOfOrigin,
  internalReference,
  reasonForImport
}

export const obligations = [
  countryOfOrigin,
  countryOfConsignment,
  internalReference,
  reasonForImport
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
