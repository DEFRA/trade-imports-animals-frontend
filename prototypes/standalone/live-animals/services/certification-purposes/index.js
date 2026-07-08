import { CERTIFICATION_PURPOSES } from './stub.js'

/** The certification purposes as {value,text} options, in reference-data order — for select options and validation membership. */
export const certificationPurposes = () =>
  Object.entries(CERTIFICATION_PURPOSES).map(([value, text]) => ({
    value,
    text
  }))

/** Alias of certificationPurposes — the options-ready certification-purpose list. */
export const list = () => certificationPurposes()

/** The display label for a certification-purpose code, or undefined when the code is unknown. */
export const certificationLabel = (code) => CERTIFICATION_PURPOSES[code]
