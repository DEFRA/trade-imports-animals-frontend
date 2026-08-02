// Scaffolded by docs/add-a-set.md step 3.
import * as dashboard from './dashboard/controller.js'
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
  transport.meta
]

export const allRoutes = [
  ...dashboard.routes,
  ...importType.routes,
  ...countryOfOrigin.routes,
  ...originOfImport.routes,
  ...purpose.routes,
  ...transport.routes,
  ...hub.routes
]
