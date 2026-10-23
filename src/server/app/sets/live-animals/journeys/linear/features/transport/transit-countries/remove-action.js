export const ADD_ACTION = 'add'
export const REMOVE_ACTION_PREFIX = 'remove:'

/** The action value that removes the country with the given code. */
export const removeActionFor = (code) => `${REMOVE_ACTION_PREFIX}${code}`

export const isRemoveAction = (action) =>
  action.startsWith(REMOVE_ACTION_PREFIX)

export const removeCodeOf = (action) =>
  action.slice(REMOVE_ACTION_PREFIX.length)
