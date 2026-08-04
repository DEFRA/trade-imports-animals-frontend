// Scaffolded by docs/add-a-set.md step 3.
import * as additionalDetails from './additional-details/controller.js'
import * as contact from './contact/controller.js'
import * as checkAnswers from './check-answers/controller.js'
import * as dashboard from './dashboard/controller.js'
import * as documents from './documents/controller.js'
import * as declaration from './declaration/controller.js'
import * as confirmation from './confirmation/controller.js'
import * as notificationActions from './notification-actions/controller.js'
import * as commodityInputMethod from './commodities/commodity-input-method/commodity-input-method.controller.js'
import * as commodityBasicDescription from './commodities/basic-description/basic-description.controller.js'
import * as commoditySearch from './commodities/search/search.controller.js'
import * as varietyOfGenusAndSpecies from './commodities/variety-of-genus-and-species/variety-of-genus-and-species.controller.js'
import * as commoditySummary from './commodities/commodity-summary/commodity-summary.controller.js'
import * as commodityBulkDetails from './commodities/commodity-bulk-details/commodity-bulk-details.controller.js'
import * as hub from './hub/controller.js'
import * as importType from './import-type/controller.js'
import * as goodsMovement from './goods-movement/controller.js'
import * as nominatedContacts from './nominated-contacts/controller.js'
import * as countryOfOrigin from './origin/country-of-origin/country-of-origin.controller.js'
import * as originOfImport from './origin/origin-of-import/origin-of-import.controller.js'
import * as purpose from './purpose/controller.js'
import * as transport from './transport/controller.js'
import * as tradersAddresses from './traders/traders-addresses/traders-addresses.controller.js'
import * as consignorCreate from './traders/consignor-create/consignor-create.controller.js'
import * as consignorConfirmation from './traders/consignor-confirmation/consignor-confirmation.controller.js'

export const dispatchPages = [
  dashboard.meta,
  importType.meta,
  countryOfOrigin.meta,
  originOfImport.meta,
  purpose.meta,
  commodityInputMethod.meta,
  commoditySearch.meta,
  commodityBasicDescription.meta,
  varietyOfGenusAndSpecies.meta,
  commoditySummary.meta,
  commodityBulkDetails.meta,
  additionalDetails.meta,
  transport.meta,
  goodsMovement.meta,
  contact.meta,
  nominatedContacts.meta,
  documents.meta,
  tradersAddresses.meta,
  consignorCreate.meta,
  consignorConfirmation.meta,
  checkAnswers.meta,
  declaration.meta
]

export const allRoutes = [
  ...dashboard.routes,
  ...importType.routes,
  ...countryOfOrigin.routes,
  ...originOfImport.routes,
  ...purpose.routes,
  ...commodityInputMethod.routes,
  ...commoditySearch.routes,
  ...commodityBasicDescription.routes,
  ...varietyOfGenusAndSpecies.routes,
  ...commoditySummary.routes,
  ...commodityBulkDetails.routes,
  ...additionalDetails.routes,
  ...transport.routes,
  ...goodsMovement.routes,
  ...contact.routes,
  ...nominatedContacts.routes,
  ...documents.routes,
  ...tradersAddresses.routes,
  ...consignorCreate.routes,
  ...consignorConfirmation.routes,
  ...checkAnswers.routes,
  ...notificationActions.routes,
  ...declaration.routes,
  ...confirmation.routes,
  ...hub.routes
]
