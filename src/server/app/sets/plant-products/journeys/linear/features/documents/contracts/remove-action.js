export const REMOVE_ACTION_PREFIX = 'remove:'

// A removal deletes a backend upload, so it is encoded as the value of a submit
// button on the page form — the crumb travels with it and no GET can trigger it.
export const removeActionValue = (index) => `${REMOVE_ACTION_PREFIX}${index}`

export const isRemoveAction = (action) =>
  String(action).startsWith(REMOVE_ACTION_PREFIX)

const REMOVE_ACTION_PATTERN = new RegExp(
  `^${REMOVE_ACTION_PREFIX}(0|[1-9]\\d*)$`
)

export const removeIndexOf = (action) => {
  const match = String(action).match(REMOVE_ACTION_PATTERN)
  return match ? Number(match[1]) : null
}
