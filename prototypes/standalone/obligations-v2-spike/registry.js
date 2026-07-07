import * as email from './features/email/obligations.js'
import * as aboutYou from './features/about-you/obligations.js'
import * as vehicle from './features/your-vehicle/obligations.js'
import * as driving from './features/driving-history/obligations.js'
import * as claims from './features/claims/obligations.js'
import * as cover from './features/cover-type/obligations.js'
import * as extras from './features/optional-extras/obligations.js'
import * as addons from './features/addons/obligations.js'
import * as namedDriver from './features/named-driver/obligations.js'
import * as modifications from './features/modifications/obligations.js'
import * as protectedNcd from './features/protected-ncd/obligations.js'
import * as quote from './features/quote/obligations.js'
import { pathKey, valueAt } from './lib/path.js'

/**
 * THE assembling registry barrel — the obligations model as a first-class,
 * top-level concern (no longer a drawer inside `state/`). Each feature owns
 * its own pure `obligations.js` vertical slice; this barrel imports every one
 * and ASSEMBLES the catalogue the engine + boot assertion depend on:
 *
 *   - `all`     — every ROOT obligation, in flow order (feature by feature)
 *   - `byId`    — root id -> obligation lookup (used by the status roll-up)
 *   - `walkObligations`— the FULL catalogue: every obligation at every depth (structure-only)
 *   - `walk`    — the per-INSTANCE catalogue for a given answers map
 *   - `byPath`  — template-address -> obligation, resolving sub-obligations at any depth
 *
 * INDEXED OBLIGATIONS ARE FIRST-CLASS (DISCUSSION-LOG entry 6a). A collection
 * obligation carries `collection:true` + a real nested `item:[...obligations]` array, so the
 * model IS a tree. `all` stays the flat ROOTS array — the view the contract
 * test iterates — while `walkObligations`/`byPath` reach every depth, so nothing in
 * the model is ever blind to a sub-obligation (the finding that motivated 6a).
 *
 * The barrel ASSEMBLES; it does not DEFINE. The relationship edges between
 * obligations are real JS references authored inside the feature files (a
 * shared DAG threaded across slices — e.g. claims.activatedBy -> hadClaims),
 * so the barrel is a pure concatenation, never a place an obligation is born.
 *
 * PURITY is guarded PER-FILE, not here: `obligation-purity.js` (run at boot
 * from routes.js) asserts every feature obligations.js imports only another
 * feature obligations.js — the model can never import a view, request or
 * controller even though the obligations now sit beside one.
 */
const all = [
  ...email.obligations,
  ...aboutYou.obligations,
  ...vehicle.obligations,
  ...driving.obligations,
  ...claims.obligations,
  ...cover.obligations,
  ...extras.obligations,
  ...addons.obligations,
  ...namedDriver.obligations,
  ...modifications.obligations,
  ...protectedNcd.obligations,
  ...quote.obligations
]

const byIdMap = new Map(all.map((obligation) => [obligation.id, obligation]))

/**
 * The FULL catalogue — every obligation at every depth, structure-only (independent of
 * any answers). Yields `{ templatePath, obligation }`, where the template address is
 * the index-free dotted path (`claims`, `claims.claimType`). Recurses `obligation.item`,
 * so a collection whose item contains another collection walks to full depth.
 */
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
 * The per-INSTANCE catalogue for a concrete answers map — the tree MATERIALISED
 * against the data. Yields `{ path, obligation, collectionAncestorKey, framePath,
 * siblings }` for every root obligation and, for each collection, once per ACTUAL stored
 * entry (so two claims yield `claims[0].*` and `claims[1].*`).
 *  - `collectionAncestorKey` is the pathKey of the nearest enclosing collection
 *    (null at the root) — reconcile gates a sub-obligation's scope on its
 *    collection being in scope.
 *  - `framePath` is the path of THIS item's frame (the entry the obligation sits in;
 *    `[]` at the root) and `siblings` is the obligation list it was walked from — the
 *    two together let reconcile resolve an item-relative `activatedBy` (a
 *    reference to a sibling field within the same item) at this exact instance.
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
