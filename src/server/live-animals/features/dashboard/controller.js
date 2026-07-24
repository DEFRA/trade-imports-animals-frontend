import { randomUUID } from 'node:crypto'
import {
  BASE,
  createPath,
  hubPath,
  pagePath,
  pageRoutePath,
  TEMPLATES
} from '../../config.js'
import { AMEND, DRAFT, SUBMITTED } from '../../engine/index.js'
import {
  amendJourney,
  listKnownJourneys,
  startJourney
} from '../../engine/journey.js'
import { CYA_SLUG, journeyStrip, routeOptions } from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import { importTypeFilterPage } from '../import-type-filter/page.js'
import { dashboardPage as page } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'
import { copy as sharedEn } from '../../shared/copy.en.js'
import { copy as sharedCy } from '../../shared/copy.cy.js'

const view = `${TEMPLATES}/features/dashboard/template`

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const dateText = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : null

const rowActions = (journey) => {
  const copyAction = {
    text: sharedCopy.notificationActions.copy.text,
    postAction: pagePath(journey.journeyId, 'copy'),
    idempotencyKey: randomUUID(),
    copyOrigin: 'dashboard'
  }
  const deleteAction = {
    text: sharedCopy.notificationActions.delete.text,
    href: pagePath(journey.journeyId, 'delete')
  }
  if (journey.status === SUBMITTED) {
    return [
      {
        text: copy.actions.view,
        href: pagePath(journey.journeyId, CYA_SLUG)
      },
      {
        text: copy.actions.amend,
        postAction: pagePath(journey.journeyId, 'amend')
      },
      copyAction,
      deleteAction
    ]
  }
  if (journey.status === DRAFT) {
    return [
      {
        text: copy.actions.resume,
        href: hubPath(journey.journeyId)
      },
      copyAction,
      deleteAction
    ]
  }
  if (journey.status === AMEND) {
    return [
      {
        text: copy.actions.resume,
        href: hubPath(journey.journeyId)
      },
      copyAction,
      {
        text: copy.actions.cancelAmend,
        href: pagePath(journey.journeyId, 'cancel-amend')
      },
      deleteAction
    ]
  }
  return []
}

const toRow = (journey, retryCopy = null) => ({
  reference: journey.journeyId,
  status: journeyStrip(journey).status,
  created: dateText(journey.createdAt),
  submitted: dateText(journey.submittedAt) ?? copy.notSubmitted,
  actions: rowActions(journey).map((action) =>
    retryCopy?.journeyId === journey.journeyId &&
    action.idempotencyKey !== undefined
      ? { ...action, idempotencyKey: retryCopy.idempotencyKey }
      : action
  )
})

export const renderDashboard = async (
  request,
  h,
  { recoverableError = false, retryCopy = null } = {}
) => {
  const journeys = await listKnownJourneys(request)
  return h.view(view, {
    pageTitle: copy.title,
    copy,
    sharedCopy,
    startAction: createPath(),
    notificationRows: journeys.map((journey) => toRow(journey, retryCopy)),
    recoverableError,
    deletionSucceeded: request.query?.deleted === '1'
  })
}

const listGet = async (request, h) => renderDashboard(request, h)

const dashboardPath = () => `${BASE}/${page.slug}`
const backToDashboard = (h) => h.redirect(dashboardPath())

const amendPost = async (request, h) => {
  const journey = await amendJourney(request, h, request.params.journeyId)
  return journey ? h.redirect(hubPath(journey.journeyId)) : backToDashboard(h)
}

export const routes = [
  {
    method: 'GET',
    path: dashboardPath(),
    options: routeOptions,
    handler: listGet
  },
  {
    method: 'GET',
    path: BASE,
    options: routeOptions,
    handler: (_request, h) => backToDashboard(h)
  },
  {
    method: 'POST',
    path: pageRoutePath('amend'),
    options: routeOptions,
    handler: amendPost
  },
  {
    method: 'POST',
    path: createPath(),
    options: routeOptions,
    handler: async (request, h) => {
      const journey = await startJourney(request, h)
      return h.redirect(pagePath(journey.journeyId, importTypeFilterPage.slug))
    }
  }
]
