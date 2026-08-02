// Scaffolded by docs/add-a-set.md step 3.
import * as dashboard from './dashboard/controller.js'
import * as hub from './hub/controller.js'
import * as importType from './import-type/controller.js'
import * as countryOfOrigin from './origin/country-of-origin/country-of-origin.controller.js'

export const dispatchPages = [importType.meta, countryOfOrigin.meta]

export const allRoutes = [
  ...dashboard.routes,
  ...importType.routes,
  ...countryOfOrigin.routes,
  ...hub.routes
]
