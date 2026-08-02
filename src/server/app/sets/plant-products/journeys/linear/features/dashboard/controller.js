// Minimum dashboard from docs/add-a-set.md step 9.
import {
  listKnownJourneys,
  startJourney
} from '../../../../../../engine/journey.js'
import {
  createPath,
  createRoutePath,
  dashboardPath,
  dashboardRoutePath,
  pagePath
} from '../../../../../../shared/paths.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { base, routeOptions } from '../../../../../../shared/kit.js'
import { TEMPLATES } from '../../config.js'
import { importTypePage } from '../import-type/page.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as en } from './copy/copy.en.js'

const view = `${TEMPLATES}/features/dashboard/template`
const copy = copyFor({ en, cy })

const toRow = (journey) => ({
  reference: journey.reference ?? journey.journeyId,
  status: journey.status,
  updated: journey.updatedAt ?? journey.createdAt
})

export const renderDashboard = async (request, h) => {
  const listed = await listKnownJourneys(request)
  return h.view(view, {
    ...base(copy.title),
    copy,
    startAction: createPath(),
    listAction: dashboardPath(),
    notificationRows: listed.rows.map(toRow)
  })
}

export const routes = [
  {
    method: 'GET',
    path: dashboardRoutePath(),
    options: routeOptions,
    handler: renderDashboard
  },
  {
    method: 'POST',
    path: createRoutePath(),
    options: routeOptions,
    handler: async (request, h) => {
      const journey = await startJourney(request, h)
      return h.redirect(pagePath(journey.journeyId, importTypePage.slug))
    }
  }
]
