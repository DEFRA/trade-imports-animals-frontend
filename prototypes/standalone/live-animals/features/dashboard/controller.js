import { BASE, hubPath, pagePath, startPath, TEMPLATES } from '../../config.js'
import { SUBMITTED } from '../../engine/persistence/records.js'
import {
  amendJourney,
  listKnownJourneys,
  selectJourney,
  startJourney
} from '../../engine/journey.js'
import { CYA_SLUG, journeyStrip, open } from '../../shared/kit.js'
import { importTypeFilterPage } from '../import-type-filter/page.js'
import { dashboardPage as page } from './page.js'

const view = `${TEMPLATES}/features/dashboard/template`

const NOT_SUBMITTED = 'Not submitted'

const dateText = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : null

const rowActions = (journey) =>
  journey.status === SUBMITTED
    ? [
        {
          text: 'View',
          href: pagePath(`home/${journey.journeyId}/view`)
        },
        {
          text: 'Amend',
          postAction: pagePath(`home/${journey.journeyId}/amend`)
        }
      ]
    : [
        {
          text: 'Resume',
          href: pagePath(`home/${journey.journeyId}/resume`)
        }
      ]

const toRow = (journey) => ({
  reference: journey.journeyId,
  status: journeyStrip(journey).status,
  created: dateText(journey.createdAt),
  submitted: dateText(journey.submittedAt) ?? NOT_SUBMITTED,
  actions: rowActions(journey)
})

const listGet = async (request, h) => {
  const journeys = await listKnownJourneys(request)
  return h.view(view, {
    pageTitle: 'Import notification service',
    heading: 'Import notification service',
    body:
      'Use this service to tell the authorities about live animals ' +
      'you are importing. You will answer a short set of questions ' +
      'about the consignment, then submit your notification.',
    buttonText: 'Start a new notification',
    startAction: startPath(),
    notificationRows: journeys.map(toRow)
  })
}

const backToDashboard = (h) => h.redirect(pagePath(page.slug))

const resumeGet = async (request, h) => {
  const journey = await selectJourney(request, h, request.params.journeyId)
  return journey ? h.redirect(hubPath()) : backToDashboard(h)
}

const viewGet = async (request, h) => {
  const journey = await selectJourney(request, h, request.params.journeyId)
  return journey ? h.redirect(pagePath(CYA_SLUG)) : backToDashboard(h)
}

const amendPost = async (request, h) => {
  const journey = await amendJourney(request, h, request.params.journeyId)
  return journey ? h.redirect(hubPath()) : backToDashboard(h)
}

export const routes = [
  {
    method: 'GET',
    path: pagePath(page.slug),
    options: open,
    handler: listGet
  },
  {
    method: 'GET',
    path: BASE,
    options: open,
    handler: (_request, h) => backToDashboard(h)
  },
  {
    method: 'GET',
    path: pagePath('home/{journeyId}/resume'),
    options: open,
    handler: resumeGet
  },
  {
    method: 'GET',
    path: pagePath('home/{journeyId}/view'),
    options: open,
    handler: viewGet
  },
  {
    method: 'POST',
    path: pagePath('home/{journeyId}/amend'),
    options: open,
    handler: amendPost
  },
  {
    method: 'POST',
    path: startPath(),
    options: open,
    handler: async (request, h) => {
      await startJourney(request, h)
      return h.redirect(pagePath(importTypeFilterPage.slug))
    }
  }
]
