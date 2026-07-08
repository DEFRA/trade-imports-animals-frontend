import {
  REASON_FOR_IMPORT_LABEL,
  PURPOSE_IN_INTERNAL_MARKET_LABEL
} from './stub.js'

export const reasons = () =>
  Object.entries(REASON_FOR_IMPORT_LABEL).map(([value, text]) => ({
    value,
    text
  }))

export const reasonLabel = (code) => REASON_FOR_IMPORT_LABEL[code]

export const purposes = () =>
  Object.entries(PURPOSE_IN_INTERNAL_MARKET_LABEL).map(([value, text]) => ({
    value,
    text
  }))

export const purposeLabel = (code) => PURPOSE_IN_INTERNAL_MARKET_LABEL[code]
