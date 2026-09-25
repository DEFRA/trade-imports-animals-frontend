import { dashboardPath, hubPath, pagePath, pageRoutePath } from './paths.js'
import { AMEND, DELETED, DRAFT, SUBMITTED } from '../engine/index.js'
import { nextInSection } from '../flow/navigation.js'
import {
  journeyLayout,
  journeyNextRunTarget,
  journeySectionCaption
} from '../flow/journey-flow.js'
import { inOpeningRun } from '../flow/run-state.js'
import { copyFor } from './copy.js'
import { copy as sharedEn } from './copy.en.js'
import { copy as sharedCy } from './copy.cy.js'
import { isRecoverableBackendError } from '../services/persistence/records/errors.js'

export const routeOptions = { auth: 'session' }

export const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

export const SURFACES = Object.freeze({
  form: 'govuk-grid-column-two-thirds',
  display: 'govuk-grid-column-full'
})

export const surfaceClass = (surface) => {
  if (!Object.hasOwn(SURFACES, surface)) {
    throw new Error(
      `Unknown surface '${surface}'. Expected one of: ${Object.keys(SURFACES).join(', ')}`
    )
  }
  return SURFACES[surface]
}

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

const anchorHref = (field) => `#${field}`

/**
 * The one error summary shape the service renders.
 *
 * @param {object} [fieldErrors] - map of key to message. Empty means no summary.
 * @param {object} [options]
 * @param {(key: string) => string} [options.href] - builds the link for a key.
 * Defaults to the in-page anchor `#key`; pass a builder when the entries link
 * somewhere else, such as another page.
 * @param {boolean} [options.disableAutoFocus] - keep the caret where it is
 * instead of moving it to the summary. Set it on a page that renders the
 * summary without the user having just been refused.
 * @returns {object|null} the summary view model, or null when there are no
 * errors.
 */
export const errorSummary = (
  fieldErrors,
  { href = anchorHref, disableAutoFocus } = {}
) => {
  const entries = Object.entries(fieldErrors ?? {})
  if (entries.length === 0) {
    return null
  }
  return {
    titleText: sharedCopy.errorSummary.title,
    disableAutoFocus,
    errorList: entries.map(([field, text]) => ({ text, href: href(field) }))
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

/**
 * The chrome every journey page shares.
 *
 * @param {string} title - the page title.
 * @param {object} [options]
 * @param {object} [options.page] - the page identity. Supply it and the view
 * gains the `caption` naming the section of the journey the page belongs to;
 * omit it on a page the journey deliberately leaves uncaptioned.
 * @returns {object} the common view model.
 */
export const base = (
  title,
  {
    backLink,
    journey,
    journeyId = journey?.journeyId,
    page,
    recoverableError = false
  } = {}
) => {
  const hasJourney = journeyId != null
  return {
    layout: journeyLayout(),
    pageTitle: title,
    caption: journeySectionCaption(page?.id),
    backLink,
    // The chrome's home link, resolved in this request's set. Hardcoding `/`
    // would send every set's service navigation to the default set's
    // dashboard by way of the root redirect.
    homeUrl: dashboardPath(),
    hubHref: hasJourney ? hubPath(journeyId) : undefined,
    journeyStrip: journeyStrip(journey),
    concurrencyToken: journey?.concurrencyToken ?? null,
    sharedCopy,
    recoverableError,
    contentColumnClass: SURFACES.form
  }
}

/** The shared layout, named here rather than read from a set's journey flow. */
const SHARED_LAYOUT = 'shared/layout.njk'

export const setlessBase = (title) => ({
  layout: SHARED_LAYOUT,
  pageTitle: title,
  // No caption, back link or hub link: all three are journey chrome, and there
  // is no journey here. The home link is the root, which redirects to the
  // default set.
  homeUrl: '/',
  journeyStrip: null,
  concurrencyToken: null,
  sharedCopy,
  recoverableError: false,
  contentColumnClass: SURFACES.form
})

export const recoverableSave = async (saveThunk, onRecoverableFailure) => {
  try {
    return { value: await saveThunk() }
  } catch (error) {
    if (error?.code === 'STALE_CONCURRENCY_TOKEN') {
      throw error
    }
    if (isRecoverableBackendError(error)) {
      return { failure: await onRecoverableFailure() }
    }
    throw error
  }
}

const redirectOnStaleAction = (post) => async (request, h) => {
  try {
    return await post(request, h)
  } catch (error) {
    if (error?.code === 'STALE_CONCURRENCY_TOKEN') {
      const query = request.url.searchParams
      query.set('staleAction', '1')
      return h.redirect(`${request.path}?${query.toString()}`)
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
    handler: redirectOnStaleAction(post)
  }
]

export const readDate = (payload, name) => {
  const raw = String(payload[name] ?? '').trim()
  if (raw === '') {
    return { day: '', month: '', year: '' }
  }
  const match = /^(?<day>\d{1,2})\/(?<month>\d{1,2})\/(?<year>\d{4})$/.exec(raw)
  if (!match) {
    return raw
  }
  const { day, month, year } = match.groups
  return { day, month, year }
}

/** The inverse of `readDate`: a stored `{ day, month, year }` back as the
 * `d/m/yyyy` text the date field holds and the date rules read. A value that is
 * already text is its own answer — `readDate` hands back what it could not
 * split, so an unreadable date survives a round trip and is still refused. */
export const dateTextOf = (value) =>
  typeof value === 'string'
    ? value
    : [value?.day, value?.month, value?.year]
        .map((part) => String(part ?? '').trim())
        .filter(Boolean)
        .join('/')

/**
 * @param {string} name
 * @param {object} [options]
 * @param {string} [options.minDate] - `d/m/yyyy` TEXT, not a Date: it goes
 * verbatim into `data-min-date`, and the MoJ picker parses nothing else. Pass
 * `arrivalWindow().minText`, never its sibling `min`.
 * @param {string} [options.maxDate] - `d/m/yyyy` text, same contract.
 * @param {string} [options.formGroupClasses] - classes for the field's form
 * group. The picker's client-side script inserts the calendar dialog inside
 * the form group, so a class here is the simplest stylesheet hook onto one
 * picker rather than all of them.
 */
export const dateField = (
  name,
  { label, hint, value = {}, error, minDate, maxDate, formGroupClasses } = {}
) => {
  return {
    id: name,
    name,
    classes: 'govuk-input--width-10',
    label: { text: label, classes: 'govuk-label--s' },
    hint: hint ? { text: hint } : undefined,
    errorMessage: error ? { text: error } : undefined,
    value: dateTextOf(value),
    minDate,
    maxDate,
    formGroup: formGroupClasses ? { classes: formGroupClasses } : undefined
  }
}
