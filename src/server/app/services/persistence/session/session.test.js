import { beforeAll, describe, expect, it } from 'vitest'
import { session } from './stub.js'
import {
  addressHandshakeTokensCookie,
  configureSession,
  flowOnlyAnswersCookie,
  knownJourneysCookie,
  openingRunCookie
} from '../../../engine/persistence/session.js'
import { recordingH } from '../../../engine/test-support.js'
import {
  registerSetMount,
  withSetContext
} from '../../../shared/set-context.js'
import { SET_ID } from '../../../sets/live-animals/set.js'
import { SESSION_COOKIE_NAMES } from '../../../sets/live-animals/journeys/linear/config.js'

const DECLARATION_CONFIRMED = 'confirmed'

// The seam under test, configured the way the gateway configures it. Without
// this the accessors answer the shared defaults, and every assertion below
// would hold just as well if live-animals' names were wired to another set.
beforeAll(() => {
  configureSession(SET_ID, session, SESSION_COOKIE_NAMES)
})

const requestKnowing = (...journeyIds) => ({
  state: { [knownJourneysCookie()]: journeyIds }
})

describe('per-set cookie names', () => {
  it('Should answer live-animals’ own names, not the shared defaults', () => {
    expect(knownJourneysCookie()).toBe('liveAnimalsKnownJourneys')
    expect(openingRunCookie()).toBe('liveAnimalsOpeningRun')
    expect(flowOnlyAnswersCookie()).toBe('liveAnimalsFlowOnlyAnswers')
    expect(addressHandshakeTokensCookie()).toBe(
      'liveAnimalsAddressHandshakeTokens'
    )
  })
})

describe('#session.knownJourneyIds', () => {
  it('Should start with no known journeys', async () => {
    expect(await session.knownJourneyIds({ state: {} })).toEqual([])
  })

  it('Should append a newly known journey to the cookie list', async () => {
    const h = recordingH()
    await session.addKnownJourney(requestKnowing('journey-1'), h, 'journey-2')
    expect(h.cookies[knownJourneysCookie()]).toEqual(['journey-1', 'journey-2'])
  })

  it('Should not duplicate an already-known journey', async () => {
    const h = recordingH()
    await session.addKnownJourney(requestKnowing('journey-1'), h, 'journey-1')
    expect(knownJourneysCookie() in h.cookies).toBe(false)
  })

  it('Should read the known list back from the request cookie', async () => {
    expect(
      await session.knownJourneyIds(requestKnowing('journey-1', 'journey-2'))
    ).toEqual(['journey-1', 'journey-2'])
  })
})

describe('#session.openingRun', () => {
  it('Should round-trip phases without leaking them between journeys', async () => {
    const h = recordingH()
    const request = { state: {} }
    await session.setOpeningRun(h, 'journey-1', 'active', request)
    const stored = h.cookies[openingRunCookie()]
    expect(stored).toEqual({ 'journey-1': 'active' })
    expect(
      await session.openingRun(
        { state: { [openingRunCookie()]: stored } },
        'journey-1'
      )
    ).toBe('active')
    expect(
      await session.openingRun(
        { state: { [openingRunCookie()]: stored } },
        'journey-2'
      )
    ).toBeUndefined()
  })

  it('Should report no opening run for a fresh session', async () => {
    expect(await session.openingRun({ state: {} }, 'journey-1')).toBeUndefined()
  })

  it('Should preserve another journey phase while updating the current one', async () => {
    const h = recordingH()
    await session.setOpeningRun(h, 'journey-2', 'complete', {
      state: { [openingRunCookie()]: { 'journey-1': 'active' } }
    })
    expect(h.cookies[openingRunCookie()]).toEqual({
      'journey-1': 'active',
      'journey-2': 'complete'
    })
  })
})

describe('#session.flowOnlyAnswers', () => {
  it('Should round-trip values without leaking them between journeys', async () => {
    const h = recordingH()
    const request = { state: {} }

    await session.setFlowOnlyAnswers(
      h,
      'journey-1',
      { declaration: DECLARATION_CONFIRMED },
      request
    )

    const stored = h.cookies[flowOnlyAnswersCookie()]
    expect(
      await session.flowOnlyAnswers(
        { state: { [flowOnlyAnswersCookie()]: stored } },
        'journey-1'
      )
    ).toEqual({ declaration: DECLARATION_CONFIRMED })
    expect(
      await session.flowOnlyAnswers(
        { state: { [flowOnlyAnswersCookie()]: stored } },
        'journey-2'
      )
    ).toEqual({})
  })

  it('Should preserve another journey while updating the current one', async () => {
    const existing = {
      'journey-1': { declaration: '' }
    }
    const h = recordingH()

    await session.setFlowOnlyAnswers(
      h,
      'journey-2',
      { declaration: DECLARATION_CONFIRMED },
      { state: { [flowOnlyAnswersCookie()]: existing } }
    )

    expect(h.cookies[flowOnlyAnswersCookie()]).toEqual({
      ...existing,
      'journey-2': { declaration: DECLARATION_CONFIRMED }
    })
  })
})

// Mounted last on purpose: a second mount retires set-context.js's sole-set
// fallback, so every accessor above would have to enter a context explicitly
// from here on.
describe('per-set cookie names with two sets mounted', () => {
  const OTHER_SET = 'session-names-probe'
  const OTHER_NAMES = Object.freeze({
    knownJourneys: 'probeKnownJourneys',
    openingRun: 'probeOpeningRun',
    flowOnlyAnswers: 'probeFlowOnlyAnswers',
    addressHandshakeTokens: 'probeAddressHandshakeTokens'
  })

  it('Should answer each set its own names', () => {
    registerSetMount(OTHER_SET, `/${OTHER_SET}`)
    configureSession(OTHER_SET, session, OTHER_NAMES)

    expect(withSetContext(SET_ID, knownJourneysCookie)).toBe(
      SESSION_COOKIE_NAMES.knownJourneys
    )
    expect(withSetContext(OTHER_SET, knownJourneysCookie)).toBe(
      OTHER_NAMES.knownJourneys
    )
    expect(withSetContext(SET_ID, openingRunCookie)).toBe(
      SESSION_COOKIE_NAMES.openingRun
    )
    expect(withSetContext(OTHER_SET, openingRunCookie)).toBe(
      OTHER_NAMES.openingRun
    )
    expect(withSetContext(SET_ID, flowOnlyAnswersCookie)).toBe(
      SESSION_COOKIE_NAMES.flowOnlyAnswers
    )
    expect(withSetContext(OTHER_SET, flowOnlyAnswersCookie)).toBe(
      OTHER_NAMES.flowOnlyAnswers
    )
  })
})
