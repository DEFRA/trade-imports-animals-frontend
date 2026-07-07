import * as dashboard from './dashboard/controller.js'
import * as start from './start/controller.js'
import * as hub from './hub/controller.js'
import * as origin from './origin/controller.js'
import * as commoditiesList from './commodities/list.controller.js'
import * as commoditiesSelect from './commodities/select.controller.js'
import * as commoditiesDetails from './commodities/details.controller.js'
import * as importReason from './import-reason/controller.js'
import * as importPurpose from './import-purpose/controller.js'
import * as email from './email/controller.js'
import * as aboutYou from './about-you/controller.js'
import * as vehicle from './your-vehicle/controller.js'
import * as driving from './driving-history/controller.js'
import * as claimsList from './claims/list.controller.js'
import * as claimsEntry from './claims/entry.controller.js'
import * as cover from './cover-type/controller.js'
import * as extras from './optional-extras/controller.js'
import * as addons from './addons/controller.js'
import * as driversHub from './named-driver/drivers-hub.controller.js'
import * as driverEntry from './named-driver/driver-entry.controller.js'
import * as driverDetail from './named-driver/driver-detail.controller.js'
import * as driverClaim from './named-driver/driver-claim.controller.js'
import * as modDesc from './modifications/describe.controller.js'
import * as modVal from './modifications/value.controller.js'
import * as ncd from './protected-ncd/years.controller.js'
import * as quote from './quote/controller.js'
import * as cya from './check-answers/controller.js'
import * as confirmation from './confirmation/controller.js'
import * as resume from './resume/controller.js'

/** The pages whose page-side `collects` build the obligation->page index. */
export const dispatchPages = [
  origin.meta,
  commoditiesList.meta,
  importReason.meta,
  importPurpose.meta,
  email.meta,
  aboutYou.meta,
  vehicle.meta,
  driving.meta,
  claimsList.meta,
  cover.meta,
  extras.meta,
  addons.meta,
  driversHub.meta,
  modDesc.meta,
  modVal.meta,
  ncd.meta
]

export const allRoutes = [
  ...dashboard.routes,
  ...start.routes,
  ...hub.routes,
  ...origin.routes,
  ...commoditiesList.routes,
  ...commoditiesSelect.routes,
  ...commoditiesDetails.routes,
  ...importReason.routes,
  ...importPurpose.routes,
  ...email.routes,
  ...aboutYou.routes,
  ...vehicle.routes,
  ...driving.routes,
  ...claimsList.routes,
  ...claimsEntry.routes,
  ...cover.routes,
  ...extras.routes,
  ...addons.routes,
  ...driversHub.routes,
  ...driverEntry.routes,
  ...driverDetail.routes,
  ...driverClaim.routes,
  ...modDesc.routes,
  ...modVal.routes,
  ...ncd.routes,
  ...quote.routes,
  ...cya.routes,
  ...confirmation.routes,
  ...resume.routes
]
