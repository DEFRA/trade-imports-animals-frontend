import Boom from '@hapi/boom'
import { BASE } from '../shared/paths.js'
import { session, SESSION_COOKIES } from './persistence/session.js'
import { AMEND, DRAFT, records, SUBMITTED } from './persistence/records.js'
import { buildActor } from '../../common/helpers/actor-helpers.js'
import { organisationIdOf } from '../../common/helpers/organisation-id.js'

export { SESSION_COOKIES } from './persistence/session.js'

const cookieOptions = Object.freeze({
  path: BASE || '/',
  ttl: null,
  encoding: 'none',
  isSecure: false,
  isHttpOnly: true,
  isSameSite: 'Lax',
  clearInvalid: true,
  strictHeader: true
})

export const registerJourneyCookie = (server) => {
  server.state(SESSION_COOKIES.knownJourneys, {
    ...cookieOptions,
    encoding: 'base64json'
  })
  server.state(SESSION_COOKIES.openingRun, {
    ...cookieOptions,
    encoding: 'base64json'
  })
  server.state(SESSION_COOKIES.flowOnlyAnswers, {
    ...cookieOptions,
    encoding: 'base64json'
  })
}

const JOURNEY_MEMO = Symbol('currentJourney')

const memoRead = (request) => request?.app?.[JOURNEY_MEMO]

const memoWrite = (request, journey) => {
  if (request?.app) {
    request.app[JOURNEY_MEMO] = journey
  }
}

export const startJourney = async (request, h) => {
  const journey = await records.create()
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
  const restored = await records.cancelAmend(journeyId)
  memoWrite(request, restored)
  return restored
}

export const copyJourney = async (request, h, journeyId, concurrencyToken) => {
  if (!(await isKnownJourney(request, journeyId))) {
    return undefined
  }
  const copied = await records.copy(journeyId, concurrencyToken)
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
