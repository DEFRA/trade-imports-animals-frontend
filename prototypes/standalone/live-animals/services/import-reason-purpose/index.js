import {
  REASON_FOR_IMPORT_LABEL,
  PURPOSE_IN_INTERNAL_MARKET_LABEL
} from './stub.js'

/** The reasons for import as {value,text} options, in reference-data order — for select options and validation membership. */
export const reasons = () =>
  Object.entries(REASON_FOR_IMPORT_LABEL).map(([value, text]) => ({
    value,
    text
  }))

/** The display label for a reason-for-import code, or undefined when the code is unknown. */
export const reasonLabel = (code) => REASON_FOR_IMPORT_LABEL[code]

/** The internal-market purposes as {value,text} options, in reference-data order — for select options and validation membership. */
export const purposes = () =>
  Object.entries(PURPOSE_IN_INTERNAL_MARKET_LABEL).map(([value, text]) => ({
    value,
    text
  }))

/** The display label for an internal-market purpose code, or undefined when the code is unknown. */
export const purposeLabel = (code) => PURPOSE_IN_INTERNAL_MARKET_LABEL[code]
