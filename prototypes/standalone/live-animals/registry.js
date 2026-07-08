import * as origin from './features/origin/obligations.js'
import * as commodities from './features/commodities/obligations.js'
import * as importReason from './features/import-reason/obligations.js'
import * as importPurpose from './features/import-purpose/obligations.js'
import * as documents from './features/documents/obligations.js'
import * as addresses from './features/addresses/obligations.js'
import * as transport from './features/transport/obligations.js'
import * as contact from './features/contact/obligations.js'
import * as namedDriver from './features/named-driver/obligations.js'
import * as modifications from './features/modifications/obligations.js'
import * as protectedNcd from './features/protected-ncd/obligations.js'
import * as quote from './features/quote/obligations.js'
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
  ...namedDriver.obligations,
  ...modifications.obligations,
  ...protectedNcd.obligations,
  ...quote.obligations,
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
 * being in scope. `framePath` (this item's frame) and `siblings` (the
 * obligation list it was walked from) together let reconcile resolve an
 * item-relative `activatedBy` at this exact instance.
 */
export function* walk(
  answers,
  forest = all,
  basePath = [],
  ancestorKey = null
) {
  for (const obligation of forest) {
    const path = [...basePath, obligation.id]
    yield {
      path,
      obligation,
      collectionAncestorKey: ancestorKey,
      framePath: basePath,
      siblings: forest
    }
    if (obligation.item) {
      const entries = valueAt(answers, path) ?? []
      const key = pathKey(path)
      for (let i = 0; i < entries.length; i++) {
        yield* walk(answers, obligation.item, [...path, i], key)
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
