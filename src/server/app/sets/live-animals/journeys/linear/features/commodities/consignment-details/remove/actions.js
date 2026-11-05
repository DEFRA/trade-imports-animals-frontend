const REMOVE_ACTION_PREFIX = 'remove:'
const REMOVE_SPECIES_ACTION_PREFIX = 'remove-species:'

export const removeActionFor = (commodityCode) =>
  `${REMOVE_ACTION_PREFIX}${commodityCode}`

export const isRemoveAction = (action) =>
  action.startsWith(REMOVE_ACTION_PREFIX)

export const removeCodeOf = (action) =>
  action.slice(REMOVE_ACTION_PREFIX.length)

export const removeSpeciesActionFor = (key) =>
  `${REMOVE_SPECIES_ACTION_PREFIX}${key}`

export const isRemoveSpeciesAction = (action) =>
  action.startsWith(REMOVE_SPECIES_ACTION_PREFIX)

export const removeKeyOf = (action) =>
  action.slice(REMOVE_SPECIES_ACTION_PREFIX.length)
