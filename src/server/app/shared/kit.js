import { dashboardPath, hubPath, pagePath, pageRoutePath } from './paths.js'
import { AMEND, DELETED, DRAFT, SUBMITTED } from '../engine/index.js'
import { nextInTaskRow } from '../flow/navigation.js'
import {
  journeyLayout,
  journeyNextRunTarget,
  journeyPreviousRunTarget,
  journeySectionCaption
} from '../flow/journey-flow.js'
import { inOpeningRun } from '../flow/run-state.js'
import { copyFor } from './copy.js'
import { copy as sharedEn } from './copy.en.js'
import { copy as sharedCy } from './copy.cy.js'
import { isRecoverableBackendError } from '../services/persistence/records/errors.js'
import { AMEND_RETURN_CHOICE, amendFormActions } from './amend-form-actions.js'

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

export const CYA_SLUG = 'notification-view'

export const CANCEL_AMEND_SLUG = 'cancel-amend'

const cancelAmendControl = (journey) =>
  journey.status === AMEND
    ? {
        href: pagePath(journey.journeyId, CANCEL_AMEND_SLUG),
        text: sharedCopy.journeyStrip.cancelAmend
      }
    : undefined

/**
 * The status strip shown above a journey page's caption and heading.
 *
 * @param {object} [journey] - the journey, or none.
 * @param {object} [options]
 * @param {boolean} [options.offerCancelAmend] - offer Cancel amend while the
 * journey is being amended. False on the page Cancel amend leads to.
 * @returns {object|null} the strip view model, or null without a journey.
 */
export const journeyStrip = (journey, { offerCancelAmend = true } = {}) =>
  journey
    ? {
        reference: journey.journeyId,
        status: STRIP_STATUS[journey.status],
        cancelAmend: offerCancelAmend ? cancelAmendControl(journey) : undefined
      }
    : null

const anchorHref = (field) => `#${field}`

/**
 * The error summary view model.
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

export const REFUSAL_LOG_MESSAGE = 'Answer refused, page shown again'
export const SAVE_FALLBACK_LOG_MESSAGE =
  'Save failed on a recoverable backend error, fallback response sent'

/**
 * Logs a refusal once at info. The error codes are the field keys, never the
 * messages.
 *
 * @param {object} request - the request being answered.
 * @param {object} [options] - other keys (the named reason, ids) are logged as given.
 * @param {object} [options.fieldErrors] - map of field key to the message the
 * page shows (may be empty). Only for a refusal that is not the user's own
 * input (a state refusal, a tampered post, another service refusing), never
 * for errors the user can correct on the form.
 */
export const logRefusal = (
  request,
  { fieldErrors = {}, level = 'info', ...details } = {}
) =>
  request.logger[level](
    {
      ...details,
      journeyId: request.params.journeyId,
      route: request.route?.path,
      errorCodes: Object.keys(fieldErrors)
    },
    REFUSAL_LOG_MESSAGE
  )

const HUB_EXIT_FIELD = 'exit'
const HUB_EXIT_VALUE = 'hub'

/**
 * The save choice a request carries: whether Save and return to overview was
 * pressed, and whether the save returns to the review.
 *
 * @param {object} request - the request being answered.
 * @returns {{ hubExit: boolean, change: boolean }} the save choice.
 */
export const requestSaveChoice = (request) => ({
  hubExit: request.payload?.[HUB_EXIT_FIELD] === HUB_EXIT_VALUE,
  change: Boolean(request.query?.change)
})

/**
 * The save choice carried by a returned form.
 *
 * @param {object} request - the returning request.
 * @param {object} returnedForm - the returned form values.
 * @param {object} [journey] - the journey the page belongs to.
 * @returns {{ hubExit: boolean, change: boolean }} the save choice.
 */
export const returnedSaveChoice = (request, returnedForm, journey) => ({
  hubExit: returnedForm[HUB_EXIT_FIELD] === HUB_EXIT_VALUE,
  change:
    journey?.status === AMEND
      ? returnedForm[AMEND_RETURN_CHOICE.name] === AMEND_RETURN_CHOICE.value
      : requestSaveChoice(request).change
})

export const hubExitTarget = (
  request,
  { saveChoice = requestSaveChoice(request) } = {}
) => (saveChoice.hubExit ? hubPath(request.params.journeyId) : null)

export const changeContext = (request) => requestSaveChoice(request).change

/** The href with `change=1` added to its query string. */
export const appendChangeContext = (href) =>
  `${href}${href.includes('?') ? '&' : '?'}change=1`

export const withChangeContext = (request, href) =>
  changeContext(request) ? appendChangeContext(href) : href

