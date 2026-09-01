// Collection cap (MAX_ENTRIES) — group-level, no fulfilmentIndex.
export const collectionCapExceeded = (invariantErrors) =>
  invariantErrors.some((error) => error.code === 'MAX_ENTRIES')

// Per-parent count invariant (recordCountEquals) — keyed by the PARENT
// record's fulfilment index (the commodity line), not this collection's
// own record fulfilment indexes, so it is checked here rather than per entry.
export const parentCountInvariantViolated = (
  invariantErrors,
  parentFulfilmentIndex
) =>
  parentFulfilmentIndex !== null &&
  invariantErrors.some(
    (error) => error.fulfilmentIndex === parentFulfilmentIndex
  )

// Empty collection: satisfied iff there's no requiredAtLeastOne floor.
export const emptyCollectionSatisfiesFloor = (collection) =>
  !collection.requiredAtLeastOne
