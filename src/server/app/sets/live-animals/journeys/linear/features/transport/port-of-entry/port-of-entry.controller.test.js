import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  postHandlerOf
} from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'
import * as ports from '../../../../../../../services/ports/index.js'
import {
  addUtcDays,
  formatDateText
} from '../../../../../../../lib/validate/calendar.js'

import { copy } from '../copy/copy.en.js'
import { arrivalWindow } from './arrival-window.js'
import * as portOfEntry from './port-of-entry.controller.js'

const post = postHandlerOf(portOfEntry)
const get = portOfEntry.routes.find((route) => route.method === 'GET').handler

const oneOfError = 'Select a valid option'

describe('POST port-of-entry — port membership', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should re-render an out-of-list port with an error and commit nothing', async () => {
    const result = await driveHandler(post, {
      payload: { portOfEntry: 'XX NOPE' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.portOfEntry).toBe(oneOfError)
    expect(result.after).toEqual(result.before)
  })
})

describe('POST port-of-entry — means of transport on the merged page', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should re-render an out-of-list means with an error and commit nothing', async () => {
    const result = await driveHandler(post, {
      payload: { meansOfTransport: 'Hovercraft' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.meansOfTransport).toBe(oneOfError)
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
  })
  beforeEach(() => store.clear())

  it('Should supply the placeholder and divider with empty values and name-plus-code option text', async () => {
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

describe('port-of-entry — the arrival-date window', () => {
  const now = new Date('2026-08-12T09:00:00Z')
  const dateWindow = arrivalWindow(now)
  const outOfRangeError = copy.portOfEntry.errors.arrivalDateOutOfRange(
    dateWindow.minText,
    dateWindow.maxText
  )
  const dayOutside = (bound, days) =>
    formatDateText(addUtcDays(dateWindow[bound], days))

  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now)
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())
  afterAll(() => vi.useRealTimers())

  it('Should hand the picker the window bounds so the calendar cannot offer a date outside it', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.arrivalDate.minDate).toBe(dateWindow.minText)
    expect(result.view.context.arrivalDate.maxDate).toBe(dateWindow.maxText)
  })

  it.each([
    ['a day before the earliest allowed date', dayOutside('min', -1)],
    ['a day after the latest allowed date', dayOutside('max', 1)]
  ])('Should reject %s and commit nothing', async (_label, value) => {
    const result = await driveHandler(post, {
      payload: { arrivalDateAtPort: value }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.arrivalDateAtPort).toBe(outOfRangeError)
    expect(result.after).toEqual(result.before)
    // The re-rendered picker keeps its bounds, so the calendar a user is sent
    // back to still refuses what the server just refused.
    expect(result.view.context.arrivalDate.minDate).toBe(dateWindow.minText)
    expect(result.view.context.arrivalDate.maxDate).toBe(dateWindow.maxText)
  })

  it.each([
    ['the earliest allowed date', 'min'],
    ['the latest allowed date', 'max']
  ])('Should accept and commit %s', async (_label, bound) => {
    const result = await driveHandler(post, {
      payload: { arrivalDateAtPort: formatDateText(dateWindow[bound]) }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.arrivalDateAtPort).toEqual({
      day: String(dateWindow[bound].getUTCDate()),
      month: String(dateWindow[bound].getUTCMonth() + 1),
      year: String(dateWindow[bound].getUTCFullYear())
    })
  })

  it('Should keep the real-date message for a calendar-impossible date', async () => {
    const result = await driveHandler(post, {
      payload: { arrivalDateAtPort: '31/2/2026' }
    })

    expect(result.view.context.errors.arrivalDateAtPort).toBe(
      copy.portOfEntry.errors.arrivalDateInvalid
    )
  })

  it('Should leave a blank arrival date optional', async () => {
    const result = await driveHandler(post, {
      payload: { arrivalDateAtPort: '' }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.arrivalDateAtPort).toEqual({
      day: '',
      month: '',
      year: ''
    })
  })
})

describe('POST port-of-entry — port membership follows the primed list', () => {
  const originalMode = process.env.LIVE_ANIMALS_MODE

  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  afterAll(() => {
    vi.unstubAllGlobals()
    if (originalMode === undefined) {
      delete process.env.LIVE_ANIMALS_MODE
    } else {
      process.env.LIVE_ANIMALS_MODE = originalMode
    }
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
    expect(rejected.view.context.errors.portOfEntry).toBe(oneOfError)
  })
})
