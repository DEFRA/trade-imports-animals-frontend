import { dashboardPath, hubPath, pagePath } from './paths.js'
import {
  journeyInsTypeQuestionUrl,
  journeySections
} from '../flow/journey-flow.js'

export const TRAIL_PARAMETER = 'from'
export const TRAIL_SEPARATOR = ','
const RETURN_PARAMETER = 'return'
export const LONGEST_TRAIL = 40

export const TRAIL_START = Object.freeze({
  overview: 'overview',
  dashboard: 'dashboard',
  ins: 'ins'
})

const recognisedTrailEntries = () =>
  new Set([
    ...Object.values(TRAIL_START),
    ...journeySections().flatMap((section) =>
      section.pages.map((page) => page.slug).filter(Boolean)
    )
  ])

const readTrail = (request) => {
  const received = request.query?.[TRAIL_PARAMETER]
  if (received === undefined) {
    return { entries: [] }
  }
  const entries =
    typeof received === 'string' ? received.split(TRAIL_SEPARATOR) : []
  const recognised = recognisedTrailEntries()
  return entries.length > 0 && entries.every((entry) => recognised.has(entry))
    ? { entries }
    : { entries: [], unrecognised: String(received) }
}

const loggedWarnings = new WeakMap()

const warnOncePerRequest = (request, loggedFlag, details, message) => {
  const flags = loggedWarnings.get(request) ?? new Set()
  if (flags.has(loggedFlag)) {
    return
  }
  flags.add(loggedFlag)
  loggedWarnings.set(request, flags)
  request.logger.warn(
    {
      journeyId: request.params?.journeyId,
      route: request.route?.path,
      ...details
    },
    message
  )
}

const longestLoggedValue = 200

const logUnrecognisedTrail = (request, unrecognised, fallbackHref) =>
  warnOncePerRequest(
    request,
    'unrecognisedTrailLogged',
    {
      trail: unrecognised.slice(0, longestLoggedValue),
      fallback: fallbackHref
    },
    'Trail not recognised, trail dropped'
  )

const readLoggedTrail = (request, fallbackHref) => {
  const trail = readTrail(request)
  if (trail.unrecognised !== undefined) {
    logUnrecognisedTrail(request, trail.unrecognised, fallbackHref)
  }
  return trail
}

const withQueryParameter = (href, name, value) =>
  `${href}${href.includes('?') ? '&' : '?'}${name}=${encodeURIComponent(value)}`

/** The href with a `return` marker added to its query string. */
export const withReturnMarker = (href, slug) =>
  withQueryParameter(href, RETURN_PARAMETER, slug)

/**
 * Reads the `return` marker a request carries.
 *
 * @param {object} request - the request being answered.
 * @param {string[]} allowedSlugs - the page slugs the marker may name.
 * @returns {{ honouredSlug?: string }} `{ honouredSlug }` when the marker is
 * one of `allowedSlugs`, else `{}`. A marker that is not one of them is logged
 * once per request.
 */
export const readReturnMarker = (request, allowedSlugs) => {
  const marker = request.query?.[RETURN_PARAMETER]
  if (marker === undefined) {
    return {}
  }
  if (allowedSlugs.includes(marker)) {
    return { honouredSlug: marker }
  }
  warnOncePerRequest(
    request,
    'refusedReturnMarkerLogged',
    {
      received: String(marker).slice(0, longestLoggedValue)
    },
    'Return marker not recognised, marker dropped'
  )
  return {}
}

/**
 * The href carrying a trail.
 *
 * @param {string} href - the href to carry the trail.
 * @param {string[]} entries - the places of the trail, newest last.
 * @returns {string} the href with the trail in its query string, or the href
 * unchanged for an empty trail.
 */
export const withTrail = (href, entries) => {
  if (entries.length === 0) {
    return href
  }
  return withQueryParameter(
    href,
    TRAIL_PARAMETER,
    entries.join(TRAIL_SEPARATOR)
  )
}

/**
 * The trail a request carries.
 *
 * @param {object} request - the request being answered.
 * @returns {string[]} the places of the trail, newest last. Empty for no trail
 * or a trail naming a place the journey does not have, which is logged once
 * per request.
 */
export const requestTrail = (request) => readLoggedTrail(request).entries

/**
 * The trail a request carries plus one more place.
 *
 * @param {object} request - the request being answered.
 * @param {string} entry - a `TRAIL_START` place or the slug of a journey page.
 * @returns {string[]} the places of the trail, newest last. A trail past 40
 * places loses its oldest.
 */
export const trailPlus = (request, entry) =>
  [...requestTrail(request), entry].slice(-LONGEST_TRAIL)

/**
 * The href carrying the trail the request carries, unchanged.
 *
 * @param {object} request - the request being answered.
 * @param {string} href - the href to carry the trail.
 * @returns {string} the href with the trail in its query string.
 */
export const carryTrail = (request, href) =>
  withTrail(href, requestTrail(request))

/**
 * The href carrying the trail the request carries plus one more place.
 *
 * @param {object} request - the request being answered.
 * @param {string} href - the href to carry the trail.
 * @param {string} entry - a `TRAIL_START` place or the slug of a journey page.
 * @returns {string} the href with the extended trail in its query string.
 */
export const pushTrail = (request, href, entry) =>
  withTrail(href, trailPlus(request, entry))

const trailEntryHref = (entry, trailBeneath, journeyId) => {
  const startHrefs = {
    [TRAIL_START.overview]: () => hubPath(journeyId),
    [TRAIL_START.dashboard]: () => dashboardPath(),
    [TRAIL_START.ins]: () => journeyInsTypeQuestionUrl(journeyId)
  }
  return Object.hasOwn(startHrefs, entry)
    ? startHrefs[entry]()
    : withTrail(pagePath(journeyId, entry), trailBeneath)
}

/**
 * Where a page's Back link goes: the place the trader came from.
 *
 * @param {object} request - the request being answered.
 * @param {object} [options]
 * @param {string} [options.fallback] - where Back goes when the request names
 * no place the trader came from. Defaults to the overview.
 * @returns {string} the href of the newest place on the request's trail, carrying
 * the places beneath it, else the fallback. A trail naming a place the journey
 * does not have is ignored and logged once.
 */
export const trailBackLink = (request, { fallback } = {}) => {
  const { journeyId } = request.params
  const fallbackHref = fallback ?? hubPath(journeyId)
  const { entries } = readLoggedTrail(request, fallbackHref)
  const newest = entries.at(-1)
  return newest === undefined
    ? fallbackHref
    : trailEntryHref(newest, entries.slice(0, -1), journeyId)
}
