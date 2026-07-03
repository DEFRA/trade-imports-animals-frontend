import * as start from './start/controller.js'
import * as hub from './hub/controller.js'
import * as email from './email/controller.js'
import * as aboutYou from './about-you/controller.js'
import * as vehicle from './your-vehicle/controller.js'
import * as driving from './driving-history/controller.js'
import * as claimsList from './claims/list.controller.js'
import * as claimsEntry from './claims/entry.controller.js'
import * as cover from './cover-type/controller.js'
import * as extras from './optional-extras/controller.js'
import * as addons from './addons/controller.js'
import * as ndWho from './named-driver/who.controller.js'
import * as ndRel from './named-driver/relationship.controller.js'
import * as modDesc from './modifications/describe.controller.js'
import * as modVal from './modifications/value.controller.js'
import * as ncd from './protected-ncd/years.controller.js'
import * as quote from './quote/controller.js'
import * as cya from './check-answers/controller.js'
import * as confirmation from './confirmation/controller.js'

/**
 * The page registry — the one place every controller is assembled. The
 * collecting pages contribute their page-side `meta.collects` to the
 * dispatch inversion (coverage-asserted at boot); every controller
 * contributes its routes. Shell + endings collect nothing and carry no
 * meta.
 */

/** The pages whose page-side `collects` build the obligation->page index. */
export const dispatchPages = [
  email.meta,
  aboutYou.meta,
  vehicle.meta,
  driving.meta,
  claimsList.meta,
  cover.meta,
  extras.meta,
  addons.meta,
  ndWho.meta,
  ndRel.meta,
  modDesc.meta,
  modVal.meta,
  ncd.meta
]

/** Every route across the whole spike, flattened for server.route(). */
export const allRoutes = [
  ...start.routes,
  ...hub.routes,
  ...email.routes,
  ...aboutYou.routes,
  ...vehicle.routes,
  ...driving.routes,
  ...claimsList.routes,
  ...claimsEntry.routes,
  ...cover.routes,
  ...extras.routes,
  ...addons.routes,
  ...ndWho.routes,
  ...ndRel.routes,
  ...modDesc.routes,
  ...modVal.routes,
  ...ncd.routes,
  ...quote.routes,
  ...cya.routes,
  ...confirmation.routes
]
