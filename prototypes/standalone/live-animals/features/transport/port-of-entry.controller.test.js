import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../../flow/section-status.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from '../../engine/read.js'
import { driveHandler, postHandlerOf } from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import * as ports from '../../services/ports/index.js'

import * as portOfEntry from './port-of-entry.controller.js'

const post = postHandlerOf(portOfEntry)

describe('POST port-of-entry — port membership', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should re-render an out-of-list port with an error and commit nothing', async () => {
    const result = await driveHandler(post, {
      payload: { portOfEntry: 'XX NOPE' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.portOfEntry).toBe('Select a valid option')
    expect(result.after).toEqual(result.before)
  })
})

describe('POST port-of-entry — means of transport on the merged page', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should re-render an out-of-list means with an error and commit nothing', async () => {
    const result = await driveHandler(post, {
      payload: { meansOfTransport: 'Hovercraft' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.meansOfTransport).toBe(
      'Select a valid option'
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should wipe the transited countries when the means changes off the overland set (scope-exit wipe survives the merge)', async () => {
    const result = await driveHandler(post, {
      seed: {
        meansOfTransport: 'ROAD_VEHICLE',
        transitedCountries: ['FR', 'BE']
      },
      payload: { meansOfTransport: 'AIRPLANE' }
    })
    expect(result.after.meansOfTransport).toBe('AIRPLANE')
    expect(result.after.transitedCountries).toBeUndefined()
  })

  it('Should keep the transited countries while the means stays overland', async () => {
    const result = await driveHandler(post, {
      seed: {
        meansOfTransport: 'ROAD_VEHICLE',
        transitedCountries: ['FR', 'BE']
      },
      payload: { meansOfTransport: 'RAILWAY' }
    })
    expect(result.after.transitedCountries).toEqual(['FR', 'BE'])
  })
})

describe('GET port-of-entry — server-rendered select data (no-JS path)', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should supply the placeholder and divider with empty values and name-plus-code option text', async () => {
    const get = portOfEntry.routes.find(
      (route) => route.method === 'GET'
    ).handler
    const result = await driveHandler(get)
    const items = result.view.context.portItems
    expect(items[0]).toEqual({ value: '', text: 'Select port of entry' })
    expect(items[1]).toEqual({ value: '', text: '──────────', disabled: true })
    expect(items).toContainEqual({
      value: 'GB ABD',
      text: 'Aberdeen Harbour (GB ABD)',
      selected: false
    })
  })
})

describe('POST port-of-entry — port membership follows the primed list', () => {
  const originalMode = process.env.LIVE_ANIMALS_MODE

  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  afterAll(() => {
    vi.unstubAllGlobals()
    if (originalMode === undefined) delete process.env.LIVE_ANIMALS_MODE
    else process.env.LIVE_ANIMALS_MODE = originalMode
  })

  it('Should validate against the list as primed at POST time, not as imported', async () => {
    process.env.LIVE_ANIMALS_MODE = 'real'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => [{ code: 'ZZ 001', name: 'Zedport' }]
      }))
    )
    await ports.prime()

    const accepted = await driveHandler(post, {
      payload: { portOfEntry: 'ZZ 001' }
    })
    expect(accepted.view).toBeUndefined()
    expect(accepted.after.portOfEntry).toBe('ZZ 001')

    const rejected = await driveHandler(post, {
      payload: { portOfEntry: 'GB ABD' }
    })
    expect(rejected.view.context.errors.portOfEntry).toBe(
      'Select a valid option'
    )
  })
})
