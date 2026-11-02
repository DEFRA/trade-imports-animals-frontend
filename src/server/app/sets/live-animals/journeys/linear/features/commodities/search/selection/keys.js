import { codeAndLatinNameOf } from './line-key.js'

const byCodeThenName = (left, right) => {
  const [leftCode, leftName] = codeAndLatinNameOf(left)
  const [rightCode, rightName] = codeAndLatinNameOf(right)
  return leftCode.localeCompare(rightCode) || leftName.localeCompare(rightName)
}

export const inCanonicalOrder = (keys) =>
  [...new Set(keys)].sort(byCodeThenName)

export const knownKeysInCanonicalOrder = (keys, knownRowsByKey) =>
  inCanonicalOrder(keys.filter((key) => knownRowsByKey.has(key)))
