import * as dashboard from './dashboard/controller.js'
import * as importTypeFilter from './import-type-filter/controller.js'
import * as hub from './hub/controller.js'
import * as origin from './origin/controller.js'
import * as commoditiesSearch from './commodities/search.controller.js'
import * as consignmentDetails from './commodities/consignment-details.controller.js'
import * as animalIdentification from './commodities/animal-identification.controller.js'
import * as importReason from './import-reason/controller.js'
import * as importPurpose from './import-purpose/controller.js'
import * as additionalDetails from './additional-details/controller.js'
import * as documents from './documents/controller.js'
import * as addresses from './addresses/controller.js'
import * as consignorsSelect from './addresses/consignors-select.controller.js'
import * as destinationsSelect from './addresses/destinations-select.controller.js'
import * as placeOfOriginSelect from './addresses/place-of-origin-select.controller.js'
import * as consigneesSelect from './addresses/consignees-select.controller.js'
import * as importersSelect from './addresses/importers-select.controller.js'
import * as createAddress from './addresses/create-address.controller.js'
import * as cphNumber from './cph-number/controller.js'
import * as portOfEntry from './transport/port-of-entry.controller.js'
import * as transitCountries from './transport/transit-countries.controller.js'
import * as transporters from './transport/transporters.controller.js'
import * as transportersSelect from './transport/transporters-select.controller.js'
import * as privateTransporterDetails from './transport/private-transporter-details.controller.js'
import * as contactSelect from './contact/controller.js'
import * as cya from './check-answers/controller.js'
import * as declaration from './declaration/controller.js'
import * as confirmation from './confirmation/controller.js'

/** The pages whose page-side `collects` build the obligation->page index. */
export const dispatchPages = [
  importTypeFilter.meta,
  origin.meta,
  commoditiesSearch.meta,
  consignmentDetails.meta,
  animalIdentification.meta,
  importReason.meta,
  importPurpose.meta,
  additionalDetails.meta,
  documents.meta,
  addresses.meta,
  cphNumber.meta,
  portOfEntry.meta,
  transitCountries.meta,
  transporters.meta,
  transportersSelect.meta,
  privateTransporterDetails.meta,
  contactSelect.meta,
  declaration.meta
]

export const allRoutes = [
  ...dashboard.routes,
  ...importTypeFilter.routes,
  ...hub.routes,
  ...origin.routes,
  ...commoditiesSearch.routes,
  ...consignmentDetails.routes,
  ...animalIdentification.routes,
  ...importReason.routes,
  ...importPurpose.routes,
  ...additionalDetails.routes,
  ...documents.routes,
  ...addresses.routes,
  ...consignorsSelect.routes,
  ...destinationsSelect.routes,
  ...placeOfOriginSelect.routes,
  ...consigneesSelect.routes,
  ...importersSelect.routes,
  ...createAddress.routes,
  ...cphNumber.routes,
  ...portOfEntry.routes,
  ...transitCountries.routes,
  ...transporters.routes,
  ...transportersSelect.routes,
  ...privateTransporterDetails.routes,
  ...contactSelect.routes,
  ...cya.routes,
  ...declaration.routes,
  ...confirmation.routes
]
