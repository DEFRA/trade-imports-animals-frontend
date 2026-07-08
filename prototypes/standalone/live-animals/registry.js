import * as origin from './features/origin/obligations.js'
import * as commodities from './features/commodities/obligations.js'
import * as importReason from './features/import-reason/obligations.js'
import * as importPurpose from './features/import-purpose/obligations.js'
import * as documents from './features/documents/obligations.js'
import * as addresses from './features/addresses/obligations.js'
import * as transport from './features/transport/obligations.js'
import * as contact from './features/contact/obligations.js'
import * as declaration from './features/declaration/obligations.js'
import { pathKey, valueAt } from './lib/path.js'

const all = [
  ...origin.obligations,
  ...commodities.obligations,
  ...importReason.obligations,
  ...importPurpose.obligations,
  ...documents.obligations,
  ...addresses.obligations,
  ...transport.obligations,
  ...contact.obligations,
  ...declaration.obligations
]

const byIdMap = new Map(all.map((obligation) => [obligation.id, obligation]))

export function* walkObligations(forest = all, basePath = []) {
  for (const obligation of forest) {
    const templatePath = basePath.length
      ? `${basePath.join('.')}.${obligation.id}`
      : obligation.id
    yield { templatePath, obligation }
    if (obligation.item) {
      yield* walkObligations(obligation.item, [...basePath, obligation.id])
    }
  }
}

/**
 * Yielded-field contract consumed by reconcile:
 * `collectionAncestorKey` — pathKey of the nearest enclosing collection (null
 * at the root); reconcile gates a sub-obligation's scope on its collection
 * being in scope. `frames` — this instance's frame chain, INNERMOST-FIRST:
 * each `{ framePath, siblings }` pairs a concrete frame path (with indices)
 * with the obligation list walked at that depth. `frames[0]` is the node's own
 * frame (its `activatedBy` sibling frame today); the tail is its enclosing
 * frames out to the root. reconcile resolves an item-relative `activatedBy` at
 * this exact instance from `frames[0]`, and a `frame: "enclosing"` / `frame:
 * "anyItem"` reference by walking the chain (see engine/evaluate/predicate.js).
 */
export function* walk(
  answers,
  forest = all,
  basePath = [],
  ancestorKey = null,
  frames = [{ framePath: basePath, siblings: forest }]
) {
  for (const obligation of forest) {
    const path = [...basePath, obligation.id]
    yield {
      path,
      obligation,
      collectionAncestorKey: ancestorKey,
      frames
    }
    if (obligation.item) {
      const entries = valueAt(answers, path) ?? []
      const key = pathKey(path)
      for (let i = 0; i < entries.length; i++) {
        const itemFramePath = [...path, i]
        yield* walk(answers, obligation.item, itemFramePath, key, [
          { framePath: itemFramePath, siblings: obligation.item },
          ...frames
        ])
      }
    }
  }
}

const byPathMap = new Map(
  [...walkObligations()].map((node) => [node.templatePath, node.obligation])
)

export const registry = {
  all,
  byId: (id) => byIdMap.get(id),
  byPath: (templatePath) => byPathMap.get(templatePath)
}
