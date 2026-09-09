export const ADD_ACTION = 'add'
export const REMOVE_ACTION_PREFIX = 'remove:'

/** Removing a country changes what the page will save, so it submits the page
 * form — the crumb travels with it and no GET can trigger it. The country code
 * rides in the button value, so the row a trader presses is the row that goes
 * however the list has been reordered since the page rendered. */
export const removeActionFor = (code) => `${REMOVE_ACTION_PREFIX}${code}`

export const isRemoveAction = (action) =>
  action.startsWith(REMOVE_ACTION_PREFIX)

export const removeCodeOf = (action) =>
  action.slice(REMOVE_ACTION_PREFIX.length)
