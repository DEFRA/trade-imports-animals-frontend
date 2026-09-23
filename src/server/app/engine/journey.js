import Boom from '@hapi/boom'
import {
  addressHandshakeTokensCookie,
  flowOnlyAnswersCookie,
  knownJourneysCookie,
  openingRunCookie,
  session,
  sessionConfiguredFor
} from './persistence/session.js'
import { currentSetId } from '../shared/set-context.js'
import { AMEND, DRAFT, records, SUBMITTED } from './persistence/records.js'
import { buildActor } from '../../common/helpers/actor-helpers.js'
import { organisationIdOf } from '../../common/helpers/organisation-id.js'

export {
  addressHandshakeTokensCookie,
  flowOnlyAnswersCookie,
  knownJourneysCookie,
  openingRunCookie
} from './persistence/session.js'

/**
 * Registers the journey cookies a set reads in STUB mode, scoped to that set's
 * own mount: stub mode keeps each value in a native cookie of its own, so a
 * draft started in one set is invisible to another set's dashboard. Moving
 * these off `/` invalidates existing browser sessions, which is the intended
 * one-off cost of splitting the namespace.
 *
 * The `path` scoping applies to those per-name cookies only. In REAL mode the
 * same values are keys inside the single @hapi/yar session cookie, which is
 * registered server-wide at path `/`; isolation there comes from each set's
 * cookie NAMES being distinct, not from the path. See
 * services/persistence/session/real.js.
 *
 * The names come from the configured session seam rather than from a second
 * argument, so the registered cookies and the ones the session reads cannot
 * drift apart. Call it inside the set's context, after `configureSession` —
 * called before it, the seam hands back the shared default names and the set
 * registers cookies it will never read, so this refuses at its own point of
 * use. `set-completeness.js` still compares the registered names against the
 * configured ones at the end of registration, which is the only thing that
 * catches a gateway that skipped this call altogether.
 */
export const registerJourneyCookie = (server, { base }) => {
  const setId = currentSetId()
  if (!sessionConfiguredFor(setId)) {
    throw new Error(
      `Session not configured for set "${setId}" — call configureSession before registerJourneyCookie`
    )
  }

  const cookieOptions = Object.freeze({
    path: base,
    ttl: null,
    encoding: 'base64json',
    isSecure: false,
    isHttpOnly: true,
    isSameSite: 'Lax',
    clearInvalid: true,
    strictHeader: true
  })

  for (const name of [
    knownJourneysCookie(),
    openingRunCookie(),
    flowOnlyAnswersCookie(),
    addressHandshakeTokensCookie()
  ]) {
    server.state(name, cookieOptions)
  }
}

const JOURNEY_MEMO = Symbol('currentJourney')

const memoRead = (request) => request?.app?.[JOURNEY_MEMO]

const memoWrite = (request, journey) => {
  if (request?.app) {
    request.app[JOURNEY_MEMO] = journey
  }
}

export const startJourney = async (request, h) => {
  const actor = buildActor(request.auth?.credentials)
  const journey = await records.create(actor)
  await session.addKnownJourney(request, h, journey.journeyId)
  memoWrite(request, journey)
  return journey
}

export const currentJourney = async (request, h) => {
  const cached = memoRead(request)
  if (cached) {
    return structuredClone(cached)
  }
  const journeyId = request.params?.journeyId
  if (!journeyId) {
    throw Boom.notFound()
  }
  const loaded = await records.load({ journeyId })
  if (!loaded) {
    throw Boom.notFound()
  }
  if (!(await isKnownJourney(request, journeyId))) {
    await session.addKnownJourney(request, h, journeyId)
  }
  memoWrite(request, loaded)
  return structuredClone(loaded)
}

export const replaceJourneyFulfilment = async (
  request,
  journeyId,
  fulfilment
) => {
  const cached = memoRead(request)
  const memoKnown = cached?.journeyId === journeyId ? cached : undefined
  const payloadToken = request?.payload?.concurrencyToken
  const known =
    memoKnown ??
    (payloadToken != null
      ? { journeyId, concurrencyToken: Number(payloadToken) }
      : undefined)
  const actor = buildActor(request.auth?.credentials)
  const saved = await records.replaceFulfilment(journeyId, fulfilment, {
    known,
    actor
  })
  // The backend mints a new concurrencyToken on every save, so get the latest
  const next = { ...saved, fulfilment: structuredClone(fulfilment) }
  memoWrite(request, next)
  return next
}

export const listKnownJourneys = async (
  request,
  { page, sort, referenceNumber } = {}
) => {
  const journeyIds = await session.knownJourneyIds(request)
  // Each row's referenced parties are resolved against the address book while
  // the list is marshalled. The book scopes on the organisation and has no
  // authentication of its own, so the read carries the reader's session
  // organisation with it.
  const organisationId = organisationIdOf(request)

  // Not the unauthenticated case: `session` is the default strategy, so a
  // signed-out request is redirected before it reaches this handler. This is
  // reached when AUTH_ENABLED=false leaves the auth plugin unregistered, or
  // when a signed-in session carries no organisation. Either way there is no
  // book to resolve names against, so answer empty rather than start a read
  // that cannot finish.
  if (!organisationId) {
    return { rows: [], page: 1, size: 0, totalElements: 0, totalPages: 0 }
  }

  return records.list({
    journeyIds,
    page,
    sort,
    referenceNumber,
    organisationId
  })
}

export const isKnownJourney = async (request, journeyId) =>
  (await session.knownJourneyIds(request)).includes(journeyId)

const editableFromStatus = async (journey, journeyId, actor) => {
  if (journey.status === SUBMITTED) {
    return records.amend(journeyId, actor)
  }
  if (journey.status === DRAFT || journey.status === AMEND) {
    return journey
  }
  return undefined
}

export const amendJourney = async (request, _h, journeyId) => {
  if (!(await isKnownJourney(request, journeyId))) {
    return undefined
  }
  const journey = await records.load({ journeyId })
  if (!journey) {
    return undefined
  }
  const actor = buildActor(request.auth.credentials)
  const editable = await editableFromStatus(journey, journeyId, actor)
  if (!editable) {
    return undefined
  }
  memoWrite(request, editable)
  return editable
}

export const cancelAmendJourney = async (request, _h, journeyId) => {
  if (!(await isKnownJourney(request, journeyId))) {
    return undefined
  }
  const actor = buildActor(request.auth.credentials)
  const restored = await records.cancelAmend(journeyId, actor)
  memoWrite(request, restored)
  return restored
}

export const copyJourney = async (request, h, journeyId, concurrencyToken) => {
  if (!(await isKnownJourney(request, journeyId))) {
    return undefined
  }
  const actor = buildActor(request.auth.credentials)
  const copied = await records.copy(journeyId, concurrencyToken, actor)
  await session.addKnownJourney(request, h, copied.journeyId)
  memoWrite(request, copied)
  return copied
}

export const softDeleteJourney = async (request, _h, journeyId) => {
  if (!(await isKnownJourney(request, journeyId))) {
    return undefined
  }
  const actor = buildActor(request.auth.credentials)
  return records.softDelete(journeyId, actor)
}