/**
 * Reads the `return` marker a request carries.
 *
 * @param {object} request - the request being answered.
 * @param {string[]} allowedSlugs - the page slugs the marker may name.
 * @returns {{ honouredSlug?: string, refusedMarker?: string }} `{}` without a
 * marker, `{ honouredSlug }` when the marker is one of `allowedSlugs`, else
 * `{ refusedMarker }` holding the value received.
 */
export const readReturnMarker = (request, allowedSlugs) => {
  const marker = request.query?.return
  if (marker === undefined) {
    return {}
  }
  return allowedSlugs.includes(marker)
    ? { honouredSlug: marker }
    : { refusedMarker: marker }
}

/**
 * Where a valid save goes.
 *
 * @param {object} request - the request being answered.
 * @param {string} fallback - where a save goes when it neither exits to the
 * overview nor returns to the review.
 * @param {object} [options]
 * @param {{ hubExit: boolean, change: boolean }} [options.saveChoice] - the
 * save choice to follow. Defaults to the request's own.
 * @returns {string} the path to go to.
 */
export const exitTarget = (
  request,
  fallback,
  { saveChoice = requestSaveChoice(request) } = {}
) =>
  hubExitTarget(request, { saveChoice }) ??
  (saveChoice.change ? pagePath(request.params.journeyId, CYA_SLUG) : fallback)

/** The review's path for a save made while amending from a Change link, else null. */
export const amendReviewTarget = (request, journey) =>
  journey?.status === AMEND && changeContext(request)
    ? pagePath(request.params.journeyId, CYA_SLUG)
    : null

export const runTarget = async (request, stepId, scope) =>
  (await inOpeningRun(request, request.params.journeyId))
    ? journeyNextRunTarget(stepId, scope, request.params.journeyId)
    : null

/**
 * Where a run step's Back link goes.
 *
 * @param {object} request - the request being answered.
 * @param {string} stepId - the run step's id.
 * @param {object} current - the page's current state.
 * @param {object} current.journey - the journey.
 * @param {object} current.scope - the journey's scope.
 * @param {object} current.answers - the journey's stored answers.
 * @param {object} [options]
 * @param {boolean} [options.returnsToReview] - the page returns to the
 * review rather than the overview. When true, a request carrying change
 * context or a notification being amended is answered with the review;
 * every other state is answered exactly as it is without the option.
 * @returns {Promise<string>} the path to go to.
 */
export const runBackLink = async (
  request,
  stepId,
  current,
  { returnsToReview = false } = {}
) => {
  const { journey, scope, answers } = current
  if (returnsToReview && (changeContext(request) || journey.status === AMEND)) {
    return pagePath(journey.journeyId, CYA_SLUG)
  }
  const previousRunTarget = (await inOpeningRun(
    request,
    request.params.journeyId
  ))
    ? journeyPreviousRunTarget(
        stepId,
        { scope, answers },
        request.params.journeyId
      )
    : null
  return previousRunTarget ?? hubPath(journey.journeyId)
}

/**
 * Where a valid save on a page goes next.
 *
 * @param {object} request - the request being answered.
 * @param {object} page - the page being saved.
 * @param {object} scope - the journey's scope.
 * @param {object} [options]
 * @param {{ hubExit: boolean, change: boolean }} [options.saveChoice] - the
 * save choice to follow. Defaults to the request's own.
 * @returns {Promise<string>} the path to go to.
 */
export const nextTarget = async (request, page, scope, { saveChoice } = {}) =>
  exitTarget(
    request,
    (await runTarget(request, page.id, scope)) ??
      nextInTaskRow(page.id, scope, request.params.journeyId),
    { saveChoice }
  )

/**
 * The chrome every journey page shares.
 *
 * @param {string} title - the page title.
 * @param {object} [options]
 * @param {object} [options.page] - the page identity. Supply it and the view
 * gains the `caption` naming the section of the journey the page belongs to;
 * omit it on a page the journey deliberately leaves uncaptioned.
 * @param {object} [options.request] - the request being answered. Supply it
 * on a page that ends with `saveActions`, and the view gains `amend`: the two
 * form actions its save buttons carry while the journey is being amended, and
 * `returnChoice`, or null otherwise.
 * @param {string} [options.surface] - a key of `SURFACES` naming the width of
 * the content column. Defaults to `form`, the reading measure; an unknown
 * surface throws.
 * @param {boolean} [options.showJourneyStrip] - false leaves the status strip off the page.
 * @param {{ titleText: string, text: string }|null} [options.successBanner] -
 * the success notification banner the layout shows after the status strip.
 * Defaults to none.
 * @returns {object} the common view model.
 */
