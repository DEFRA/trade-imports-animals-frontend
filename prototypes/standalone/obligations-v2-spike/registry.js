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
 *   - `all`     — every ROOT def, in flow order (feature by feature)
 *   - `byId`    — root id -> def lookup (used by the status roll-up)
 *   - `refs`    — root id -> def object (a convenience surface over the roots)
 *   - `walkDefs`— the FULL catalogue: every def at every depth (structure-only)
 *   - `walk`    — the per-INSTANCE catalogue for a given answers map
 *   - `byPath`  — template-address -> def, resolving sub-obligations at any depth
 *
 * INDEXED OBLIGATIONS ARE FIRST-CLASS (DISCUSSION-LOG entry 6a). A collection
 * def carries `collection:true` + a real nested `item:[...defs]` array, so the
 * model IS a tree. `all` stays the flat ROOTS array — the view the contract
 * test iterates — while `walkDefs`/`byPath` reach every depth, so nothing in
 * the model is ever blind to a sub-obligation (the finding that motivated 6a).
 *
 * The barrel ASSEMBLES; it does not DEFINE. The relationship edges between
 * obligations are real JS references authored inside the feature files (a
 * shared DAG threaded across slices — e.g. claims.activatedBy -> hadClaims),
 * so the barrel is a pure concatenation, never a place a def is born.
 *
 * PURITY is guarded PER-FILE, not here: `obligation-purity.js` (run at boot
 * from routes.js) asserts every feature obligations.js imports only another
 * feature obligations.js — the model can never import a view, request or
 * controller even though the defs now sit beside one.
 */
const all = [
  ...email.defs,
  ...aboutYou.defs,
  ...vehicle.defs,
  ...driving.defs,
  ...claims.defs,
  ...cover.defs,
  ...extras.defs,
  ...addons.defs,
  ...namedDriver.defs,
  ...modifications.defs,
  ...protectedNcd.defs,
  ...quote.defs
]

const byIdMap = new Map(all.map((o) => [o.id, o]))

/**
 * The FULL catalogue — every def at every depth, structure-only (independent of
 * any answers). Yields `{ templatePath, def }`, where the template address is
 * the index-free dotted path (`claims`, `claims.claimType`). Recurses `def.item`,
 * so a collection whose item contains another collection walks to full depth.
 */
export function* walkDefs(forest = all, base = []) {
  for (const def of forest) {
    const templatePath = base.length ? `${base.join('.')}.${def.id}` : def.id
    yield { templatePath, def }
    if (def.item) yield* walkDefs(def.item, [...base, def.id])
  }
}

/**
 * The per-INSTANCE catalogue for a concrete answers map — the tree MATERIALISED
 * against the data. Yields `{ path, def, collectionAncestorKey, framePath,
 * siblings }` for every root def and, for each collection, once per ACTUAL stored
 * entry (so two claims yield `claims[0].*` and `claims[1].*`).
 *  - `collectionAncestorKey` is the pathKey of the nearest enclosing collection
 *    (null at the root) — reconcile gates a sub-obligation's scope on its
 *    collection being in scope.
 *  - `framePath` is the path of THIS item's frame (the entry the def sits in;
 *    `[]` at the root) and `siblings` is the def list it was walked from — the
 *    two together let reconcile resolve an item-relative `activatedBy` (a
 *    reference to a sibling field within the same item) at this exact instance.
 */
export function* walk(
  answers,
  forest = all,
  basePath = [],
  ancestorKey = null
) {
  for (const def of forest) {
    const path = [...basePath, def.id]
    yield {
      path,
      def,
      collectionAncestorKey: ancestorKey,
      framePath: basePath,
      siblings: forest
    }
    if (def.item) {
      const entries = valueAt(answers, path) ?? []
      const key = pathKey(path)
      for (let i = 0; i < entries.length; i++) {
        yield* walk(answers, def.item, [...path, i], key)
      }
    }
  }
}

const byPathMap = new Map([...walkDefs()].map((n) => [n.templatePath, n.def]))

export const registry = {
  all,
  byId: (id) => byIdMap.get(id),
  refs: Object.fromEntries(all.map((o) => [o.id, o])),
  byPath: (templatePath) => byPathMap.get(templatePath)
}
