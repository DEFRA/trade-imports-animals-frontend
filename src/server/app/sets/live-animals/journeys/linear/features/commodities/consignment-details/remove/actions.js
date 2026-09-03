// The Selected commodities table offers two removals, told apart by the action
// its row submits: a commodity row drops every line of that commodity, and a
// species row drops the one line and leaves the rest of the commodity in place.
export const REMOVE_ACTION_PREFIX = 'remove:'
export const REMOVE_SPECIES_ACTION_PREFIX = 'remove-species:'

export const isRemoveAction = (action) =>
  action.startsWith(REMOVE_ACTION_PREFIX)

export const removeIndexOf = (action) =>
  Number(action.slice(REMOVE_ACTION_PREFIX.length))

export const isRemoveSpeciesAction = (action) =>
  action.startsWith(REMOVE_SPECIES_ACTION_PREFIX)

export const removeSpeciesIndexOf = (action) =>
  Number(action.slice(REMOVE_SPECIES_ACTION_PREFIX.length))
