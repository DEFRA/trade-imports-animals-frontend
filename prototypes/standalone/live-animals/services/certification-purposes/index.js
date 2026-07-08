import { CERTIFICATION_PURPOSES } from './stub.js'

export const certificationPurposes = () =>
  Object.entries(CERTIFICATION_PURPOSES).map(([value, text]) => ({
    value,
    text
  }))

export const list = () => certificationPurposes()

export const certificationLabel = (code) => CERTIFICATION_PURPOSES[code]
