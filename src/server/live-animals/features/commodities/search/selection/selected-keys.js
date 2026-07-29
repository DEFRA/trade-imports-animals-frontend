import { lineKey } from './line-key.js'
import { normaliseKeys } from './keys.js'

export const toList = (value) => (value === undefined ? [] : [].concat(value))

// The form's selection state across search round-trips: hidden `selected`
// inputs carry the running selection, hidden `shown` inputs name the keys
// rendered as checkboxes (an unchecked box posts nothing, so "shown and
// unposted" means deselected, while "not shown" means carried forward).
export const selectedKeysFromPayload = (payload) => {
  const shown = new Set(toList(payload.shown))
  const carried = toList(payload.selected).filter((key) => !shown.has(key))
  return normaliseKeys([...carried, ...toList(payload.species)])
}

export const storedKeys = (answers) =>
  normaliseKeys((answers.commodityLines ?? []).map(lineKey))
