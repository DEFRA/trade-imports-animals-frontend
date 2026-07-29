export const SEARCH_ACTION = 'search'
export const FILTER_ACTION = 'filter'
export const REMOVE_ACTION_PREFIX = 'remove:'
export const TYPE_FILTER_PREFIX = 'typeFilter:'

export const isReRenderAction = (action) =>
  action === SEARCH_ACTION ||
  action === FILTER_ACTION ||
  action.startsWith(REMOVE_ACTION_PREFIX)

// The type-select values, keyed by commodity name, carried on every submit as
// `typeFilter:<name>` fields.
export const typeFiltersFromPayload = (payload) =>
  Object.fromEntries(
    Object.entries(payload)
      .filter(([key]) => key.startsWith(TYPE_FILTER_PREFIX))
      .map(([key, value]) => [key.slice(TYPE_FILTER_PREFIX.length), value])
  )

export const withRemovalApplied = (action, selected) =>
  action.startsWith(REMOVE_ACTION_PREFIX)
    ? selected.filter(
        (key) => key !== action.slice(REMOVE_ACTION_PREFIX.length)
      )
    : selected
