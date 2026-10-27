import { lineKey } from './line-key.js'
import { inCanonicalOrder, knownKeysInCanonicalOrder } from './keys.js'

const toList = (value) => (value === undefined ? [] : [value].flat())

const keysInPayload = (payload) => [
  ...toList(payload.selection),
  ...toList(payload.species)
]

export const mergedKeysFromPayload = (payload, knownRowsByKey) =>
  knownKeysInCanonicalOrder(keysInPayload(payload), knownRowsByKey)

export const droppedKeysFromPayload = (payload, knownRowsByKey) =>
  keysInPayload(payload).filter((key) => !knownRowsByKey.has(key))

const linesOf = (answers) => answers.commodityLines ?? []

export const storedKeys = (answers) =>
  inCanonicalOrder(linesOf(answers).map(lineKey))
