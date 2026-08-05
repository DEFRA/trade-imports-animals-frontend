import {
  breadcrumbs as buildBreadcrumbs,
  hubPath,
  pagePath,
  pageRoutePath
} from './paths.js'
import { AMEND, DELETED, DRAFT, SUBMITTED } from '../engine/index.js'
import { nextInSection } from '../flow/navigation.js'
import { journeyLayout, journeyNextRunTarget } from '../flow/journey-flow.js'
import { inOpeningRun } from '../flow/run-state.js'
import { copyFor } from './copy.js'
import { copy as sharedEn } from './copy.en.js'
import { copy as sharedCy } from './copy.cy.js'
import { isRecoverableBackendError } from '../services/persistence/records/errors.js'

export const routeOptions = {}

const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const STRIP_STATUS = {
  [DRAFT]: {
    text: sharedCopy.journeyStrip.draft,
    classes: 'govuk-tag--blue'
  },
  [SUBMITTED]: {
    text: sharedCopy.journeyStrip.submitted,
    classes: 'govuk-tag--green'
  },
  [AMEND]: {
    text: sharedCopy.journeyStrip.amend,
    classes: 'govuk-tag--yellow'
  },
  [DELETED]: {
    text: sharedCopy.journeyStrip.deleted,
    classes: 'govuk-tag--grey'
  }
}

export const journeyStrip = (journey) =>
  journey
    ? {
        reference: journey.journeyId,
        status: STRIP_STATUS[journey.status]
      }
    : null

export const CYA_SLUG = 'notification-view'

export const errorSummary = (fieldErrors) => {
  const entries = Object.entries(fieldErrors ?? {})
  if (entries.length === 0) {
    return null
  }
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
    ? journeyNextRunTarget(stepId, scope, request.params.journeyId)
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
    layout: journeyLayout(),
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
    return { value: await saveThunk() }
  } catch (error) {
    if (isRecoverableBackendError(error)) {
      return { failure: await onRecoverableFailure() }
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

export const readDate = (payload, name) => {
  const raw = String(payload[name] ?? '').trim()
  if (raw === '') {
    return { day: '', month: '', year: '' }
  }
  const match = /^(?<day>\d{1,2})\/(?<month>\d{1,2})\/(?<year>\d{4})$/.exec(raw)
  return match ? { ...match.groups } : raw
}

const dateInputValue = (value) =>
  typeof value === 'string'
    ? value
    : [value?.day, value?.month, value?.year]
        .map((part) => String(part ?? '').trim())
        .filter(Boolean)
        .join('/')

export const dateField = (name, { label, hint, value = {}, error } = {}) => {
  return {
    id: name,
    name,
    classes: 'govuk-input--width-10',
    label: { text: label, classes: 'govuk-label--s' },
    hint: hint ? { text: hint } : undefined,
    errorMessage: error ? { text: error } : undefined,
    value: dateInputValue(value)
  }
}
