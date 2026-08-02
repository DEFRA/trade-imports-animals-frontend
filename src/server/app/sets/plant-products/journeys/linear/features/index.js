// Scaffolded by docs/add-a-set.md step 3.
import * as dashboard from './dashboard/controller.js'
import * as commodityInputMethod from './commodities/commodity-input-method/commodity-input-method.controller.js'
import * as commodityBasicDescription from './commodities/basic-description/basic-description.controller.js'
import * as commoditySearch from './commodities/search/search.controller.js'
import * as varietyOfGenusAndSpecies from './commodities/variety-of-genus-and-species/variety-of-genus-and-species.controller.js'
import * as commoditySummary from './commodities/commodity-summary/commodity-summary.controller.js'
import * as hub from './hub/controller.js'
import * as importType from './import-type/controller.js'
import * as countryOfOrigin from './origin/country-of-origin/country-of-origin.controller.js'
import * as originOfImport from './origin/origin-of-import/origin-of-import.controller.js'
import * as purpose from './purpose/controller.js'
import * as transport from './transport/controller.js'

export const dispatchPages = [
  importType.meta,
  countryOfOrigin.meta,
  originOfImport.meta,
  purpose.meta,
  commodityInputMethod.meta,
  commoditySearch.meta,
  commodityBasicDescription.meta,
  varietyOfGenusAndSpecies.meta,
  commoditySummary.meta,
  transport.meta
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
  ...transport.routes,
  ...hub.routes
]
