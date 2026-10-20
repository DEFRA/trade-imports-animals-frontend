export const codeAndLatinNameOf = (key) => {
  const separator = key.indexOf('|')
  return [key.slice(0, separator), key.slice(separator + 1)]
}

// Canonical selection order: by code, then by Latin name — so the details
// page renders the same groups whatever order the boxes were ticked in.
const byCodeThenName = (left, right) => {
  const [leftCode, leftName] = codeAndLatinNameOf(left)
  const [rightCode, rightName] = codeAndLatinNameOf(right)
  return leftCode.localeCompare(rightCode) || leftName.localeCompare(rightName)
}

export const knownKeysInCanonicalOrder = (keys, knownRowsByKey) =>
  [...new Set(keys.filter((key) => knownRowsByKey.has(key)))].sort(
    byCodeThenName
  )
