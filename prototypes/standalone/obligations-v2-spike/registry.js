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

/**
 * THE assembling registry barrel — the obligations model as a first-class,
 * top-level concern (no longer a drawer inside `state/`). Each feature owns
 * its own pure `obligations.js` vertical slice; this barrel imports every one
 * and ASSEMBLES the catalogue the engine + boot assertion depend on:
 *
 *   - `all`  — every def, in flow order (feature by feature)
 *   - `byId` — id -> def lookup (used by the status roll-up)
 *   - `refs` — id -> def object (a convenience surface over the whole set)
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

export const registry = {
  all,
  byId: (id) => byIdMap.get(id),
  refs: Object.fromEntries(all.map((o) => [o.id, o]))
}
