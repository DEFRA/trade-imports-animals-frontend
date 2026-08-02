// Scaffolded by docs/add-a-set.md step 3.
import * as dashboard from './dashboard/controller.js'
import * as hub from './hub/controller.js'
import * as importType from './import-type/controller.js'

export const dispatchPages = [importType.meta]

export const allRoutes = [
  ...dashboard.routes,
  ...importType.routes,
  ...hub.routes
]
