// The stub store starts empty and holds no examples: the service shows only
// templates a user has really saved (c-183). Keyed by owner id; each value is
// an array of { id, name, setId, created } with `created` an ISO string.
const store = new Map()

export const stubTemplates = store

const newestFirst = (left, right) => right.created.localeCompare(left.created)

/**
 * The owner's stub templates, newest saved first.
 *
 * @param {string} ownerId - the signed-in user's id
 * @returns {Array<{ id: string, name: string, setId: string, created: string }>} the owner's templates
 */
export const list = (ownerId) =>
  [...(store.get(ownerId) ?? [])].sort(newestFirst)
