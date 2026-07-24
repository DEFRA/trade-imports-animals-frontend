import {
  breadcrumbs as buildBreadcrumbs,
  hubPath,
  LAYOUT,
  pagePath,
  pageRoutePath
} from '../config.js'
import { SUBMITTED } from '../engine/index.js'
import { nextInSection } from '../flow/navigation.js'
import { nextRunTarget } from '../flow/run.js'
import { inOpeningRun } from '../flow/run-state.js'
import { copyFor } from './copy.js'
import { copy as sharedEn } from './copy.en.js'
import { copy as sharedCy } from './copy.cy.js'
import { isRecoverableBackendError } from '../services/persistence/records/errors.js'

export const routeOptions = {}

const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const STRIP_STATUS = {
  draft: { text: sharedCopy.journeyStrip.draft, classes: 'govuk-tag--blue' },
  submitted: {
    text: sharedCopy.journeyStrip.submitted,
    classes: 'govuk-tag--green'
  }
}

export const journeyStrip = (journey) =>
  journey
    ? {
        reference: journey.journeyId,
        status:
          journey.status === SUBMITTED
            ? STRIP_STATUS.submitted
            : STRIP_STATUS.draft
      }
    : null

export const CYA_SLUG = 'notification-view'

export const errorSummary = (fieldErrors) => {
  const entries = Object.entries(fieldErrors ?? {})
  if (entries.length === 0) return null
  return {
    titleText: sharedCopy.errorSummary.title,
    errorList: entries.map(([field, text]) => ({ text, href: `#${field}` }))
  }
}

export const fieldError = (fieldErrors, field) =>
  fieldErrors?.[field] ? { text: fieldErrors[field] } : undefined

export const hubExitTarget = (request) =>
  request.payload?.exit === 'hub' ? hubPath(request.params.journeyId) : null

export const changeContext = (request) => Boolean(request.query.change)

export const withChangeContext = (request, href) =>
  changeContext(request) ? `${href}?change=1` : href

export const exitTarget = (request, fallback) =>
  hubExitTarget(request) ??
  (changeContext(request)
    ? pagePath(request.params.journeyId, CYA_SLUG)
    : fallback)

export const runTarget = async (request, stepId, scope) =>
  (await inOpeningRun(request, request.params.journeyId))
    ? nextRunTarget(stepId, scope, request.params.journeyId)
    : null

export const nextTarget = async (request, page, scope) =>
  exitTarget(
    request,
    (await runTarget(request, page.id, scope)) ??
      nextInSection(page.id, scope, request.params.journeyId)
  )

export const base = (
  title,
  {
    backLink,
    journey,
    journeyId = journey?.journeyId,
    recoverableError = false
  } = {}
) => {
  const hasJourney = journeyId != null
  return {
    layout: LAYOUT,
    pageTitle: title,
    breadcrumbs: hasJourney ? buildBreadcrumbs(journeyId, title) : false,
    backLink,
    hubHref: hasJourney ? hubPath(journeyId) : undefined,
    journeyStrip: journeyStrip(journey),
    sharedCopy,
    recoverableError
  }
}

export const recoverableSave = async (saveThunk, onRecoverableFailure) => {
  try {
    return await saveThunk()
  } catch (error) {
    if (isRecoverableBackendError(error)) {
      return onRecoverableFailure()
    }
    throw error
  }
}

export const pageRoutes = (page, { get, post }) => [
  {
    method: 'GET',
    path: pageRoutePath(page.slug),
    options: routeOptions,
    handler: get
  },
  {
    method: 'POST',
    path: pageRoutePath(page.slug),
    options: routeOptions,
    handler: post
  }
]

export const readDate = (payload, name) => ({
  day: (payload[`${name}-day`] ?? '').trim(),
  month: (payload[`${name}-month`] ?? '').trim(),
  year: (payload[`${name}-year`] ?? '').trim()
})

export const dateField = (name, { label, hint, value = {}, error } = {}) => {
  const width = (charWidth) =>
    `govuk-input--width-${charWidth}${error ? ' govuk-input--error' : ''}`
  return {
    id: name,
    namePrefix: name,
    fieldset: { legend: { text: label, classes: 'govuk-fieldset__legend--s' } },
    hint: hint ? { text: hint } : undefined,
    errorMessage: error ? { text: error } : undefined,
    items: [
      { name: 'day', classes: width(2), value: value.day },
      { name: 'month', classes: width(2), value: value.month },
      { name: 'year', classes: width(4), value: value.year }
    ]
  }
}
