import { lineKey } from './line-key.js'
import { normaliseKeys } from './keys.js'
import { lineRow } from './rows.js'

const toList = (value) => (value === undefined ? [] : [value].flat())

// Only the results panel carries tick boxes, so a choice made under an earlier
// query rides back as a hidden `selection` value. The page's selection is the
// two together: what is carried, plus what is ticked in the results on screen.
export const mergedKeysFromPayload = (payload, known) =>
  normaliseKeys(
    [...toList(payload.selection), ...toList(payload.species)],
    known
  )

const linesOf = (answers) => answers.commodityLines ?? []

// A stored line carries its own row, so a reopened page needs no search to
// stand behind what was saved.
export const storedKeys = (answers) =>
  normaliseKeys(
    linesOf(answers).map(lineKey),
    new Map(linesOf(answers).map((line) => [lineKey(line), lineRow(line)]))
  )
