/**
 * Graft 1 — the explicit home of bidirectional name<->id resolution
 * (obligations.md:721-761). Storage and evaluators see UUID `id`s only;
 * code, templates and i18n author against meaningful `name`s. Translation
 * happens at this boundary and nowhere else, so a cosmetic rename (new
 * `name`, same `id`) never touches persisted fulfilments — the flagship
 * proof lives in tests/rename-survival.test.js.
 */

/**
 * Index an obligations catalogue for name<->id resolution, asserting both
 * identifier spaces are unique. Lookups throw on unknown identifiers so a
 * typo fails loudly at the boundary instead of evaluating to undefined.
 */
export function createIdentifierIndex(obligations) {
  const byId = new Map()
  const byName = new Map()
  for (const record of obligations) {
    if (byId.has(record.id)) {
      throw new Error(`Duplicate obligation id "${record.id}"`)
    }
    if (byName.has(record.name)) {
      throw new Error(`Duplicate obligation name "${record.name}"`)
    }
    byId.set(record.id, record)
    byName.set(record.name, record)
  }

  const recordOfName = (name) => {
    const record = byName.get(name)
    if (!record) {
      throw new Error(`Unknown obligation name "${name}"`)
    }
    return record
  }

  const recordOfId = (id) => {
    const record = byId.get(id)
    if (!record) {
      throw new Error(`Unknown obligation id "${id}"`)
    }
    return record
  }

  return {
    idOf: (name) => recordOfName(name).id,
    nameOf: (id) => recordOfId(id).name,
    recordOfName,
    recordOfId,
    hasName: (name) => byName.has(name),
    hasId: (id) => byId.has(id),
    names: () => [...byName.keys()],
    ids: () => [...byId.keys()],
    size: byId.size
  }
}
