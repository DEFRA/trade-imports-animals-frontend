const REMOVE_ACTION_PREFIX = 'remove:'

/** The action value that removes the chosen species with the given key. */
export const removeActionFor = (key) => `${REMOVE_ACTION_PREFIX}${key}`

export const isRemoveAction = (action) =>
  action.startsWith(REMOVE_ACTION_PREFIX)

export const removeKeyOf = (action) => action.slice(REMOVE_ACTION_PREFIX.length)
