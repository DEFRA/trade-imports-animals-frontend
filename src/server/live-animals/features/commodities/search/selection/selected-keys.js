import { lineKey } from './line-key.js'
import { normaliseKeys } from './keys.js'

export const toList = (value) => (value === undefined ? [] : [].concat(value))

export const selectedKeysFromPayload = (payload) =>
  normaliseKeys(toList(payload.species))

export const storedKeys = (answers) =>
  normaliseKeys((answers.commodityLines ?? []).map(lineKey))