export const base = (
  title,
  {
    backLink,
    journey,
    journeyId = journey?.journeyId,
    page,
    recoverableError = false,
    offerCancelAmend = true,
    showJourneyStrip = true,
    successBanner = null,
    request,
    surface = 'form'
  } = {}
) => {
  const hasJourney = journeyId != null
  const amending = journey?.status === AMEND
  return {
    layout: journeyLayout(),
    pageTitle: title,
    caption: journeySectionCaption(page?.id),
    backLink,
    homeUrl: dashboardPath(),
    hubHref: hasJourney ? hubPath(journeyId) : undefined,
    journeyStrip: showJourneyStrip
      ? journeyStrip(journey, { offerCancelAmend })
      : null,
    amending,
    amend:
      amending && request
        ? amendFormActions(request.path ?? '', request.url?.searchParams)
        : null,
    concurrencyToken: journey?.concurrencyToken ?? null,
    sharedCopy,
    recoverableError,
    successBanner,
    contentColumnClass: surfaceClass(surface)
  }
}

const SHARED_LAYOUT = 'shared/layout.njk'

export const setlessBase = (title) => ({
  layout: SHARED_LAYOUT,
  pageTitle: title,
  homeUrl: '/',
  journeyStrip: null,
  concurrencyToken: null,
  sharedCopy,
  recoverableError: false,
  successBanner: null,
  contentColumnClass: SURFACES.form
})

/**
 * Runs a save and answers a recoverable backend failure with the page's
 * fallback, logging the failure once at warn.
 *
 * @param {object} request - the request being answered.
 * @param {() => Promise<*>} saveThunk - makes the save.
 * @param {(error: Error) => *} onRecoverableFailure - builds the response for a
 * recoverable backend failure, from the failure itself.
 * @param {object} [ids] - ids to log beside the journey id.
 * @returns {Promise<{value: *}|{failure: *}>} the save's value, or the
 * fallback's response as `failure`.
 */
export const recoverableSave = async (
  request,
  saveThunk,
  onRecoverableFailure,
  ids = {}
) => {
  try {
    return { value: await saveThunk() }
  } catch (error) {
    if (error?.code === 'STALE_CONCURRENCY_TOKEN') {
      throw error
    }
    if (isRecoverableBackendError(error)) {
      request.logger.warn(
        {
          ...ids,
          journeyId: request.params.journeyId,
          route: request.route?.path,
          err: error
        },
        SAVE_FALLBACK_LOG_MESSAGE
      )
      return { failure: await onRecoverableFailure(error) }
    }
    throw error
  }
}

const redirectOnStaleAction = (post) => async (request, h) => {
  try {
    return await post(request, h)
  } catch (error) {
    if (error?.code === 'STALE_CONCURRENCY_TOKEN') {
      request.logger.info(
        {
          journeyId: request.params.journeyId,
          postedConcurrencyToken: request.payload?.concurrencyToken
        },
        'Save refused: the notification changed since the page was shown'
      )
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
  ...(post
    ? [
        {
          method: 'POST',
          path: pageRoutePath(page.slug),
          options: routeOptions,
          handler: redirectOnStaleAction(post)
        }
      ]
    : [])
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

/** A stored `{ day, month, year }` as `d/m/yyyy` text. Text is returned unchanged. */
export const dateTextOf = (value) =>
  typeof value === 'string'
    ? value
    : [value?.day, value?.month, value?.year]
        .map((part) => String(part ?? '').trim())
        .filter(Boolean)
        .join('/')

/**
 * The view model for a date-picker text field. The form group always carries
 * the house date-picker class.
 *
 * @param {string} name
 * @param {object} [options]
 * @param {string} [options.label] - the label text.
 * @param {string} [options.hint] - the hint text. No hint shows when absent.
 * @param {string|{day?: string, month?: string, year?: string}} [options.value]
 * the answer, shown as `d/m/yyyy` text.
 * @param {string} [options.error] - the error message text. No error shows
 * when absent.
 * @param {string} [options.minDate] - the earliest date as `d/m/yyyy` text,
 * never a Date.
 * @param {string} [options.maxDate] - the latest date as `d/m/yyyy` text.
 * @param {string} [options.formGroupClasses] - extra classes for the form
 * group, added after the house date-picker class.
 * @param {string} [options.labelClasses] - classes for the label. The GOV.UK
 * small label unless the page asks for another.
 * @returns {object} the view model for the MoJ date picker macro.
 */
export const dateField = (
  name,
  {
    label,
    hint,
    value = {},
    error,
    minDate,
    maxDate,
    formGroupClasses,
    labelClasses = 'govuk-label--s'
  } = {}
) => {
  return {
    id: name,
    name,
    classes: 'govuk-input--width-10',
    label: { text: label, classes: labelClasses },
    hint: hint ? { text: hint } : undefined,
    errorMessage: error ? { text: error } : undefined,
    value: dateTextOf(value),
    minDate,
    maxDate,
    formGroup: {
      classes: ['app-date-picker', formGroupClasses].filter(Boolean).join(' ')
    }
  }
}
