import { lineKey } from './line-key.js'
import { normaliseKeys } from './keys.js'

const toList = (value) => (value === undefined ? [] : [value].flat())

// Only the results panel carries tick boxes, so a choice made under an earlier
// query rides back as a hidden `selection` value. The page's selection is the
// two together: what is carried, plus what is ticked in the results on screen.
export const mergedKeysFromPayload = (payload) =>
  normaliseKeys([...toList(payload.selection), ...toList(payload.species)])

export const storedKeys = (answers) =>
  normaliseKeys((answers.commodityLines ?? []).map(lineKey))
