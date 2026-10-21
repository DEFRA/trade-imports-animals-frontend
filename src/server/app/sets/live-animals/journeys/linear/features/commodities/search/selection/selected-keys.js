import { lineKey } from './line-key.js'
import { knownKeysInCanonicalOrder } from './keys.js'
import { lineRowsByKey } from './rows.js'

const toList = (value) => (value === undefined ? [] : [value].flat())

// Only the results panel carries tick boxes, so a choice made under an earlier
// query rides back as a hidden `selection` value. The page's selection is the
// two together: what is carried, plus what is ticked in the results on screen.
export const mergedKeysFromPayload = (payload, knownRowsByKey) =>
  knownKeysInCanonicalOrder(
    [...toList(payload.selection), ...toList(payload.species)],
    knownRowsByKey
  )

const linesOf = (answers) => answers.commodityLines ?? []

export const storedKeys = (answers) =>
  knownKeysInCanonicalOrder(
    linesOf(answers).map(lineKey),
    lineRowsByKey(linesOf(answers))
  )
