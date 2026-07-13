import * as dashboard from './dashboard/controller.js'
import * as importTypeFilter from './import-type-filter/controller.js'
import * as hub from './hub/controller.js'
import * as origin from './origin/controller.js'
import * as commoditiesList from './commodities/list.controller.js'
import * as commoditiesSelect from './commodities/select.controller.js'
import * as commoditiesDetails from './commodities/details.controller.js'
import * as animalIdentifiersList from './commodities/animal-identifiers.list.controller.js'
import * as animalIdentifiersEntry from './commodities/animal-identifiers.entry.controller.js'
import * as importReason from './import-reason/controller.js'
import * as importPurpose from './import-purpose/controller.js'
import * as additionalDetails from './additional-details/controller.js'
import * as documentsList from './documents/list.controller.js'
import * as documentsEntry from './documents/entry.controller.js'
import * as addresses from './addresses/controller.js'
import * as consignorsSelect from './addresses/consignors-select.controller.js'
import * as destinationsSelect from './addresses/destinations-select.controller.js'
import * as placeOfOriginSelect from './addresses/place-of-origin-select.controller.js'
import * as consigneesSelect from './addresses/consignees-select.controller.js'
import * as importersSelect from './addresses/importers-select.controller.js'
import * as cphNumber from './cph-number/controller.js'
import * as portOfEntry from './transport/port-of-entry.controller.js'
import * as transportDetails from './transport/transport-details.controller.js'
import * as transporters from './transport/transporters.controller.js'
import * as transportersSelect from './transport/transporters-select.controller.js'
import * as privateTransporterDetails from './transport/private-transporter-details.controller.js'
import * as contactSelect from './contact/controller.js'
import * as cya from './check-answers/controller.js'
import * as declaration from './declaration/controller.js'
import * as resume from './resume/controller.js'

/** The pages whose page-side `collects` build the obligation->page index. */
export const dispatchPages = [
  importTypeFilter.meta,
  origin.meta,
  commoditiesList.meta,
  importReason.meta,
  importPurpose.meta,
  additionalDetails.meta,
  documentsList.meta,
  addresses.meta,
  cphNumber.meta,
  portOfEntry.meta,
  transportDetails.meta,
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
  ...commoditiesList.routes,
  ...commoditiesSelect.routes,
  ...commoditiesDetails.routes,
  ...animalIdentifiersList.routes,
  ...animalIdentifiersEntry.routes,
  ...importReason.routes,
  ...importPurpose.routes,
  ...additionalDetails.routes,
  ...documentsList.routes,
  ...documentsEntry.routes,
  ...addresses.routes,
  ...consignorsSelect.routes,
  ...destinationsSelect.routes,
  ...placeOfOriginSelect.routes,
  ...consigneesSelect.routes,
  ...importersSelect.routes,
  ...cphNumber.routes,
  ...portOfEntry.routes,
  ...transportDetails.routes,
  ...transporters.routes,
  ...transportersSelect.routes,
  ...privateTransporterDetails.routes,
  ...contactSelect.routes,
  ...cya.routes,
  ...declaration.routes,
  ...resume.routes
]
