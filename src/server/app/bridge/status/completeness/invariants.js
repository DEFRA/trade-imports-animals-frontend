// Collection cap (MAX_ENTRIES) — group-level, no fulfilmentIndex.
export const collectionCapExceeded = (invariantErrors) =>
  invariantErrors.some((error) => error.code === 'MAX_ENTRIES')

// Per-parent count invariant (recordCountEquals) — keyed by the PARENT
// record id (the commodity line), not this collection's own record ids,
// so it is checked here rather than per entry.
export const parentCountInvariantViolated = (invariantErrors, parentRecId) =>
  parentRecId !== null &&
  invariantErrors.some((error) => error.fulfilmentIndex === parentRecId)

// Empty collection: satisfied iff there's no requiredAtLeastOne floor.
export const emptyCollectionSatisfiesFloor = (collection) =>
  !collection.requiredAtLeastOne
